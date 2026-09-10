from django.db import models
from django.conf import settings
from apps.ingestor.models import RawItem


class Digest(models.Model):
    """
    Daily briefing container for an individual user and date.
    """
    class Status(models.TextChoices):
        BUILDING = 'building', 'Building'
        READY = 'ready', 'Ready'
        DELIVERED = 'delivered', 'Delivered'
        FAILED = 'failed', 'Failed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='digests'
    )
    digest_date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.BUILDING
    )
    item_count = models.PositiveIntegerField(default=0)
    important_count = models.PositiveIntegerField(default=0)
    llm_cost_cents = models.FloatField(default=0.0)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'digest_date')
        ordering = ['-digest_date']

    def __str__(self):
        return f"Digest for {self.user.email} - {self.digest_date} ({self.get_status_display()})"


# Alias for backward compatibility
DailyDigest = Digest


class DigestItem(models.Model):
    """
    Individual categorized summary item in the user's daily brief.
    """
    class Section(models.TextChoices):
        NEWS = 'news', 'Technology & World News'
        ACTIONS = 'actions', 'Pending Actions & PRs'
        EMAILS = 'emails', 'Priority Correspondence'
        MONEY = 'money', 'Financial & Market Updates'
        EVENTS = 'events', 'Calendar & Scheduled Events'

    class Priority(models.TextChoices):
        NORMAL = 'normal', 'Normal'
        HIGH = 'high', 'High'
        URGENT = 'urgent', 'Urgent'

    digest = models.ForeignKey(
        Digest,
        on_delete=models.CASCADE,
        related_name='items'
    )
    raw_item = models.ForeignKey(
        RawItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='digest_items'
    )
    section = models.CharField(
        max_length=32,
        choices=Section.choices,
        default=Section.NEWS
    )
    rank = models.PositiveIntegerField(default=1)
    summary = models.TextField()
    priority = models.CharField(
        max_length=32,
        choices=Priority.choices,
        default=Priority.NORMAL
    )
    ai_reason = models.TextField(blank=True, default='')
    source_title = models.CharField(max_length=512, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rank', 'id']

    def __str__(self):
        return f"#{self.rank} [{self.section}|{self.priority}] {self.source_title[:45]}"
