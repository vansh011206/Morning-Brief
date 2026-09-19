import pytest
from unittest.mock import patch, MagicMock
from rest_framework import status
from apps.connections.models import Connection
from apps.ingestor.models import RawItem
from apps.ingestor.tasks import fetch_rss_feeds
from apps.connections.crypto import encrypt_token, decrypt_token
from apps.connections.gmail_service import generate_gmail_state, verify_gmail_state
from tests.factories import UserFactory, ConnectionFactory, RawItemFactory

SAMPLE_RSS_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Feed</title>
    <link>https://example.com</link>
    <item>
      <title>Article One</title>
      <link>https://example.com/1</link>
      <description>Summary one.</description>
      <guid>guid-1</guid>
      <pubDate>Thu, 10 Sep 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Article Two</title>
      <link>https://example.com/2</link>
      <description>Summary two.</description>
      <guid>guid-2</guid>
      <pubDate>Thu, 10 Sep 2026 11:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


@pytest.mark.django_db
class TestConnections:
    @patch('requests.get')
    def test_rss_fetch_dedup(self, mock_get, user):
        """Fetching same feed twice must not create duplicate RawItems."""
        mock_resp = MagicMock()
        mock_resp.content = SAMPLE_RSS_XML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        conn = ConnectionFactory.create(user=user, provider=Connection.Provider.RSS)

        # First run: creates 2 items
        result1 = fetch_rss_feeds(conn.id)
        assert result1['status'] == 'success'
        assert result1['created_count'] == 2
        assert RawItem.objects.filter(connection=conn).count() == 2

        # Second run: 0 new items, 2 existing
        result2 = fetch_rss_feeds(conn.id)
        assert result2['status'] == 'success'
        assert result2['created_count'] == 0
        assert result2['existing_count'] == 2
        assert RawItem.objects.filter(connection=conn).count() == 2

    @patch('requests.get')
    def test_broken_feed_error_state(self, mock_get, user):
        """Broken feed network failure updates connection to ERROR state and sets last_error."""
        mock_get.side_effect = Exception("HTTP 500 Internal Server Error")

        conn = ConnectionFactory.create(user=user, provider=Connection.Provider.RSS)
        result = fetch_rss_feeds(conn.id)

        assert result['status'] == 'error'
        conn.refresh_from_db()
        assert conn.status == Connection.Status.ERROR
        assert "HTTP 500" in conn.last_error

    def test_disconnect_cascade(self, auth_client, user):
        """Disconnecting a connection deletes it and cascades delete to all associated RawItems."""
        conn = ConnectionFactory.create(user=user)
        raw1 = RawItemFactory.create(user=user, connection=conn)
        raw2 = RawItemFactory.create(user=user, connection=conn)

        assert RawItem.objects.filter(connection=conn).count() == 2

        # Delete connection via API
        resp = auth_client.delete(f'/api/v1/connections/{conn.id}/')
        assert resp.status_code == status.HTTP_204_NO_CONTENT

        assert not Connection.objects.filter(id=conn.id).exists()
        assert not RawItem.objects.filter(id=raw1.id).exists()
        assert not RawItem.objects.filter(id=raw2.id).exists()

    def test_oauth_state_validation(self, user):
        """OAuth state is signed with TimestampSigner; valid states verify, tampered states fail."""
        state = generate_gmail_state(user.id)
        extracted_user_id = verify_gmail_state(state)
        assert extracted_user_id == user.id

        # Tampered state fails
        with pytest.raises(ValueError):
            verify_gmail_state(state + "tampered")

    def test_token_encryption_roundtrip(self, user):
        """Token encryption asserts stored != plaintext and decrypts accurately."""
        secret_token = "ya29.a0AfH6SMB_very_secret_oauth_refresh_token_12345"
        encrypted = encrypt_token(secret_token)

        # Ciphertext must not match plaintext
        assert encrypted != secret_token
        assert "secret" not in encrypted

        # Decryption restores plaintext
        decrypted = decrypt_token(encrypted)
        assert decrypted == secret_token

        # Stored on Connection model
        conn = ConnectionFactory.create(user=user, encrypted_token=encrypted)
        conn.refresh_from_db()
        assert conn.encrypted_token != secret_token
        assert decrypt_token(conn.encrypted_token) == secret_token
