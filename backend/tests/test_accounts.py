import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.connections.models import Connection
from apps.ingestor.models import RawItem
from apps.digest.models import Digest, DigestItem
from apps.feedback.models import ItemFeedback, CategoryWeight
from apps.llm.models import TokenUsage
from tests.factories import (
    UserFactory,
    ConnectionFactory,
    RawItemFactory,
    DigestFactory,
    DigestItemFactory,
    ItemFeedbackFactory,
    CategoryWeightFactory,
    TokenUsageFactory,
)

User = get_user_model()


@pytest.mark.django_db
class TestAccounts:
    def test_register_creates_user_profile_and_default_feeds(self, api_client):
        payload = {
            'name': 'Sarah Connor',
            'email': 'sarah@skynet.ai',
            'password': 'StrongPassword123!',
        }
        response = api_client.post('/api/v1/auth/register/', payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['user']['email'] == 'sarah@skynet.ai'
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert 'refresh' in response.data['tokens']

        # Verify profile and default RSS feeds seeded
        user = User.objects.get(email='sarah@skynet.ai')
        assert hasattr(user, 'profile')
        connections = Connection.objects.filter(user=user)
        assert connections.count() == 4

    def test_login_and_refresh_token_rotation(self, api_client):
        user = UserFactory.create(email='login_user@morningbrief.ai', password='SecretPassword123!')

        # 1. Login
        login_resp = api_client.post('/api/v1/auth/login/', {
            'email': 'login_user@morningbrief.ai',
            'password': 'SecretPassword123!',
        }, format='json')
        assert login_resp.status_code == status.HTTP_200_OK
        refresh_1 = login_resp.data['refresh']
        access_1 = login_resp.data['access']

        # 2. Refresh token rotation
        refresh_resp = api_client.post('/api/v1/auth/refresh/', {
            'refresh': refresh_1,
        }, format='json')
        assert refresh_resp.status_code == status.HTTP_200_OK
        assert 'access' in refresh_resp.data
        assert 'refresh' in refresh_resp.data
        refresh_2 = refresh_resp.data['refresh']
        assert refresh_2 != refresh_1

        # 3. Old refresh token should now be blacklisted
        bad_refresh = api_client.post('/api/v1/auth/refresh/', {
            'refresh': refresh_1,
        }, format='json')
        assert bad_refresh.status_code == status.HTTP_401_UNAUTHORIZED

    def test_auth_rate_limiting_throttle(self, api_client):
        """Auth endpoints are throttled to 5/min."""
        payload = {
            'email': 'throttle_check@morningbrief.ai',
            'password': 'WrongPassword123!',
        }
        # Fire 5 requests (allowed)
        for _ in range(5):
            api_client.post('/api/v1/auth/login/', payload, format='json')

        # 6th request must be throttled with HTTP 429
        throttled_resp = api_client.post('/api/v1/auth/login/', payload, format='json')
        assert throttled_resp.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_gdpr_delete_account_transactional_wipe(self, api_client):
        """Delete-account endpoint wipes RawItems, Connections, Digests, Feedback, TokenUsage atomically."""
        user = UserFactory.create(email='gdpr_user@morningbrief.ai', password='Password123!')
        conn = ConnectionFactory.create(user=user)
        raw = RawItemFactory.create(user=user, connection=conn)
        digest = DigestFactory.create(user=user)
        item = DigestItemFactory.create(digest=digest, raw_item=raw)
        ItemFeedbackFactory.create(user=user, digest_item=item)
        CategoryWeight.objects.get_or_create(user=user, category_key='actions', defaults={'weight': 1.5})
        TokenUsageFactory.create(user=user)

        # Authenticate user
        api_client.force_authenticate(user=user)

        # Execute GDPR delete
        resp = api_client.post('/api/v1/auth/delete-account/')
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data['status'] == 'deleted'

        # Verify complete transactional purge across all tables
        assert not User.objects.filter(id=user.id).exists()
        assert not Connection.objects.filter(user_id=user.id).exists()
        assert not RawItem.objects.filter(user_id=user.id).exists()
        assert not Digest.objects.filter(user_id=user.id).exists()
        assert not DigestItem.objects.filter(digest_id=digest.id).exists()
        assert not ItemFeedback.objects.filter(user_id=user.id).exists()
        assert not CategoryWeight.objects.filter(user_id=user.id).exists()
        assert not TokenUsage.objects.filter(user_id=user.id).exists()
