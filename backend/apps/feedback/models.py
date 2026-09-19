from django.db import models
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
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


class CategoryWeight(models.Model):
    """
    User affinity weights per category, provider, or source to personalize digest ranking.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='category_weights'
    )
    category_key = models.CharField(
        max_length=64,
        db_index=True,
        help_text='Identifier for category, provider, topic, or section'
    )
    weight = models.FloatField(
        default=0.0,
        help_text='Relative affinity weight (-10.0 to +10.0)'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-weight']
        unique_together = ('user', 'category_key')

    def __str__(self):
        return f"{self.user.email} - {self.category_key}: {self.weight}"


@receiver(post_save, sender=ItemFeedback)
def on_feedback_saved(sender, instance, created, **kwargs):
    if created:
        from apps.feedback.services import process_feedback
        process_feedback(instance)

