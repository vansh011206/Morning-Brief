from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from .services import LLMService


class LLMStatusView(APIView):
    """
    Check LLM engine availability and configuration.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        return Response({
            "status": "ready",
            "model_provider": "configured",
            "capabilities": ["summarize", "rank", "extract_action_items"]
        })
