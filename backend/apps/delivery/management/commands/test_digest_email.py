import sys
import pytz
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.digest.models import Digest
from apps.digest.tasks import build_digest
from apps.delivery.services import DeliveryService

User = get_user_model()


class Command(BaseCommand):
    help = 'Render current items to email instantly and deliver to specified email (dev tool).'

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Target recipient email address')
        parser.add_argument(
            '--force-rebuild',
            action='store_true',
            help='Force rebuilding the digest even if one already exists for today'
        )

    def handle(self, *args, **options):
        target_email = options['email'].strip()
        force_rebuild = options.get('force_rebuild', False)

        self.stdout.write(self.style.NOTICE(f"Preparing digest email for '{target_email}'..."))

        # Find user or default to first user matching or superuser
        user = User.objects.filter(email__iexact=target_email).first()
        if not user:
            user = User.objects.first()
            if not user:
                raise CommandError("No registered users exist in the system. Create a user first.")
            self.stdout.write(
                self.style.WARNING(
                    f"User with email '{target_email}' not found. Using '{user.email}' as source profile."
                )
            )

        # Determine user's local date
        tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata') if hasattr(user, 'profile') else 'Asia/Kolkata'
        try:
            user_tz = pytz.timezone(tz_name)
        except Exception:
            user_tz = pytz.timezone('Asia/Kolkata')

        digest_date = timezone.now().astimezone(user_tz).date()

        # Find or build digest
        digest = Digest.objects.filter(user=user, digest_date=digest_date).first()
        if not digest or force_rebuild or digest.items.count() == 0:
            self.stdout.write(self.style.NOTICE(f"Building fresh digest for {digest_date}..."))
            build_res = build_digest(user.id, digest_date.isoformat())
            if build_res.get('status') == 'error':
                raise CommandError(f"Failed to build digest: {build_res.get('message')}")
            digest = Digest.objects.get(user=user, digest_date=digest_date)

        self.stdout.write(
            self.style.SUCCESS(
                f"Digest #{digest.id} loaded ({digest.item_count} items across {digest.items.count()} records)."
            )
        )

        # Dispatch via DeliveryService
        success, message_or_err = DeliveryService.send_digest_email(digest, recipient_email=target_email)

        if success:
            digest.status = Digest.Status.DELIVERED
            digest.delivered_at = timezone.now()
            digest.save(update_fields=['status', 'delivered_at', 'updated_at'])
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSUCCESS: Email dispatched to {target_email}! (Message ID: {message_or_err})\n"
                    f"Digest marked as delivered at {digest.delivered_at.strftime('%Y-%m-%d %H:%M:%S')}."
                )
            )
        else:
            self.stderr.write(self.style.ERROR(f"\nFAILED to deliver email: {message_or_err}"))
            sys.exit(1)
