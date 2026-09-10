from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Connection
from .serializers import ConnectionSerializer


class ConnectionListView(generics.ListCreateAPIView):
    """
    List user connected accounts or register a connection.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        return Connection.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConnectionDetailView(generics.RetrieveDestroyAPIView):
    """
    Get connection details or disconnect a provider.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        return Connection.objects.filter(user=self.request.user)


class TriggerSyncView(APIView):
    """
    Trigger manual ingestion sync for a given connection.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            connection = Connection.objects.get(pk=pk, user=request.user)
            connection.last_synced_at = timezone.now()
            connection.status = Connection.Status.ACTIVE
            connection.save(update_fields=['last_synced_at', 'status'])
            return Response({
                "status": "success",
                "message": f"Sync initiated for {connection.provider}",
                "last_synced_at": connection.last_synced_at,
            })
        except Connection.DoesNotExist:
            return Response(
                {"error": "Connection not found"},
                status=status.HTTP_404_NOT_FOUND
            )
