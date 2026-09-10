from rest_framework import serializers
from .models import DailyDigest, DigestItem


class DigestItemSerializer(serializers.ModelSerializer):
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = DigestItem
        fields = [
            'id',
            'digest',
            'rank',
            'priority',
            'priority_display',
            'category',
            'category_display',
            'source',
            'sender',
            'title',
            'summary',
            'action_items',
            'external_url',
            'is_read',
            'is_archived',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class DailyDigestSerializer(serializers.ModelSerializer):
    items = DigestItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = DailyDigest
        fields = [
            'id',
            'date',
            'headline',
            'overview',
            'status',
            'status_display',
            'total_items_ranked',
            'items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
