import factory
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.accounts.models import UserProfile
from apps.connections.models import Connection
from apps.ingestor.models import RawItem
from apps.digest.models import Digest, DigestItem
from apps.feedback.models import ItemFeedback, CategoryWeight
from apps.delivery.models import DeliveryLog
from apps.llm.models import TokenUsage

User = get_user_model()


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.Sequence(lambda n: f"user_{n}@morningbrief.ai")
    first_name = "Alex"
    last_name = "Rivera"

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        password = kwargs.pop('password', 'SecurePass123!')
        user = super()._create(model_class, *args, **kwargs)
        user.set_password(password)
        user.save()
        return user


class UserProfileFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(UserFactory)
    timezone = "Asia/Kolkata"
    digest_time = "07:00"
    delivery_channel = "email"
    job_hunt_mode = False
    digest_enabled = True


class ConnectionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Connection

    user = factory.SubFactory(UserFactory)
    provider = Connection.Provider.RSS
    external_account = factory.Sequence(lambda n: f"https://example.com/feed_{n}.xml")
    display_name = factory.Sequence(lambda n: f"Feed {n}")
    status = Connection.Status.ACTIVE
    is_active = True


class RawItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = RawItem

    user = factory.SubFactory(UserFactory)
    connection = factory.SubFactory(ConnectionFactory)
    external_id = factory.Sequence(lambda n: f"item_{n}")
    type = RawItem.ItemType.NEWS
    title = factory.Sequence(lambda n: f"Important Tech Update #{n}")
    body_snippet = "A breakdown of today's key technical insights and system architecture."
    author = "Staff Reporter"
    source_url = "https://example.com/article"
    received_at = factory.LazyFunction(timezone.now)
    is_spam = False
    dedup_hash = factory.Sequence(lambda n: f"dedup_hash_{n}")


class DigestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Digest

    user = factory.SubFactory(UserFactory)
    digest_date = factory.LazyFunction(lambda: timezone.now().date())
    status = Digest.Status.READY
    item_count = 0
    important_count = 0
    llm_cost_cents = 0.05


class DigestItemFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DigestItem

    digest = factory.SubFactory(DigestFactory)
    raw_item = factory.SubFactory(RawItemFactory)
    section = DigestItem.Section.NEWS
    rank = 1
    summary = "Executive synthesis of modern distributed systems."
    priority = DigestItem.Priority.NORMAL
    source_title = "Breaking: Distributed Systems Advancements"


class ItemFeedbackFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ItemFeedback

    user = factory.SubFactory(UserFactory)
    digest_item = factory.SubFactory(DigestItemFactory)
    feedback_type = ItemFeedback.FeedbackType.HELPFUL


class CategoryWeightFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = CategoryWeight

    user = factory.SubFactory(UserFactory)
    category_key = "news"
    weight = 0.0


class TokenUsageFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TokenUsage

    user = factory.SubFactory(UserFactory)
    call_type = "summarize"
    prompt_tokens = 250
    completion_tokens = 80
    model = "mock-gpt-4o-mini"


class DeliveryLogFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DeliveryLog

    digest = factory.SubFactory(DigestFactory)
    channel = DeliveryLog.Channel.EMAIL
    status = DeliveryLog.Status.SENT
    recipient = "user@example.com"
