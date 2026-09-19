import pytest
from django.utils import timezone
from rest_framework import status
from apps.ingestor.models import RawItem
from apps.digest.models import Digest, DigestItem
from apps.digest.tasks import build_digest
from tests.factories import UserFactory, ConnectionFactory, RawItemFactory


@pytest.fixture(autouse=True)
def mock_llm_settings(settings):
    settings.LLM_PROVIDER = 'mock'


@pytest.mark.django_db
class TestDigest:
    def test_build_from_fixtures_sections_created(self, user):
        """build_digest creates Digest and categorized DigestItem records across sections."""
        conn = ConnectionFactory.create(user=user)
        RawItemFactory.create(
            user=user,
            connection=conn,
            type=RawItem.ItemType.NEWS,
            title="Tech Breakthrough in Quantum Computing",
            body_snippet="Scientists achieved milestone.",
        )
        RawItemFactory.create(
            user=user,
            connection=conn,
            type=RawItem.ItemType.PR,
            title="PR #108: Fix critical authentication vulnerability",
            body_snippet="Addresses session validation flaw.",
        )

        result = build_digest(user.id)
        assert result['status'] == 'ready'
        assert result['item_count'] == 2

        digest = Digest.objects.get(id=result['digest_id'])
        items = list(digest.items.all())
        assert len(items) == 2

        sections = {item.section for item in items}
        assert len(sections) >= 1
        assert all(item.summary for item in items)
        assert all(item.rank in (1, 2) for item in items)

    def test_rank_respects_cap(self, user):
        """Digest enforces rank cap: maximum 10 items, max 1 urgent, max 3 high."""
        conn = ConnectionFactory.create(user=user)
        # Create 15 items
        for i in range(15):
            RawItemFactory.create(
                user=user,
                connection=conn,
                external_id=f"item_cap_{i}",
                title=f"Critical Security Alert CVE-2026-{i} discovered",
                body_snippet="Urgent patch required immediately.",
                dedup_hash=f"hash_cap_{i}",
            )

        result = build_digest(user.id)
        digest = Digest.objects.get(id=result['digest_id'])
        items = list(digest.items.all())

        # Max 10 items
        assert len(items) <= 10
        assert digest.item_count <= 10

        # Max 1 urgent, max 3 high
        urgent_count = sum(1 for itm in items if itm.priority == DigestItem.Priority.URGENT)
        high_count = sum(1 for itm in items if itm.priority == DigestItem.Priority.HIGH)
        assert urgent_count <= 1
        assert high_count <= 3

    def test_spam_excluded(self, user):
        """Spam items (is_spam=True) are strictly excluded from the digest."""
        conn = ConnectionFactory.create(user=user)
        legit_item = RawItemFactory.create(
            user=user,
            connection=conn,
            title="Legitimate Important Announcement",
            is_spam=False,
            dedup_hash="legit_hash",
        )
        spam_item = RawItemFactory.create(
            user=user,
            connection=conn,
            title="Exclusive Casino Winner Claim Free Crypto",
            body_snippet="Click here to claim your lottery prize now!",
            is_spam=True,
            dedup_hash="spam_hash",
        )

        result = build_digest(user.id)
        digest = Digest.objects.get(id=result['digest_id'])
        item_raw_ids = [item.raw_item_id for item in digest.items.all()]

        assert legit_item.id in item_raw_ids
        assert spam_item.id not in item_raw_ids

    def test_job_hunt_mode_promotion(self, user):
        """job_hunt_mode promotes recruiter and interview outreach to top rank with high/urgent priority."""
        # Enable job hunt mode
        user.profile.job_hunt_mode = True
        user.profile.save()

        conn = ConnectionFactory.create(user=user)
        news_item = RawItemFactory.create(
            user=user,
            connection=conn,
            title="General Market Update and Tech News",
            body_snippet="Routine daily market report.",
            dedup_hash="general_news_hash",
        )
        recruiter_item = RawItemFactory.create(
            user=user,
            connection=conn,
            type=RawItem.ItemType.EMAIL,
            title="Interview invitation: Senior Staff Engineer at OpenAI",
            body_snippet="Our talent acquisition team would love to schedule a technical interview.",
            author="recruiter@techcorp.com",
            dedup_hash="recruiter_invite_hash",
        )

        result = build_digest(user.id)
        digest = Digest.objects.get(id=result['digest_id'])
        first_item = digest.items.first()

        # Recruiter item promoted to rank #1 with urgent or high priority
        assert first_item.raw_item_id == recruiter_item.id
        assert first_item.priority in (DigestItem.Priority.URGENT, DigestItem.Priority.HIGH)
        assert first_item.rank == 1

    def test_generate_now_idempotent_per_day(self, auth_client, user):
        """Calling generate-now multiple times on the same date produces exactly one Digest record."""
        conn = ConnectionFactory.create(user=user)
        RawItemFactory.create(user=user, connection=conn, title="Daily Update Item", dedup_hash="idemp_hash")

        # First call
        resp1 = auth_client.post('/api/v1/digests/generate-now/')
        assert resp1.status_code == status.HTTP_201_CREATED
        digest_id1 = resp1.data['id']

        # Second call on same date
        resp2 = auth_client.post('/api/v1/digests/generate-now/')
        assert resp2.status_code == status.HTTP_201_CREATED
        digest_id2 = resp2.data['id']

        # Exactly 1 Digest in DB for this user and date
        assert digest_id1 == digest_id2
        assert Digest.objects.filter(user=user, digest_date=timezone.now().date()).count() == 1
