from django.urls import path
from .views import (
    ConnectionListView,
    ConnectionDetailView,
    TriggerSyncView,
    TelegramTokenView,
    TelegramBindView,
    TelegramWebhookView,
    TelegramSetWebhookView,
    GmailAuthUrlView,
    GmailCallbackView,
    GitHubAuthUrlView,
    GitHubCallbackView,
    CalendarAuthUrlView,
    CalendarCallbackView,
)

app_name = 'connections'

urlpatterns = [
    path('', ConnectionListView.as_view(), name='connection_list'),
    path('<int:pk>/', ConnectionDetailView.as_view(), name='connection_detail'),
    path('<int:pk>/sync/', TriggerSyncView.as_view(), name='trigger_sync'),
    path('telegram/token/', TelegramTokenView.as_view(), name='telegram_token'),
    path('telegram/bind/', TelegramBindView.as_view(), name='telegram_bind'),
    path('telegram/webhook/', TelegramWebhookView.as_view(), name='telegram_webhook'),
    path('telegram/set-webhook/', TelegramSetWebhookView.as_view(), name='telegram_set_webhook'),
    path('gmail/auth-url/', GmailAuthUrlView.as_view(), name='gmail_auth_url'),
    path('gmail/callback/', GmailCallbackView.as_view(), name='gmail_callback'),
    path('github/auth-url/', GitHubAuthUrlView.as_view(), name='github_auth_url'),
    path('github/callback/', GitHubCallbackView.as_view(), name='github_callback'),
    path('calendar/auth-url/', CalendarAuthUrlView.as_view(), name='calendar_auth_url'),
    path('calendar/callback/', CalendarCallbackView.as_view(), name='calendar_callback'),
]

