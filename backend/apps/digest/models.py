from django.db import models
from django.conf import settings
from apps.ingestor.models import RawItem


class DailyDigest(models.Model):
    """
    Morning briefing container for a given day and user.
    """
    class Status(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        GENERATING = 'generating', 'Generating'
        READY = 'ready', 'Ready'
        DELIVERED = 'delivered', 'Delivered'
        FAILED = 'failed', 'Failed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='digests'
    )
    date = models.DateField(db_index=True)
    headline = models.CharField(max_length=255, default='Your Morning Briefing')
    overview = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.QUEUED
    )
    total_items_ranked = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"Digest for {self.user.email} - {self.date}"


class DigestItem(models.Model):
    """
    Ranked individual item in the user's daily briefing with AI summary and action items.
    """
    class Priority(models.TextChoices):
        CRITICAL = 'critical', 'Critical'
        HIGH = 'high', 'High'
        MEDIUM = 'medium', 'Medium'
        LOW = 'low', 'Low'

    class Category(models.TextChoices):
        RECRUITER = 'recruiter', 'Recruiter / Career'
        SECURITY = 'security', 'Security Alert'
        CODE_REVIEW = 'code_review', 'Code Review & PR'
        ACTION_REQUIRED = 'action_required', 'Action Required'
        NEWSLETTER = 'newsletter', 'Newsletter / Digest'
        GENERAL = 'general', 'General Update'

    digest = models.ForeignKey(
        DailyDigest,
        on_delete=models.CASCADE,
        related_name='items'
    )
    raw_item = models.ForeignKey(
        RawItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='digest_entries'
    )
    rank = models.PositiveIntegerField(default=1)
    priority = models.CharField(
        max_length=32,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    category = models.CharField(
        max_length=32,
        choices=Category.choices,
        default=Category.GENERAL
    )
    source = models.CharField(max_length=32, default='email')
    sender = models.CharField(max_length=255, blank=True, default='')
    title = models.CharField(max_length=512)
    summary = models.TextField()
    action_items = models.JSONField(default=list, blank=True)
    external_url = models.URLField(max_length=1024, blank=True, default='')
    is_read = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['rank', '-priority']

    def __str__(self):
        return f"#{self.rank} [{self.priority}] {self.title[:50]}"
