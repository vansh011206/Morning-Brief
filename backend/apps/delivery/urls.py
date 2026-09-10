from django.urls import path
from .views import DeliveryLogListView

app_name = 'delivery'

urlpatterns = [
    path('logs/', DeliveryLogListView.as_view(), name='delivery_logs'),
]
