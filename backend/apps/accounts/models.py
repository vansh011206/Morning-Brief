from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom user model where email is unique, and first_name, last_name, phone are optional.
    """
    email = models.EmailField('email address', unique=True)
    first_name = models.CharField('first name', max_length=150, blank=True, default='')
    last_name = models.CharField('last name', max_length=150, blank=True, default='')
    phone = models.CharField('phone number', max_length=30, blank=True, default='')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email or self.username


class UserProfile(models.Model):
    """
    User configuration profile for MorningBrief delivery preferences.
    """
    class DeliveryChannel(models.TextChoices):
        EMAIL = 'email', 'Email'
        TELEGRAM = 'telegram', 'Telegram'
        BOTH = 'both', 'Both Email & Telegram'

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    timezone = models.CharField(
        max_length=64,
        default='Asia/Kolkata',
        help_text='IANA timezone code (e.g. Asia/Kolkata, America/New_York)'
    )
    digest_time = models.TimeField(
        default='07:00',
        help_text='Local time when the morning digest should be compiled and sent'
    )
    delivery_channel = models.CharField(
        max_length=16,
        choices=DeliveryChannel.choices,
        default=DeliveryChannel.EMAIL,
        help_text='Channel through which the morning digest is delivered'
    )
    telegram_chat_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text='Telegram Chat ID for bot notifications'
    )
    job_hunt_mode = models.BooleanField(
        default=False,
        help_text='Boost priority for recruiters, job applications, interview invites'
    )
    digest_enabled = models.BooleanField(
        default=True,
        help_text='Whether daily automated digest generation is active'
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when user finished onboarding wizard'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.email} ({self.timezone})"
