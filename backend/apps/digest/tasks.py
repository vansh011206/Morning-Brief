import logging
from datetime import timedelta
import pytz
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.ingestor.models import RawItem
from apps.llm.services import summarize_items
from apps.llm.models import TokenUsage
from .models import Digest, DigestItem

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(name='apps.digest.tasks.build_digest')
def build_digest(user_id: int, digest_date_str: str = None):
    """
    Builds a Daily Digest for a specific user.
    Gathers unread RawItems, batches them to the LLM service layer for summarization,
    and creates ranked DigestItem records grouped by section.
    """
    try:
        user = User.objects.select_related('profile').get(pk=user_id)
    except User.DoesNotExist:
        logger.error(f"[DigestBuilder] User {user_id} not found.")
        return {'status': 'error', 'message': f'User {user_id} not found'}

    # Determine user's local date based on profile timezone
    tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata') if hasattr(user, 'profile') else 'Asia/Kolkata'
    try:
        user_tz = pytz.timezone(tz_name)
    except Exception:
        user_tz = pytz.timezone('Asia/Kolkata')

    if digest_date_str:
        from datetime import datetime
        digest_date = datetime.strptime(digest_date_str, '%Y-%m-%d').date()
    else:
        digest_date = timezone.now().astimezone(user_tz).date()

    logger.info(f"[DigestBuilder] Compiling digest for '{user.email}' on {digest_date}")

    # 1. Gather RawItems from the last 24h
    cutoff = timezone.now() - timedelta(hours=24)
    raw_items = list(
        RawItem.objects.filter(
            user=user,
            received_at__gte=cutoff,
            is_spam=False
        ).select_related('connection').order_by('-received_at')[:50]
    )

    # Fallback to most recent items if none received in the last 24 hours
    if not raw_items:
        raw_items = list(
            RawItem.objects.filter(
                user=user,
                is_spam=False
            ).select_related('connection').order_by('-received_at')[:20]
        )

    # Initialize or reset Digest container
    digest, _ = Digest.objects.get_or_create(
        user=user,
        digest_date=digest_date,
        defaults={'status': Digest.Status.BUILDING}
    )
    digest.status = Digest.Status.BUILDING
    digest.save(update_fields=['status', 'updated_at'])

    if not raw_items:
        logger.info(f"[DigestBuilder] No raw items found for {user.email}.")
        digest.status = Digest.Status.READY
        digest.item_count = 0
        digest.important_count = 0
        digest.save(update_fields=['status', 'item_count', 'important_count', 'updated_at'])
        return {
            'status': 'ready',
            'digest_id': digest.id,
            'item_count': 0,
            'message': 'Digest created (no source items available)'
        }

    # 2. Call LLM Service Layer to summarize items
    raw_item_map = {item.id: item for item in raw_items}
    summaries = summarize_items(raw_items, user=user)

    # Clean out any previously generated items for this date
    digest.items.all().delete()

    # 3. Create DigestItems
    digest_items_to_create = []
    priority_weights = {
        DigestItem.Priority.URGENT: 1,
        DigestItem.Priority.HIGH: 2,
        DigestItem.Priority.NORMAL: 3,
    }

    # Sort summarized results: priority first, then received_at desc
    def sort_key(s_dict):
        raw = raw_item_map.get(s_dict.get('id'))
        p = s_dict.get('priority', 'normal')
        weight = priority_weights.get(p, 3)
        received_ts = raw.received_at.timestamp() if raw else 0
        return (weight, -received_ts)

    sorted_summaries = sorted(summaries, key=sort_key)

    important_count = 0
    valid_sections = {choice[0] for choice in DigestItem.Section.choices}
    valid_priorities = {choice[0] for choice in DigestItem.Priority.choices}

    for rank_idx, s in enumerate(sorted_summaries, start=1):
        raw_id = s.get('id')
        raw = raw_item_map.get(raw_id)
        if not raw and raw_items:
            # Fallback to index-matched raw item if ID is out of range
            raw = raw_items[(rank_idx - 1) % len(raw_items)]

        sec = s.get('section', 'news').lower()
        if sec not in valid_sections:
            sec = DigestItem.Section.NEWS

        pri = s.get('priority', 'normal').lower()
        if pri not in valid_priorities:
            pri = DigestItem.Priority.NORMAL

        if pri in [DigestItem.Priority.HIGH, DigestItem.Priority.URGENT]:
            important_count += 1

        title = s.get('source_title') or (raw.title if raw else 'Brief Item')
        summary_text = s.get('summary', '') or (raw.body_snippet if raw else '')
        ai_reason = s.get('ai_reason', '')

        digest_items_to_create.append(
            DigestItem(
                digest=digest,
                raw_item=raw,
                section=sec,
                rank=rank_idx,
                summary=summary_text,
                priority=pri,
                ai_reason=ai_reason,
                source_title=title[:512],
            )
        )

    DigestItem.objects.bulk_create(digest_items_to_create)

    # 4. Calculate LLM Cost Estimate for this user's today operations
    today_usages = TokenUsage.objects.filter(
        user=user,
        created_at__date=timezone.now().date()
    )
    total_cost_cents = sum(u.cost_cents for u in today_usages)

    # 5. Finalize Digest
    digest.item_count = len(digest_items_to_create)
    digest.important_count = important_count
    digest.llm_cost_cents = round(total_cost_cents, 4)
    digest.status = Digest.Status.READY
    digest.save(update_fields=['status', 'item_count', 'important_count', 'llm_cost_cents', 'updated_at'])

    logger.info(
        f"[DigestBuilder] Digest #{digest.id} built successfully: "
        f"{digest.item_count} items ({important_count} important), cost: {digest.llm_cost_cents}¢"
    )

    return {
        'status': 'ready',
        'digest_id': digest.id,
        'item_count': digest.item_count,
        'important_count': digest.important_count,
        'llm_cost_cents': digest.llm_cost_cents,
    }
