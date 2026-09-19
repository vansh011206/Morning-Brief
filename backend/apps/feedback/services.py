import logging
from apps.feedback.models import ItemFeedback, CategoryWeight
from apps.ingestor.models import RawItem

logger = logging.getLogger(__name__)


def process_feedback(feedback: ItemFeedback):
    """
    Processes user feedback:
    1. Adjusts category and source weights (bump/decay).
    2. Auto-marks source as spam if repeated downvotes (>= 3) occur on items from the same author or connection.
    """
    user = feedback.user
    item = feedback.digest_item
    raw_item = item.raw_item if item else None

    # Categories to adjust
    categories = [item.section]
    if raw_item and raw_item.connection:
        if raw_item.connection.provider:
            categories.append(raw_item.connection.provider)
        if raw_item.connection.display_name:
            categories.append(raw_item.connection.display_name)
    if raw_item and raw_item.author:
        categories.append(raw_item.author)

    # 1. Weight bump or decay
    delta = 0.0
    if feedback.feedback_type == ItemFeedback.FeedbackType.HELPFUL:
        delta = 1.0
    elif feedback.feedback_type in (ItemFeedback.FeedbackType.UNHELPFUL, ItemFeedback.FeedbackType.IRRELEVANT):
        delta = -1.0
    elif feedback.feedback_type == ItemFeedback.FeedbackType.MISSED_URGENT:
        delta = 2.0

    for cat in categories:
        cw, _ = CategoryWeight.objects.get_or_create(user=user, category_key=cat)
        cw.weight = max(-10.0, min(10.0, round(cw.weight + delta, 2)))
        cw.save()

    # 2. Source auto-spam after repeated downvotes (>= 3 downvotes)
    if feedback.feedback_type in (ItemFeedback.FeedbackType.UNHELPFUL, ItemFeedback.FeedbackType.IRRELEVANT):
        if raw_item:
            # Check negative feedback count for items from this connection or author
            neg_types = [ItemFeedback.FeedbackType.UNHELPFUL, ItemFeedback.FeedbackType.IRRELEVANT]
            author = raw_item.author
            conn = raw_item.connection

            author_down_count = 0
            if author:
                author_down_count = ItemFeedback.objects.filter(
                    user=user,
                    feedback_type__in=neg_types,
                    digest_item__raw_item__author=author
                ).count()

            conn_down_count = 0
            if conn:
                conn_down_count = ItemFeedback.objects.filter(
                    user=user,
                    feedback_type__in=neg_types,
                    digest_item__raw_item__connection=conn
                ).count()

            if author_down_count >= 3:
                RawItem.objects.filter(user=user, author=author).update(is_spam=True)
                logger.info(f"[Feedback] Auto-marked all items from author '{author}' as spam for user {user.email}")
            elif conn_down_count >= 3 and conn:
                RawItem.objects.filter(user=user, connection=conn).update(is_spam=True)
                logger.info(f"[Feedback] Auto-marked all items from connection '{conn.display_name}' as spam for user {user.email}")
