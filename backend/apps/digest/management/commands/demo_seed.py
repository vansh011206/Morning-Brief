import hashlib
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import UserProfile
from apps.connections.models import Connection
from apps.ingestor.models import RawItem
from apps.digest.tasks import build_digest
from apps.digest.models import Digest

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds a demo user with rich sample notifications (recruiter email, GitHub PR, tech news) and builds an instant digest."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding demo user and sample notifications..."))

        # 1. Create or retrieve demo user
        demo_email = "demo@morningbrief.dev"
        demo_user, created = User.objects.get_or_create(
            email=demo_email,
            defaults={
                'username': 'demouser',
                'first_name': 'Alex',
                'last_name': 'Rivera',
            }
        )
        demo_user.set_password("DemoPassword123!")
        demo_user.save()

        # Configure user profile with job_hunt_mode enabled
        profile, _ = UserProfile.objects.get_or_create(user=demo_user)
        profile.timezone = "Asia/Kolkata"
        profile.digest_time = "07:00"
        profile.delivery_channel = "email"
        profile.job_hunt_mode = True
        profile.digest_enabled = True
        profile.save()

        # 2. Ensure connections exist
        gmail_conn, _ = Connection.objects.get_or_create(
            user=demo_user,
            provider=Connection.Provider.GMAIL,
            external_account=demo_email,
            defaults={'display_name': 'Google Gmail (demo@morningbrief.dev)', 'status': Connection.Status.ACTIVE}
        )

        github_conn, _ = Connection.objects.get_or_create(
            user=demo_user,
            provider=Connection.Provider.GITHUB,
            external_account="github:demouser",
            defaults={'display_name': 'GitHub Notifications', 'status': Connection.Status.ACTIVE}
        )

        news_conn, _ = Connection.objects.get_or_create(
            user=demo_user,
            provider=Connection.Provider.RSS,
            external_account="https://news.ycombinator.com/rss",
            defaults={'display_name': 'Hacker News', 'status': Connection.Status.ACTIVE}
        )

        # 3. Create rich sample RawItems
        now = timezone.now()
        samples = [
            {
                'conn': gmail_conn,
                'ext_id': 'demo_msg_recruiter_01',
                'type': RawItem.ItemType.EMAIL,
                'title': 'Interview Invitation: Senior Full-Stack Engineer at Stripe',
                'body': 'Hi Alex, our talent acquisition team reviewed your GitHub repositories and we would love to schedule a 45-minute technical interview for our Core Infrastructure team.',
                'author': 'Rachel Greene <recruiting@stripe.com>',
                'url': 'https://mail.google.com',
                'time': now - timedelta(minutes=45),
            },
            {
                'conn': github_conn,
                'ext_id': 'demo_pr_142',
                'type': RawItem.ItemType.PR,
                'title': 'PR #142: Fix race condition in WebSocket connection pooling',
                'body': 'Critical fix for concurrent session termination. Needs review and approval from @alextester before staging deployment.',
                'author': 'octocat',
                'url': 'https://github.com/morningbrief/backend/pull/142',
                'time': now - timedelta(hours=1, minutes=15),
            },
            {
                'conn': news_conn,
                'ext_id': 'demo_news_01',
                'type': RawItem.ItemType.NEWS,
                'title': 'Next-gen reasoning models achieve 5x inference speedup',
                'body': 'New architectural breakthroughs in sparse attention enable 5x speedups on complex reasoning benchmarks while reducing memory footprint.',
                'author': 'Ars Technica',
                'url': 'https://arstechnica.com/ai-breakthrough',
                'time': now - timedelta(hours=2),
            },
            {
                'conn': news_conn,
                'ext_id': 'demo_money_01',
                'type': RawItem.ItemType.NEWS,
                'title': 'Sensex and Nasdaq surge to record highs on semiconductor earnings beat',
                'body': 'Global markets rallied today as quarterly earnings across tech and semiconductor sectors topped analyst estimates by 14 percent.',
                'author': 'Bloomberg',
                'url': 'https://bloomberg.com/markets',
                'time': now - timedelta(hours=3),
            },
            {
                'conn': gmail_conn,
                'ext_id': 'demo_event_01',
                'type': RawItem.ItemType.EVENT,
                'title': 'Calendar: Q3 Architecture Review & Sprint Planning',
                'body': 'Scheduled for 11:00 AM - 12:00 PM on Google Meet. Please review the RFC documentation beforehand.',
                'author': 'Engineering Team Calendar',
                'url': 'https://calendar.google.com',
                'time': now - timedelta(hours=4),
            },
        ]

        created_count = 0
        for s in samples:
            h = hashlib.sha256(f"demo:{demo_user.id}:{s['ext_id']}".encode('utf-8')).hexdigest()
            raw, was_created = RawItem.objects.update_or_create(
                dedup_hash=h,
                defaults={
                    'user': demo_user,
                    'connection': s['conn'],
                    'external_id': s['ext_id'],
                    'type': s['type'],
                    'title': s['title'],
                    'body_snippet': s['body'],
                    'author': s['author'],
                    'source_url': s['url'],
                    'received_at': s['time'],
                    'is_spam': False,
                }
            )
            if was_created:
                created_count += 1

        self.stdout.write(f"Created {created_count} sample raw items.")

        # 4. Instant Digest Compilation
        self.stdout.write("Compiling instant briefing via build_digest...")
        result = build_digest(demo_user.id)

        digest = Digest.objects.filter(user=demo_user).order_by('-digest_date').first()
        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded demo environment!\n"
            f"  User: {demo_email}\n"
            f"  Password: DemoPassword123!\n"
            f"  Digest ID: #{digest.id} ({digest.status})\n"
            f"  Items compiled: {digest.item_count} ({digest.important_count} important)\n"
            f"  LLM Cost: {digest.llm_cost_cents} cents\n"
            f"Login at frontend and explore today's briefing!"
        ))
