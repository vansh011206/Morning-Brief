from django.db import models
from django.conf import settings
from apps.digest.models import DigestItem


class ItemFeedback(models.Model):
    """
    User rating and alignment signal on digest summaries and rankings.
    """
    class FeedbackType(models.TextChoices):
        HELPFUL = 'helpful', 'Helpful'
        UNHELPFUL = 'unhelpful', 'Unhelpful'
        IRRELEVANT = 'irrelevant', 'Irrelevant'
        MISSED_URGENT = 'missed_urgent', 'Missed Urgent Priority'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    digest_item = models.ForeignKey(
        DigestItem,
        on_delete=models.CASCADE,
        related_name='feedbacks'
    )
    feedback_type = models.CharField(
        max_length=32,
        choices=FeedbackType.choices,
        default=FeedbackType.HELPFUL
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - #{self.digest_item.rank} - {self.feedback_type}"
