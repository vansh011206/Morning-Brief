from django.db import models
from django.conf import settings
from apps.connections.models import Connection


class RawItem(models.Model):
    """
    Normalized ingested item from connected data sources prior to ranking and digest compilation.
    """
    class ItemType(models.TextChoices):
        NEWS = 'news', 'News'
        EMAIL = 'email', 'Email'
        PR = 'pr', 'Pull Request'
        EVENT = 'event', 'Event'
        BILL = 'bill', 'Bill / Invoice'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='raw_items'
    )
    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name='raw_items'
    )
    external_id = models.CharField(
        max_length=512,
        help_text='Unique identifier from provider source (e.g. entry guid/id or message id)'
    )
    type = models.CharField(
        max_length=32,
        choices=ItemType.choices,
        default=ItemType.NEWS
    )
    title = models.CharField(max_length=512)
    body_snippet = models.TextField(blank=True, default='')
    author = models.CharField(max_length=255, blank=True, default='')
    source_url = models.URLField(max_length=1024, blank=True, default='')
    received_at = models.DateTimeField(db_index=True)
    is_important = models.BooleanField(null=True, blank=True)
    is_spam = models.BooleanField(default=False)
    section_hint = models.CharField(
        max_length=32,
        blank=True,
        default='',
        help_text="Optional section routing hint (e.g. 'money' or 'actions')",
    )
    feedback_score = models.FloatField(default=0.0)
    dedup_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text='SHA256 hash ensuring idempotency and deduplication'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-received_at']
        indexes = [
            models.Index(fields=['user', 'received_at']),
            models.Index(fields=['connection', 'received_at']),
            models.Index(fields=['dedup_hash']),
        ]

    def __str__(self):
        return f"[{self.type}] {self.title[:60]}"
