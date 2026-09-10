from django.urls import path
from .views import LLMStatusView

app_name = 'llm'

urlpatterns = [
    path('status/', LLMStatusView.as_view(), name='llm_status'),
]
