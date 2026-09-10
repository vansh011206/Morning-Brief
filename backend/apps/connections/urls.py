from django.urls import path
from .views import ConnectionListView, ConnectionDetailView, TriggerSyncView

app_name = 'connections'

urlpatterns = [
    path('', ConnectionListView.as_view(), name='connection_list'),
    path('<int:pk>/', ConnectionDetailView.as_view(), name='connection_detail'),
    path('<int:pk>/sync/', TriggerSyncView.as_view(), name='trigger_sync'),
]
