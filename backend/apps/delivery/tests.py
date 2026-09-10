import io
import re
from datetime import date
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.utils import timezone
from rest_framework.test import APIClient
from apps.digest.models import Digest, DigestItem
from apps.delivery.models import DeliveryLog
from apps.delivery.services import DeliveryService
from apps.delivery.tasks import deliver_digest, dispatch_scheduled_digests

User = get_user_model()


def contains_emoji(text: str) -> bool:
    """Checks if text contains unicode emoji characters."""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"  # Supplemental symbols
        "\U0001FA70-\U0001FAFF"
        "]+",
        flags=re.UNICODE,
    )
    return bool(emoji_pattern.search(text))


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class DeliveryTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='delivery_test_user',
            email='delivery_user@example.com',
            password='TestPassword123!',
            first_name='Alex'
        )
        if hasattr(self.user, 'profile'):
            self.user.profile.timezone = 'Asia/Kolkata'
            self.user.profile.digest_time = '07:00'
            self.user.profile.delivery_channel = 'email'
            self.user.profile.digest_enabled = True
            self.user.profile.save()

        self.digest = Digest.objects.create(
            user=self.user,
            digest_date=date(2026, 9, 10),
            status=Digest.Status.READY,
            item_count=3,
            important_count=1,
        )

        DigestItem.objects.create(
            digest=self.digest,
            section=DigestItem.Section.NEWS,
            rank=1,
            source_title='Quantum Computing Breakthrough Announced',
            summary='Researchers demonstrate stable 10,000 qubit coherence.',
            priority=DigestItem.Priority.NORMAL,
        )
        DigestItem.objects.create(
            digest=self.digest,
            section=DigestItem.Section.ACTIONS,
            rank=2,
            source_title='PR #42: Security patch ready for review',
            summary='Fixes critical session invalidation vulnerability.',
            priority=DigestItem.Priority.URGENT,
        )
        DigestItem.objects.create(
            digest=self.digest,
            section=DigestItem.Section.MONEY,
            rank=3,
            source_title='Quarterly Earnings Beat Expectations',
            summary='Net revenue increased 18 percent year over year.',
            priority=DigestItem.Priority.HIGH,
        )

    def test_email_template_rendering_and_zero_emojis(self):
        """Verify HTML and plain-text templates render with design tokens and zero emojis."""
        context = DeliveryService.prepare_email_context(self.digest)
        from django.template.loader import render_to_string

        html = render_to_string('emails/digest_email.html', context)
        text = render_to_string('emails/digest_email.txt', context)

        # 600px table layout and explicit dark mode background
        self.assertIn('width="600"', html)
        self.assertIn('background-color: #FAFAF9', html)
        self.assertIn('MorningBrief', html)

        # Section left borders
        self.assertIn('#4F46E5', html)  # News indigo
        self.assertIn('#F59E0B', html)  # Actions amber
        self.assertIn('#10B981', html)  # Money emerald

        # Titles and items present
        self.assertIn('Quantum Computing Breakthrough Announced', html)
        self.assertIn('PR #42: Security patch ready for review', html)
        self.assertIn('/settings', html)
        self.assertIn('unsubscribe', html)

        # Plain text
        self.assertIn('MORNINGBRIEF - DAILY DIGEST', text)
        self.assertIn('Quantum Computing Breakthrough', text)

        # STRICT ZERO EMOJIS
        self.assertFalse(contains_emoji(html), "HTML email contains forbidden emoji characters")
        self.assertFalse(contains_emoji(text), "Text email contains forbidden emoji characters")

    def test_delivery_service_send(self):
        """Test DeliveryService dispatches email and creates DeliveryLog."""
        success, msg_id = DeliveryService.send_digest_email(self.digest)
        self.assertTrue(success)

        log = DeliveryLog.objects.filter(digest=self.digest).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status, DeliveryLog.Status.SENT)
        self.assertEqual(log.recipient, 'delivery_user@example.com')
        self.assertEqual(log.channel, DeliveryLog.Channel.EMAIL)

    def test_deliver_digest_task(self):
        """Test deliver_digest Celery task updates digest status and timestamp."""
        res = deliver_digest(self.digest.id)
        self.assertEqual(res['status'], 'delivered')

        self.digest.refresh_from_db()
        self.assertEqual(self.digest.status, Digest.Status.DELIVERED)
        self.assertIsNotNone(self.digest.delivered_at)

    def test_deliver_digest_task_dict_arg(self):
        """Test deliver_digest works when invoked from a Celery chain with result dict."""
        self.digest.status = Digest.Status.READY
        self.digest.delivered_at = None
        self.digest.save()

        res = deliver_digest({'status': 'ready', 'digest_id': self.digest.id})
        self.assertEqual(res['status'], 'delivered')

        self.digest.refresh_from_db()
        self.assertEqual(self.digest.status, Digest.Status.DELIVERED)

    def test_management_command_test_digest_email(self):
        """Test test_digest_email management command."""
        out = io.StringIO()
        call_command('test_digest_email', 'delivery_user@example.com', stdout=out)
        output = out.getvalue()
        self.assertIn("SUCCESS: Email dispatched", output)

    def test_delivery_test_brief_api_view(self):
        """Test POST /api/v1/delivery/test-brief/ endpoint."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        res = client.post('/api/v1/delivery/test-brief/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'sent')
        self.assertEqual(res.data['recipient'], 'delivery_user@example.com')

    def test_digest_list_pagination(self):
        """Test GET /api/v1/digests/?page= endpoint returns paginated response."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        res = client.get('/api/v1/digests/?page=1')
        self.assertEqual(res.status_code, 200)
        self.assertIn('results', res.data)
        self.assertIn('count', res.data)
        self.assertGreaterEqual(res.data['count'], 1)

    def test_generate_now_with_deliver_query_param(self):
        """Test POST /api/v1/digests/generate-now/?deliver=1 delivers immediately."""
        client = APIClient()
        client.force_authenticate(user=self.user)

        res = client.post('/api/v1/digests/generate-now/?deliver=1')
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data['status'], 'delivered')
        self.assertIsNotNone(res.data['delivered_at'])
