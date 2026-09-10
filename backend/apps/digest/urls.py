from django.urls import path
from .views import (
    DailyDigestListView,
    TodayDigestView,
    DailyDigestDetailView,
    DigestItemToggleReadView,
    DigestItemToggleArchiveView,
    TriggerDigestGenerationView,
)

app_name = 'digest'

urlpatterns = [
    path('', DailyDigestListView.as_view(), name='digest_list'),
    path('today/', TodayDigestView.as_view(), name='today_digest'),
    path('generate/', TriggerDigestGenerationView.as_view(), name='generate_digest'),
    path('<int:pk>/', DailyDigestDetailView.as_view(), name='digest_detail'),
    path('items/<int:pk>/toggle-read/', DigestItemToggleReadView.as_view(), name='toggle_read'),
    path('items/<int:pk>/toggle-archive/', DigestItemToggleArchiveView.as_view(), name='toggle_archive'),
]
