from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from apps.connections.models import Connection
from apps.ingestor.models import RawItem
from apps.digest.models import Digest, DigestItem
from apps.digest.tasks import build_digest

User = get_user_model()


class DigestBuilderTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='digest.tester@morningbrief.ai',
            username='digesttester',
            password='TestPassword123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.conn = Connection.objects.filter(user=self.user).first()

        # Create sample raw items
        self.item1 = RawItem.objects.create(
            user=self.user,
            connection=self.conn,
            external_id='guid-digest-1',
            type=RawItem.ItemType.NEWS,
            title='Critical security patch released for Django web framework',
            body_snippet='Remediates high-priority SQL vulnerability.',
            source_url='https://example.com/sec-patch',
            received_at=timezone.now(),
            dedup_hash='hash-digest-1'
        )

        self.item2 = RawItem.objects.create(
            user=self.user,
            connection=self.conn,
            external_id='guid-digest-2',
            type=RawItem.ItemType.NEWS,
            title='Tech stocks and Sensex surge on quarterly earnings optimism',
            body_snippet='Broad market rally recorded across indices.',
            source_url='https://example.com/market-rally',
            received_at=timezone.now(),
            dedup_hash='hash-digest-2'
        )

    @override_settings(LLM_PROVIDER='mock')
    def test_build_digest_task(self):
        """build_digest task creates Digest and categorized DigestItem records."""
        result = build_digest(self.user.id)
        self.assertEqual(result['status'], 'ready')
        self.assertEqual(result['item_count'], 2)

        digest = Digest.objects.get(id=result['digest_id'])
        self.assertEqual(digest.user, self.user)
        self.assertEqual(digest.status, Digest.Status.READY)
        self.assertEqual(digest.item_count, 2)
        self.assertGreaterEqual(digest.llm_cost_cents, 0.0)

        items = list(digest.items.all())
        self.assertEqual(len(items), 2)
        # Ranks must be assigned
        self.assertEqual(items[0].rank, 1)
        self.assertEqual(items[1].rank, 2)
        # Items should have summaries and sections
        sections = {item.section for item in items}
        self.assertTrue(len(sections) >= 1)

    @override_settings(LLM_PROVIDER='mock')
    def test_generate_now_api_endpoint(self):
        """POST /api/v1/digests/generate-now/ compiles and returns ready digest."""
        resp = self.client.post('/api/v1/digests/generate-now/')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        data = resp.json()

        self.assertEqual(data['status'], 'ready')
        self.assertEqual(data['item_count'], 2)
        self.assertIn('sections', data)
        self.assertIn('items', data)
        self.assertEqual(len(data['items']), 2)
        self.assertTrue(data['items'][0]['summary'])
        self.assertTrue(data['items'][0]['source_title'])

    @override_settings(LLM_PROVIDER='mock')
    def test_today_digest_api_endpoint(self):
        """GET /api/v1/digests/today/ returns today's digest (building if none)."""
        resp = self.client.get('/api/v1/digests/today/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()

        self.assertEqual(data['status'], 'ready')
        self.assertEqual(data['item_count'], 2)
        self.assertIn('sections', data)
