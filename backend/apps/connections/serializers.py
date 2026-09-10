from rest_framework import serializers
from .models import Connection


class ConnectionSerializer(serializers.ModelSerializer):
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Connection
        fields = [
            'id',
            'provider',
            'provider_display',
            'account_email',
            'account_username',
            'status',
            'status_display',
            'last_synced_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'status', 'last_synced_at', 'created_at', 'updated_at']
