from rest_framework import serializers, generics, permissions
from django.urls import path
from .models import DeliveryLog


class DeliveryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryLog
        fields = [
            'id',
            'digest',
            'channel',
            'status',
            'recipient',
            'sent_at',
            'error_message',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class DeliveryLogListView(generics.ListAPIView):
    """
    List briefing delivery logs for the authenticated user.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DeliveryLogSerializer

    def get_queryset(self):
        return DeliveryLog.objects.filter(digest__user=self.request.user)
