from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import DailyDigest, DigestItem
from .serializers import DailyDigestSerializer, DigestItemSerializer


class DailyDigestListView(generics.ListAPIView):
    """
    List past digests (archive) for current authenticated user.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DailyDigestSerializer

    def get_queryset(self):
        return DailyDigest.objects.filter(user=self.request.user).prefetch_related('items')


class TodayDigestView(APIView):
    """
    Retrieve today's morning briefing for current user, initializing a default placeholder if none exists yet.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        today = timezone.localdate()
        digest, created = DailyDigest.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={
                'headline': 'Your Morning Intelligence Brief',
                'overview': 'Synthesizing updates across your connected channels for today.',
                'status': DailyDigest.Status.READY,
                'total_items_ranked': 0,
            }
        )
        serializer = DailyDigestSerializer(digest)
        return Response(serializer.data)


class DailyDigestDetailView(generics.RetrieveAPIView):
    """
    Retrieve specific daily digest by ID.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DailyDigestSerializer

    def get_queryset(self):
        return DailyDigest.objects.filter(user=self.request.user).prefetch_related('items')


class DigestItemToggleReadView(APIView):
    """
    Toggle read status on a specific digest item.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            item = DigestItem.objects.get(pk=pk, digest__user=request.user)
            item.is_read = not item.is_read
            item.save(update_fields=['is_read'])
            return Response({'id': item.id, 'is_read': item.is_read})
        except DigestItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)


class DigestItemToggleArchiveView(APIView):
    """
    Toggle archive status on a specific digest item.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            item = DigestItem.objects.get(pk=pk, digest__user=request.user)
            item.is_archived = not item.is_archived
            item.save(update_fields=['is_archived'])
            return Response({'id': item.id, 'is_archived': item.is_archived})
        except DigestItem.DoesNotExist:
            return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)


class TriggerDigestGenerationView(APIView):
    """
    Trigger AI digest compilation and ranking on-demand.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        today = timezone.localdate()
        digest, _ = DailyDigest.objects.get_or_create(
            user=request.user,
            date=today,
            defaults={'status': DailyDigest.Status.GENERATING}
        )
        digest.status = DailyDigest.Status.GENERATING
        digest.save(update_fields=['status'])
        # Background task trigger would hook into Celery task here
        return Response({
            'status': 'queued',
            'message': 'AI morning briefing compilation queued',
            'digest_id': digest.id
        })
