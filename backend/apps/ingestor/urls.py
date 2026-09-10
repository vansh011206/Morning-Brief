from django.urls import path
from .views import RawItemListView, RawItemDetailView

app_name = 'ingestor'

urlpatterns = [
    path('', RawItemListView.as_view(), name='raw_item_list'),
    path('raw-items/', RawItemListView.as_view(), name='raw_item_list_explicit'),
    path('<int:pk>/', RawItemDetailView.as_view(), name='raw_item_detail'),
]
