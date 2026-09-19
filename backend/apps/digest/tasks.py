import logging
from datetime import timedelta
import pytz
from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.ingestor.models import RawItem
from apps.llm.services import summarize_items
from apps.llm.models import TokenUsage
from apps.feedback.models import CategoryWeight
from .models import Digest, DigestItem

logger = logging.getLogger(__name__)
User = get_user_model()

RECRUITER_KEYWORDS = [
    'recruiter', 'recruiting', 'interview', 'job offer', 'application',
    'talent acquisition', 'hiring manager', 'careers', 'phone screen',
    'technical interview', 'onsite interview'
]


def is_recruiter_item(raw_item: RawItem, summary_dict: dict) -> bool:
    """Checks if raw item or summary indicates a job recruitment opportunity."""
    text_to_check = f"{summary_dict.get('source_title', '')} {summary_dict.get('summary', '')}"
    if raw_item:
        text_to_check += f" {raw_item.title} {raw_item.body_snippet} {raw_item.author}"
    text_lower = text_to_check.lower()
    return any(kw in text_lower for kw in RECRUITER_KEYWORDS)


@shared_task(name='apps.digest.tasks.build_digest')
def build_digest(user_id: int, digest_date_str: str = None):
    """
    Builds a Daily Digest for a specific user.
    Gathers unread RawItems, applies spam filtering, calls the LLM service for summarization,
    adjusts scores based on CategoryWeights and job_hunt_mode, enforces priority caps,
    and creates ranked DigestItem records.
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

    # 1. Gather RawItems from the last 24h, strictly excluding spam
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

    # If still no raw items, automatically sync any active/pending RSS connections
    if not raw_items:
        from apps.connections.models import Connection
        from apps.ingestor.tasks import fetch_rss_feeds

        rss_conns = Connection.objects.filter(
            user=user,
            provider=Connection.Provider.RSS,
            is_active=True
        )
        for conn in rss_conns:
            try:
                fetch_rss_feeds(conn.id)
            except Exception as e:
                logger.warning(f"[DigestBuilder] Auto-sync failed for {conn.display_name}: {e}")

        # Re-query raw items after auto-sync
        raw_items = list(
            RawItem.objects.filter(
                user=user,
                is_spam=False
            ).select_related('connection').order_by('-received_at')[:50]
        )

    # Initialize or reset Digest container (idempotent per day)
    digest, _ = Digest.objects.get_or_create(
        user=user,
        digest_date=digest_date,
        defaults={'status': Digest.Status.BUILDING}
    )
    digest.status = Digest.Status.BUILDING
    digest.save(update_fields=['status', 'updated_at'])

    if not raw_items:
        logger.info(f"[DigestBuilder] No raw items found for {user.email}.")
        digest.items.all().delete()
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

    # Clean out any previously generated items for this date to maintain idempotency
    digest.items.all().delete()

    # 3. Load user weights & profile preferences
    user_weights = {
        cw.category_key: cw.weight
        for cw in CategoryWeight.objects.filter(user=user)
    }
    job_hunt_mode = getattr(user.profile, 'job_hunt_mode', False) if hasattr(user, 'profile') else False

    valid_sections = {choice[0] for choice in DigestItem.Section.choices}
    valid_priorities = {choice[0] for choice in DigestItem.Priority.choices}

    # Score and rank candidates
    scored_candidates = []
    for rank_idx, s in enumerate(summaries, start=1):
        raw_id = s.get('id')
        raw = raw_item_map.get(raw_id)
        if not raw and raw_items:
            raw = raw_items[(rank_idx - 1) % len(raw_items)]

        sec = s.get('section', 'news').lower()
        if sec not in valid_sections:
            sec = DigestItem.Section.NEWS

        pri = s.get('priority', 'normal').lower()
        if pri not in valid_priorities:
            pri = DigestItem.Priority.NORMAL

        base_score = 30.0
        if pri == DigestItem.Priority.URGENT:
            base_score = 100.0
        elif pri == DigestItem.Priority.HIGH:
            base_score = 70.0

        # Job hunt mode promotion: recruiter items get boosted to urgent/high
        is_recruiter = is_recruiter_item(raw, s)
        if job_hunt_mode and is_recruiter:
            base_score += 50.0
            pri = DigestItem.Priority.URGENT
            sec = DigestItem.Section.EMAILS if (raw and raw.type == RawItem.ItemType.EMAIL) else DigestItem.Section.ACTIONS

        # Category and source weight adjustments
        cats = [sec]
        if raw:
            cats.append(raw.type)
            if raw.connection:
                if raw.connection.provider:
                    cats.append(raw.connection.provider)
                if raw.connection.display_name:
                    cats.append(raw.connection.display_name)
            if raw.author:
                cats.append(raw.author)

        weight_sum = sum(user_weights.get(c, 0.0) for c in cats)
        capped_weight = max(-3.0, min(3.0, weight_sum))
        final_score = base_score + (capped_weight * 15.0)
        is_adjusted = abs(capped_weight) >= 0.2

        title = s.get('source_title') or (raw.title if raw else 'Brief Item')
        summary_text = s.get('summary', '') or (raw.body_snippet if raw else '')
        ai_reason = s.get('ai_reason', '')

        scored_candidates.append({
            'raw': raw,
            'section': sec,
            'priority': pri,
            'source_title': title[:512],
            'summary': summary_text,
            'ai_reason': ai_reason,
            'final_score': final_score,
            'is_adjusted_by_weight': is_adjusted,
            'received_at': raw.received_at.timestamp() if raw and raw.received_at else 0,
        })

    # Sort candidates by final score (descending), then received_at (descending)
    scored_candidates.sort(key=lambda x: (x['final_score'], x['received_at']), reverse=True)

    # Respect rank cap: limit to top 10 items max
    top_candidates = scored_candidates[:10]

    # Enforce priority caps: max 1 urgent, max 3 high
    urgent_count = 0
    high_count = 0
    important_count = 0
    digest_items_to_create = []

    for idx, sc in enumerate(top_candidates, start=1):
        pri = sc['priority']
        if pri == DigestItem.Priority.URGENT:
            if urgent_count < 1:
                urgent_count += 1
            elif high_count < 3:
                pri = DigestItem.Priority.HIGH
                high_count += 1
            else:
                pri = DigestItem.Priority.NORMAL
        elif pri == DigestItem.Priority.HIGH:
            if high_count < 3:
                high_count += 1
            else:
                pri = DigestItem.Priority.NORMAL

        if pri in (DigestItem.Priority.HIGH, DigestItem.Priority.URGENT):
            important_count += 1

        digest_items_to_create.append(
            DigestItem(
                digest=digest,
                raw_item=sc['raw'],
                section=sc['section'],
                rank=idx,
                summary=sc['summary'],
                priority=pri,
                ai_reason=sc['ai_reason'],
                source_title=sc['source_title'],
                is_adjusted_by_weight=sc['is_adjusted_by_weight'],
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
