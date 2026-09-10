from django.urls import path
from .views import DeliveryLogListView, SendTestBriefView

app_name = 'delivery'

urlpatterns = [
    path('logs/', DeliveryLogListView.as_view(), name='delivery_logs'),
    path('test-brief/', SendTestBriefView.as_view(), name='test_brief'),
]

