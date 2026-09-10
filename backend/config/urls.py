from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions
from django.utils import timezone
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


class HealthCheckView(APIView):
    """
    Health check endpoint returning 200 OK and service metadata.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return Response({
            "status": "ok",
            "service": "MorningBrief API",
            "timestamp": timezone.now().isoformat(),
            "version": "1.0.0",
        })


urlpatterns = [
    path('admin/', admin.site.urls),

    # Health Check
    path('api/v1/health/', HealthCheckView.as_view(), name='health_check'),

    # OpenAPI Schema & Interactive Documentation
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger_ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc_ui'),

    # API v1 Apps
    path('api/v1/auth/', include('apps.accounts.urls', namespace='accounts')),
    path('api/v1/connections/', include('apps.connections.urls', namespace='connections')),
    path('api/v1/ingestor/', include('apps.ingestor.urls', namespace='ingestor')),
    path('api/v1/digest/', include('apps.digest.urls', namespace='digest')),
    path('api/v1/digests/', include('apps.digest.urls', namespace='digests')),
    path('api/v1/delivery/', include('apps.delivery.urls', namespace='delivery')),
    path('api/v1/feedback/', include('apps.feedback.urls', namespace='feedback')),
    path('api/v1/llm/', include('apps.llm.urls', namespace='llm')),
]
