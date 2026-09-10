from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Connection


class ConnectionSerializer(serializers.ModelSerializer):
    provider_display = serializers.CharField(source='get_provider_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    total_items_7d = serializers.SerializerMethodField()

    class Meta:
        model = Connection
        fields = [
            'id',
            'provider',
            'provider_display',
            'external_account',
            'display_name',
            'is_active',
            'status',
            'status_display',
            'last_sync_at',
            'last_error',
            'total_items_7d',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'provider_display',
            'status',
            'status_display',
            'last_sync_at',
            'last_error',
            'total_items_7d',
            'created_at',
            'updated_at',
        ]

    def get_total_items_7d(self, obj) -> int:
        cutoff = timezone.now() - timedelta(days=7)
        return obj.raw_items.filter(received_at__gte=cutoff).count()

    def validate_external_account(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Source URL or account cannot be blank.")
        return val
