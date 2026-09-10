from django.urls import path
from .views import ItemFeedbackCreateView

app_name = 'feedback'

urlpatterns = [
    path('', ItemFeedbackCreateView.as_view(), name='item_feedback_create'),
]
