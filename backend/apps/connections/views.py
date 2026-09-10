import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Connection
from .serializers import ConnectionSerializer
from apps.ingestor.tasks import fetch_rss_feeds

logger = logging.getLogger(__name__)


class ConnectionListView(generics.ListCreateAPIView):
    """
    List user connected accounts or register a new connection (e.g. custom RSS feed).
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        return Connection.objects.filter(user=self.request.user).prefetch_related('raw_items')

    def perform_create(self, serializer):
        display_name = serializer.validated_data.get('display_name', '').strip()
        external_account = serializer.validated_data.get('external_account', '').strip()
        if not display_name:
            display_name = external_account

        connection = serializer.save(
            user=self.request.user,
            display_name=display_name
        )

        # Trigger immediate initial RSS fetch for fresh content
        if connection.provider == Connection.Provider.RSS and connection.is_active:
            try:
                fetch_rss_feeds(connection.id)
            except Exception as e:
                logger.warning(f"Initial sync failed for connection {connection.id}: {e}")


class ConnectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get connection details, update settings (e.g. is_active toggle), or disconnect (cascades raw items).
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        return Connection.objects.filter(user=self.request.user).prefetch_related('raw_items')


class TriggerSyncView(APIView):
    """
    Trigger immediate ingestion sync for a given connection.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            connection = Connection.objects.get(pk=pk, user=request.user)
        except Connection.DoesNotExist:
            return Response(
                {"error": "Connection not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if connection.provider != Connection.Provider.RSS:
            return Response(
                {"error": f"Sync is not supported yet for provider '{connection.provider}'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = fetch_rss_feeds(connection.id)
        connection.refresh_from_db()
        serialized = ConnectionSerializer(connection).data

        if result.get('status') == 'success':
            return Response({
                "status": "success",
                "message": f"Successfully synchronized '{connection.display_name}'.",
                "connection": serialized,
                "created_count": result.get('created_count', 0),
                "existing_count": result.get('existing_count', 0),
            })
        else:
            return Response({
                "status": "error",
                "message": f"Sync failed: {result.get('error', 'Unknown error')}",
                "connection": serialized,
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
