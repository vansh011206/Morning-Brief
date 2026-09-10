from rest_framework import serializers
from .models import RawItem


class RawItemSerializer(serializers.ModelSerializer):
    source_display = serializers.CharField(source='get_source_type_display', read_only=True)

    class Meta:
        model = RawItem
        fields = [
            'id',
            'connection',
            'source_type',
            'source_display',
            'external_id',
            'title',
            'sender',
            'recipient',
            'snippet',
            'received_at',
            'is_processed',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
