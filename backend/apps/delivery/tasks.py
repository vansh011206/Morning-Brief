import logging
import pytz
from celery import shared_task, chain
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.digest.models import Digest
from .services import DeliveryService

logger = logging.getLogger(__name__)
User = get_user_model()


@shared_task(
    bind=True,
    name='apps.delivery.tasks.deliver_digest',
    max_retries=3,
    default_retry_delay=60,
)
def deliver_digest(self, digest_arg):
    """
    Renders and delivers a Daily Digest via email to the recipient.
    Supports invocation either directly with a digest ID or as part of a Celery chain
    receiving the result dict from build_digest.
    Sets Digest.delivered_at and status = 'delivered'.
    """
    if isinstance(digest_arg, dict):
        digest_id = digest_arg.get('digest_id')
    else:
        digest_id = digest_arg

    if not digest_id:
        logger.error(f"[deliver_digest] Invalid digest identifier: {digest_arg}")
        return {'status': 'error', 'message': 'Missing digest_id'}

    try:
        digest = Digest.objects.select_related('user__profile').prefetch_related(
            'items__raw_item__connection'
        ).get(pk=digest_id)
    except Digest.DoesNotExist:
        logger.error(f"[deliver_digest] Digest #{digest_id} not found.")
        return {'status': 'error', 'message': f'Digest #{digest_id} not found'}

    # If digest is still in 'building' state, wait and retry
    if digest.status == Digest.Status.BUILDING:
        logger.info(f"[deliver_digest] Digest #{digest_id} is still building, retrying in 30s...")
        raise self.retry(countdown=30)

    # Dispatch via DeliveryService (email, telegram, or both)
    results = DeliveryService.send(digest)
    any_success = any(r.get('success') for r in results.values()) if results else False

    if not any_success:
        err_msg = "; ".join([f"{ch}: {r.get('result')}" for ch, r in results.items()])
        logger.error(f"[deliver_digest] Delivery failed for Digest #{digest_id}: {err_msg}")
        try:
            # Exponential backoff: 60s, 120s, 240s
            backoff_delay = 60 * (2 ** self.request.retries)
            raise self.retry(exc=Exception(err_msg), countdown=backoff_delay)
        except self.MaxRetriesExceededError:
            logger.error(f"[deliver_digest] Max retries exceeded for Digest #{digest_id}")
            return {'status': 'failed', 'error': err_msg}

    # Update digest delivered status & timestamp
    digest.status = Digest.Status.DELIVERED
    digest.delivered_at = timezone.now()
    digest.save(update_fields=['status', 'delivered_at', 'updated_at'])

    logger.info(
        f"[deliver_digest] Digest #{digest_id} successfully delivered to {digest.user.email} "
        f"at {digest.delivered_at.isoformat()}"
    )

    message_id = (
        results.get('email', {}).get('result')
        or results.get('telegram', {}).get('result')
        or 'delivered'
    )

    return {
        'status': 'delivered',
        'digest_id': digest.id,
        'message_id': message_id,
        'delivered_at': digest.delivered_at.isoformat(),
        'results': results,
    }


@shared_task(name='apps.delivery.tasks.dispatch_scheduled_digests')
def dispatch_scheduled_digests():
    """
    Master Celery Beat task executed every 5 minutes.
    Queries active users where local time (tz) matches digest_time and
    digest not yet created/delivered today, then fans out tasks:
    build_digest then deliver_digest in a Celery chain.
    """
    now_utc = timezone.now()
    logger.info(f"[Scheduler] 5-minute digest dispatcher checking active users at {now_utc.strftime('%H:%M UTC')}")

    users = User.objects.filter(
        is_active=True,
        profile__digest_enabled=True,
        profile__delivery_channel__in=['email', 'telegram', 'both']
    ).select_related('profile')

    dispatched_users = []
    from apps.digest.tasks import build_digest

    for user in users:
        profile = getattr(user, 'profile', None)
        if not profile:
            continue

        tz_name = profile.timezone or 'Asia/Kolkata'
        try:
            user_tz = pytz.timezone(tz_name)
        except Exception:
            user_tz = pytz.timezone('Asia/Kolkata')

        user_now = now_utc.astimezone(user_tz)

        # Retrieve configured digest_time (format 'HH:MM')
        if hasattr(profile.digest_time, 'strftime'):
            digest_time_str = profile.digest_time.strftime('%H:%M')
        else:
            digest_time_str = str(profile.digest_time)[:5]

        try:
            target_hour, target_minute = map(int, digest_time_str.split(':')[:2])
        except Exception:
            target_hour, target_minute = 7, 0

        # Calculate time delta in minutes
        curr_total_min = user_now.hour * 60 + user_now.minute
        target_total_min = target_hour * 60 + target_minute
        diff = curr_total_min - target_total_min

        # Match 5-minute window [0, 5)
        if not (0 <= diff < 5):
            continue

        user_today = user_now.date()

        # Check if digest was already delivered today
        already_delivered = Digest.objects.filter(
            user=user,
            digest_date=user_today,
            status=Digest.Status.DELIVERED
        ).exists()

        if already_delivered:
            logger.debug(f"[Scheduler] Digest already delivered for {user.email} on {user_today}. Skipping.")
            continue

        logger.info(
            f"[Scheduler] Scheduling brief for {user.email} (local {user_now.strftime('%H:%M')}, "
            f"target {digest_time_str})"
        )

        # Fan-out: chain build_digest -> deliver_digest
        task_chain = chain(
            build_digest.s(user.id, user_today.isoformat()),
            deliver_digest.s()
        )
        task_chain.delay()
        dispatched_users.append(user.email)

    return {
        'status': 'complete',
        'dispatched_count': len(dispatched_users),
        'recipients': dispatched_users,
    }
