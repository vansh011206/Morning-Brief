import logging
import pytz
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone
from apps.digest.models import Digest, DigestItem
from .models import DeliveryLog

logger = logging.getLogger(__name__)

SECTION_CONFIG = {
    DigestItem.Section.NEWS: {
        'title': 'Technology & World News',
        'accent_color': '#4F46E5',  # Indigo
    },
    DigestItem.Section.ACTIONS: {
        'title': 'Pending Actions & PRs',
        'accent_color': '#F59E0B',  # Amber
    },
    DigestItem.Section.EMAILS: {
        'title': 'Priority Correspondence',
        'accent_color': '#0284C7',  # Sky/Indigo
    },
    DigestItem.Section.MONEY: {
        'title': 'Financial & Market Updates',
        'accent_color': '#10B981',  # Emerald
    },
    DigestItem.Section.EVENTS: {
        'title': 'Calendar & Scheduled Events',
        'accent_color': '#9333EA',  # Purple
    },
}


class DeliveryService:
    """
    Unified delivery service for morning briefing emails and notifications.
    Supports console backend in development and Resend API / SMTP in production.
    """

    @classmethod
    def prepare_email_context(cls, digest: Digest) -> dict:
        user = digest.user
        tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata') if hasattr(user, 'profile') else 'Asia/Kolkata'
        try:
            user_tz = pytz.timezone(tz_name)
        except Exception:
            user_tz = pytz.timezone('Asia/Kolkata')
            tz_name = 'Asia/Kolkata'

        local_dt = timezone.now().astimezone(user_tz)
        formatted_date = local_dt.strftime('%A, %b %d, %Y')
        hour = local_dt.hour
        greeting = 'Good morning' if hour < 12 else ('Good afternoon' if hour < 18 else 'Good evening')

        user_first_name = (
            user.first_name
            or (getattr(user, 'name', '').split()[0] if getattr(user, 'name', '') else '')
            or 'there'
        )

        all_items = digest.items.select_related('raw_item__connection').order_by('rank', 'id')
        sections_data = []

        for section_key, config in SECTION_CONFIG.items():
            matching_items = [
                {
                    'source_title': item.source_title,
                    'summary': item.summary,
                    'priority': item.priority,
                    'source_name': (
                        item.raw_item.connection.display_name
                        if item.raw_item and item.raw_item.connection
                        else 'Feed Source'
                    ),
                    'author': item.raw_item.author if item.raw_item else '',
                    'source_url': item.raw_item.source_url if item.raw_item else '',
                    'rank': item.rank,
                }
                for item in all_items
                if item.section == section_key
            ]
            if matching_items:
                sections_data.append({
                    'key': section_key,
                    'title': config['title'],
                    'accent_color': config['accent_color'],
                    'items': matching_items,
                })

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')
        unsubscribe_url = f"{frontend_url}/settings?action=unsubscribe"

        return {
            'user': user,
            'user_first_name': user_first_name,
            'greeting': greeting,
            'formatted_date': formatted_date,
            'timezone_name': tz_name,
            'digest': digest,
            'sections': sections_data,
            'frontend_url': frontend_url,
            'unsubscribe_url': unsubscribe_url,
        }

    @classmethod
    def send_digest_email(cls, digest: Digest, recipient_email: str = None) -> tuple[bool, str]:
        recipient = recipient_email or digest.user.email
        if not recipient:
            err = "Recipient email address is missing"
            DeliveryLog.objects.create(
                digest=digest,
                channel=DeliveryLog.Channel.EMAIL,
                status=DeliveryLog.Status.FAILED,
                recipient='',
                error_message=err,
            )
            return False, err

        context = cls.prepare_email_context(digest)
        subject = f"Your Morning Brief - {context['formatted_date']}"

        html_content = render_to_string('emails/digest_email.html', context)
        text_content = render_to_string('emails/digest_email.txt', context)

        message_id = ''
        resend_api_key = getattr(settings, 'RESEND_API_KEY', '')

        # Use Resend API if key is set and not explicitly configured for console backend
        use_resend = bool(
            resend_api_key
            and getattr(settings, 'EMAIL_BACKEND', '') != 'django.core.mail.backends.console.EmailBackend'
        )

        try:
            if use_resend:
                import resend
                resend.api_key = resend_api_key
                params = {
                    "from": settings.DEFAULT_FROM_EMAIL,
                    "to": [recipient],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                }
                email_resp = resend.Emails.send(params)
                message_id = email_resp.get('id', '') if isinstance(email_resp, dict) else str(email_resp)
                logger.info(f"[DeliveryService] Sent email via Resend to {recipient} (id: {message_id})")
            else:
                msg = EmailMultiAlternatives(
                    subject=subject,
                    body=text_content,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    to=[recipient],
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                message_id = f"django-{timezone.now().timestamp()}"
                logger.info(f"[DeliveryService] Sent email via {settings.EMAIL_BACKEND} to {recipient}")

            DeliveryLog.objects.create(
                digest=digest,
                channel=DeliveryLog.Channel.EMAIL,
                status=DeliveryLog.Status.SENT,
                recipient=recipient,
                external_message_id=message_id,
                sent_at=timezone.now(),
            )
            return True, message_id

        except Exception as e:
            logger.exception(f"[DeliveryService] Failed to send email to {recipient}: {e}")
            DeliveryLog.objects.create(
                digest=digest,
                channel=DeliveryLog.Channel.EMAIL,
                status=DeliveryLog.Status.FAILED,
                recipient=recipient,
                error_message=str(e),
            )
            return False, str(e)
