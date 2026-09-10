from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.conf import settings
from .services import get_llm_client
from .models import TokenUsage


class LLMStatusView(APIView):
    """
    Check LLM engine availability, active model, and token usage stats.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        client = get_llm_client()
        user_usages = TokenUsage.objects.filter(user=request.user)
        total_tokens = sum(u.total_tokens for u in user_usages)
        total_cost_cents = sum(u.cost_cents for u in user_usages)

        return Response({
            "status": "ready",
            "provider": getattr(settings, 'LLM_PROVIDER', 'openai'),
            "client_type": type(client).__name__,
            "model": getattr(settings, 'LLM_MODEL', 'gpt-4o-mini'),
            "user_stats": {
                "total_calls": user_usages.count(),
                "total_tokens": total_tokens,
                "total_cost_cents": round(total_cost_cents, 4),
            },
            "capabilities": ["summarize", "filter", "rank", "extract_action_items"]
        })
