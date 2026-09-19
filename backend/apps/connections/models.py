from django.db import models
from django.conf import settings


class Connection(models.Model):
    """
    Connected data and feed sources (RSS, GitHub, Gmail, Telegram) for notification ingestion.
    """
    class Provider(models.TextChoices):
        RSS = 'rss', 'RSS Feed'
        GITHUB = 'github', 'GitHub'
        GMAIL = 'gmail', 'Google Gmail'
        TELEGRAM = 'telegram', 'Telegram'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        ERROR = 'error', 'Error'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='connections'
    )
    provider = models.CharField(
        max_length=32,
        choices=Provider.choices,
        default=Provider.RSS
    )
    external_account = models.CharField(
        max_length=512,
        help_text='Feed URL, account email, or external identifier'
    )
    display_name = models.CharField(
        max_length=255,
        help_text='User-friendly label for this connection'
    )
    is_active = models.BooleanField(
        default=True,
        help_text='Whether this connection is actively polled during scheduled ingestion'
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.PENDING
    )
    last_sync_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when entries were last fetched successfully'
    )
    last_error = models.TextField(
        blank=True,
        default='',
        help_text='Details of the most recent fetch error, if any'
    )
    encrypted_token = models.TextField(
        null=True,
        blank=True,
        help_text='OAuth access/refresh token or secret (if applicable)'
    )
    avatar_url = models.URLField(
        max_length=1024,
        blank=True,
        default='',
        help_text='Profile avatar URL from OAuth provider'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'provider', 'external_account')
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_provider_display()}] {self.display_name} ({self.user.email})"
