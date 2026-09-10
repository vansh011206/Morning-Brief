from rest_framework import serializers
from .models import RawItem


class RawItemSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    connection_name = serializers.CharField(source='connection.display_name', read_only=True)
    connection_provider = serializers.CharField(source='connection.provider', read_only=True)

    class Meta:
        model = RawItem
        fields = [
            'id',
            'connection',
            'connection_name',
            'connection_provider',
            'external_id',
            'type',
            'type_display',
            'title',
            'body_snippet',
            'author',
            'source_url',
            'received_at',
            'is_important',
            'is_spam',
            'feedback_score',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'type_display',
            'connection_name',
            'connection_provider',
            'created_at',
        ]
