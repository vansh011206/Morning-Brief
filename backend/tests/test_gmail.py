import json
import pytest
import responses
from apps.connections.models import Connection
from apps.connections.crypto import encrypt_token
from apps.connections.gmail_service import (
    GOOGLE_TOKEN_URL,
    GMAIL_MESSAGES_URL,
    refresh_access_token,
    fetch_gmail_messages,
)
from apps.ingestor.models import RawItem
from tests.factories import UserFactory, ConnectionFactory


@pytest.mark.django_db
class TestGmail:
    @responses.activate
    def test_refresh_token_exchange_mocked(self):
        """Mocked token refresh exchange returns updated access token."""
        responses.add(
            responses.POST,
            GOOGLE_TOKEN_URL,
            json={'access_token': 'new_mocked_access_token_abc123', 'expires_in': 3600},
            status=200,
        )

        new_token = refresh_access_token('mocked_refresh_token_xyz')
        assert new_token == 'new_mocked_access_token_abc123'

    @responses.activate
    def test_gmail_fetch_dedup_by_msg_id(self, user):
        """Gmail message ingestion creates RawItems and deduplicates by message id."""
        creds = {
            'access_token': 'test_gmail_token',
            'refresh_token': 'test_gmail_refresh',
        }
        conn = ConnectionFactory.create(
            user=user,
            provider=Connection.Provider.GMAIL,
            external_account='user@gmail.com',
            display_name='Gmail (user@gmail.com)',
            encrypted_token=encrypt_token(json.dumps(creds)),
        )

        # 1. Mock message list
        responses.add(
            responses.GET,
            f"{GMAIL_MESSAGES_URL}?q=label:INBOX&maxResults=100",
            json={'messages': [{'id': 'msg_101'}, {'id': 'msg_102'}]},
            status=200,
        )

        # 2. Mock message detail for msg_101
        responses.add(
            responses.GET,
            f"{GMAIL_MESSAGES_URL}/msg_101",
            json={
                'id': 'msg_101',
                'snippet': 'Quarterly financial report is attached.',
                'payload': {
                    'headers': [
                        {'name': 'Subject', 'value': 'Q3 Financial Review'},
                        {'name': 'From', 'value': 'finance@company.com'},
                        {'name': 'Date', 'value': 'Thu, 10 Sep 2026 09:30:00 +0000'},
                    ]
                }
            },
            status=200,
        )

        # 3. Mock message detail for msg_102
        responses.add(
            responses.GET,
            f"{GMAIL_MESSAGES_URL}/msg_102",
            json={
                'id': 'msg_102',
                'snippet': 'Can we sync tomorrow at 10 AM?',
                'payload': {
                    'headers': [
                        {'name': 'Subject', 'value': 'Sync on Product Roadmap'},
                        {'name': 'From', 'value': 'pm@company.com'},
                        {'name': 'Date', 'value': 'Thu, 10 Sep 2026 10:15:00 +0000'},
                    ]
                }
            },
            status=200,
        )

        # First fetch: creates 2 items
        result1 = fetch_gmail_messages(conn.id)
        assert result1['status'] == 'success'
        assert result1['created_count'] == 2
        assert RawItem.objects.filter(connection=conn).count() == 2

        raw_item = RawItem.objects.get(external_id='msg_101')
        assert raw_item.type == RawItem.ItemType.EMAIL
        assert raw_item.title == 'Q3 Financial Review'
        assert raw_item.author == 'finance@company.com'

        # Second fetch: 0 created, 2 existing (deduplication verified)
        result2 = fetch_gmail_messages(conn.id)
        assert result2['status'] == 'success'
        assert result2['created_count'] == 0
        assert result2['existing_count'] == 2
        assert RawItem.objects.filter(connection=conn).count() == 2
