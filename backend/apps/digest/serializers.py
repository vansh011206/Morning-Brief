from rest_framework import serializers
from .models import Digest, DigestItem


class DigestItemSerializer(serializers.ModelSerializer):
    section_display = serializers.CharField(source='get_section_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    source_url = serializers.SerializerMethodField()
    source_name = serializers.SerializerMethodField()
    author = serializers.SerializerMethodField()
    received_at = serializers.SerializerMethodField()

    class Meta:
        model = DigestItem
        fields = [
            'id',
            'digest',
            'raw_item',
            'section',
            'section_display',
            'rank',
            'summary',
            'priority',
            'priority_display',
            'ai_reason',
            'source_title',
            'source_url',
            'source_name',
            'author',
            'received_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_source_url(self, obj) -> str:
        if obj.raw_item and obj.raw_item.source_url:
            return obj.raw_item.source_url
        return ''

    def get_source_name(self, obj) -> str:
        if obj.raw_item and obj.raw_item.connection:
            return obj.raw_item.connection.display_name
        return 'News Feed'

    def get_author(self, obj) -> str:
        if obj.raw_item and obj.raw_item.author:
            return obj.raw_item.author
        return ''

    def get_received_at(self, obj):
        if obj.raw_item and obj.raw_item.received_at:
            return obj.raw_item.received_at.isoformat()
        return obj.created_at.isoformat()


class DigestSerializer(serializers.ModelSerializer):
    items = DigestItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Digest
        fields = [
            'id',
            'digest_date',
            'status',
            'status_display',
            'item_count',
            'important_count',
            'llm_cost_cents',
            'delivered_at',
            'items',
            'sections',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_sections(self, obj):
        """
        Groups items into sections for seamless frontend rendering.
        """
        all_items = obj.items.all()
        section_titles = dict(DigestItem.Section.choices)

        grouped = {}
        for section_key, title in section_titles.items():
            matching_items = [item for item in all_items if item.section == section_key]
            if matching_items:
                serialized = DigestItemSerializer(matching_items, many=True).data
                grouped[section_key] = {
                    'key': section_key,
                    'title': title,
                    'count': len(serialized),
                    'items': serialized,
                }
        return grouped
