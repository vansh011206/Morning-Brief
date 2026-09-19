from rest_framework import serializers, generics, permissions
from rest_framework.throttling import UserRateThrottle
from .models import ItemFeedback


class FeedbackRateThrottle(UserRateThrottle):
    scope = 'feedback'


class ItemFeedbackSerializer(serializers.ModelSerializer):
    feedback_display = serializers.CharField(source='get_feedback_type_display', read_only=True)

    class Meta:
        model = ItemFeedback
        fields = [
            'id',
            'digest_item',
            'feedback_type',
            'feedback_display',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class ItemFeedbackCreateView(generics.CreateAPIView):
    """
    Submit feedback on a ranked digest item.
    """
    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = (FeedbackRateThrottle,)
    serializer_class = ItemFeedbackSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
