import re
import pytest
from unittest.mock import patch, MagicMock
from django.template.loader import render_to_string
from apps.digest.models import DigestItem
from apps.delivery.services import DeliveryService
from apps.connections.telegram_service import TelegramService
from apps.delivery.tasks import deliver_digest
from tests.factories import UserFactory, DigestFactory, DigestItemFactory, RawItemFactory


def contains_emoji(text: str) -> bool:
    """Regex check for Unicode emojis."""
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"
        "\U0001F300-\U0001F5FF"
        "\U0001F680-\U0001F6FF"
        "\U0001F1E0-\U0001F1FF"
        "\U00002702-\U000027B0"
        "\U000024C2-\U0001F251"
        "\U0001F900-\U0001F9FF"
        "\U0001FA70-\U0001FAFF"
        "]+",
        flags=re.UNICODE,
    )
    return bool(emoji_pattern.search(text))


@pytest.mark.django_db
class TestDelivery:
    def test_email_template_render_and_plain_fallback(self):
        """Email templates render HTML and plain-text fallback with design system tokens and ZERO emojis."""
        user = UserFactory.create(first_name='Alex')
        digest = DigestFactory.create(user=user)
        DigestItemFactory.create(
            digest=digest,
            section=DigestItem.Section.NEWS,
            source_title='Quantum Computing Breakthrough',
            summary='Scientists achieve 10,000 qubit coherence.',
        )

        context = DeliveryService.prepare_email_context(digest)
        html = render_to_string('emails/digest_email.html', context)
        text = render_to_string('emails/digest_email.txt', context)

        assert 'Quantum Computing Breakthrough' in html
        assert 'Quantum Computing Breakthrough' in text
        assert 'width="600"' in html
        assert 'MorningBrief' in html

        # Strict Zero Emojis check
        assert not contains_emoji(html), "HTML email contains forbidden emojis"
        assert not contains_emoji(text), "Plain text email contains forbidden emojis"

    def test_telegram_message_truncation(self):
        """Telegram message formatting truncates cleanly at <= 4096 chars when content is huge."""
        user = UserFactory.create()
        digest = DigestFactory.create(user=user)

        # Create 30 items with long summaries reusing a single raw_item
        raw_item = RawItemFactory.create(user=user)
        for i in range(30):
            DigestItemFactory.create(
                digest=digest,
                raw_item=raw_item,
                section=DigestItem.Section.NEWS,
                rank=i + 1,
                source_title=f"Detailed Global Intelligence Report #{i} with Long Technical Analysis",
                summary="A" * 200,
            )

        text, reply_markup = TelegramService.format_digest_html(digest)
        # Telegram hard limit is 4096
        assert len(text) <= 4096
        assert "Brief truncated" in text
        assert "View Full Brief on Web" in text or "Open MorningBrief Web" in text

    @patch('apps.delivery.services.DeliveryService.send_digest_email')
    def test_retry_backoff_on_send_failure(self, mock_send_email):
        """deliver_digest task retries with exponential backoff when email dispatch fails."""
        mock_send_email.return_value = (False, "SMTP 554 Transaction Failed")

        user = UserFactory.create()
        digest = DigestFactory.create(user=user)

        # Mock celery retry using push_request
        deliver_digest.push_request(retries=1)
        try:
            with patch.object(deliver_digest, 'retry') as mock_retry:
                mock_retry.side_effect = Exception("CeleryRetryTriggered")

                with pytest.raises(Exception, match="CeleryRetryTriggered"):
                    deliver_digest(digest.id)

                # Ensure retry was called with exponential backoff: 60 * 2^1 = 120s
                mock_retry.assert_called_once()
                _, kwargs = mock_retry.call_args
                assert kwargs.get('countdown') == 120
        finally:
            deliver_digest.pop_request()

    def test_cron_dispatch_keepalive_unkeyed(self, api_client):
        """Unkeyed GET/POST to cron-dispatch returns 200 OK to keep Render awake without executing tasks."""
        url = '/api/v1/delivery/cron-dispatch/'
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data.get('status') == 'awake'
        assert response.data.get('keep_alive') == 'warm'

    def test_cron_dispatch_authorized_triggers_tasks(self, api_client):
        """Keyed GET to cron-dispatch runs RSS fetch and scheduled digest dispatch."""
        with patch('apps.ingestor.tasks.fetch_all_active_rss_feeds') as mock_rss, \
             patch('apps.delivery.tasks.dispatch_scheduled_digests') as mock_dispatch:
            mock_rss.return_value = {'status': 'dispatched', 'count': 1}
            mock_dispatch.return_value = {'status': 'complete', 'dispatched_count': 1, 'recipients': ['test@example.com']}

            url = '/api/v1/delivery/cron-dispatch/?key=morningbrief_cron_2025'
            response = api_client.get(url)
            assert response.status_code == 200
            assert response.data.get('status') == 'dispatched'
            assert mock_rss.called
            assert mock_dispatch.called
