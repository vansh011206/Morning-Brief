from django.db import models
from apps.digest.models import Digest


class DeliveryLog(models.Model):
    """
    Audit log of dispatched morning briefings via Email and Telegram.
    """
    class Channel(models.TextChoices):
        EMAIL = 'email', 'Email'
        TELEGRAM = 'telegram', 'Telegram'

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        SENT = 'sent', 'Sent'
        FAILED = 'failed', 'Failed'

    digest = models.ForeignKey(
        Digest,
        on_delete=models.CASCADE,
        related_name='deliveries'
    )
    channel = models.CharField(max_length=16, choices=Channel.choices)
    status = models.CharField(
        max_length=16,
        choices=Status.choices,
        default=Status.PENDING
    )
    recipient = models.CharField(max_length=255)
    external_message_id = models.CharField(max_length=255, blank=True, default='')
    error_message = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.channel} -> {self.recipient} ({self.status})"
