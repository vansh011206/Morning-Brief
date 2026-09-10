from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User, UserProfile


DEFAULT_RSS_FEEDS = [
    {
        'external_account': 'https://hnrss.org/frontpage',
        'display_name': 'Hacker News',
    },
    {
        'external_account': 'https://www.djangoproject.com/rss/weblog/',
        'display_name': 'Django Weblog',
    },
    {
        'external_account': 'https://www.thehindu.com/sport/cricket/feeder/default.rss',
        'display_name': 'Cricket News',
    },
    {
        'external_account': 'https://www.moneycontrol.com/rss/latestnews.xml',
        'display_name': 'Moneycontrol',
    },
]


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
        # Seed 4 default RSS interest feeds for new user
        from apps.connections.models import Connection
        for feed in DEFAULT_RSS_FEEDS:
            Connection.objects.get_or_create(
                user=instance,
                provider=Connection.Provider.RSS,
                external_account=feed['external_account'],
                defaults={
                    'display_name': feed['display_name'],
                    'is_active': True,
                    'status': Connection.Status.PENDING,
                }
            )
    else:
        if hasattr(instance, 'profile'):
            instance.profile.save()
