from django.urls import path
from .views import (
    DigestListView,
    DigestDetailView,
    TodayDigestView,
    GenerateNowView,
)

app_name = 'digest'

urlpatterns = [
    path('', DigestListView.as_view(), name='digest_list'),
    path('today/', TodayDigestView.as_view(), name='today_digest'),
    path('generate-now/', GenerateNowView.as_view(), name='generate_now'),
    path('generate/', GenerateNowView.as_view(), name='generate_alias'),
    path('<int:pk>/', DigestDetailView.as_view(), name='digest_detail'),
]
