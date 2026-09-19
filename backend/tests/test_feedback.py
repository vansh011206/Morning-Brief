import pytest
from apps.feedback.models import ItemFeedback, CategoryWeight
from apps.ingestor.models import RawItem
from apps.feedback.services import process_feedback
from tests.factories import (
    UserFactory,
    ConnectionFactory,
    RawItemFactory,
    DigestFactory,
    DigestItemFactory,
    ItemFeedbackFactory,
)


@pytest.mark.django_db
class TestFeedback:
    def test_weight_bump_and_decay(self, user):
        """Helpful feedback bumps category weight; unhelpful decays it."""
        digest = DigestFactory.create(user=user)
        item = DigestItemFactory.create(digest=digest, section='news')

        # 1. HELPFUL feedback -> weight bump (+1.0)
        fb_up = ItemFeedback.objects.create(
            user=user,
            digest_item=item,
            feedback_type=ItemFeedback.FeedbackType.HELPFUL
        )
        cw = CategoryWeight.objects.get(user=user, category_key='news')
        assert cw.weight == 1.0

        # 2. UNHELPFUL feedback -> weight decay (-1.0)
        fb_down = ItemFeedback.objects.create(
            user=user,
            digest_item=item,
            feedback_type=ItemFeedback.FeedbackType.UNHELPFUL
        )
        cw.refresh_from_db()
        assert cw.weight == 0.0

    def test_source_auto_spam_after_repeated_downvotes(self, user):
        """Three repeated downvotes on items from the same author auto-mark that source as spam."""
        conn = ConnectionFactory.create(user=user)
        author_name = "Annoying Newsletter <news@spammy.com>"

        # Create 3 raw items and 3 digest items from same author
        digest = DigestFactory.create(user=user)
        raw1 = RawItemFactory.create(user=user, connection=conn, author=author_name, is_spam=False, dedup_hash="raw_1")
        raw2 = RawItemFactory.create(user=user, connection=conn, author=author_name, is_spam=False, dedup_hash="raw_2")
        raw3 = RawItemFactory.create(user=user, connection=conn, author=author_name, is_spam=False, dedup_hash="raw_3")

        item1 = DigestItemFactory.create(digest=digest, raw_item=raw1)
        item2 = DigestItemFactory.create(digest=digest, raw_item=raw2)
        item3 = DigestItemFactory.create(digest=digest, raw_item=raw3)

        # Downvote 1 & 2: not yet auto-spam
        ItemFeedback.objects.create(user=user, digest_item=item1, feedback_type=ItemFeedback.FeedbackType.UNHELPFUL)
        ItemFeedback.objects.create(user=user, digest_item=item2, feedback_type=ItemFeedback.FeedbackType.UNHELPFUL)

        raw1.refresh_from_db()
        raw2.refresh_from_db()
        raw3.refresh_from_db()
        assert not raw1.is_spam
        assert not raw3.is_spam

        # Downvote 3: reaches threshold of 3 -> triggers auto-spam
        ItemFeedback.objects.create(user=user, digest_item=item3, feedback_type=ItemFeedback.FeedbackType.UNHELPFUL)

        raw1.refresh_from_db()
        raw2.refresh_from_db()
        raw3.refresh_from_db()
        assert raw1.is_spam
        assert raw2.is_spam
        assert raw3.is_spam
