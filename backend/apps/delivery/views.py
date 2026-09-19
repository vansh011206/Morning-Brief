import pytz
from django.utils import timezone
from rest_framework import serializers, generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.digest.models import Digest
from apps.digest.tasks import build_digest
from .models import DeliveryLog
from .services import DeliveryService


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


class SendTestBriefView(APIView):
    """
    POST /api/v1/delivery/test-brief/
    Dispatches a test morning briefing to the current user's email address.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        user = request.user
        tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata') if hasattr(user, 'profile') else 'Asia/Kolkata'
        try:
            user_tz = pytz.timezone(tz_name)
        except Exception:
            user_tz = pytz.timezone('Asia/Kolkata')

        digest_date = timezone.now().astimezone(user_tz).date()

        # Find or build today's digest
        digest = Digest.objects.filter(user=user, digest_date=digest_date).first()
        if not digest or digest.items.count() == 0:
            build_digest(user.id, digest_date.isoformat())
            digest = Digest.objects.filter(user=user, digest_date=digest_date).first()

        if not digest:
            return Response(
                {"error": "Unable to generate a briefing for test delivery."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Dispatch via unified DeliveryService (email, telegram, or both)
        results = DeliveryService.send(digest)

        any_success = any(r.get('success') for r in results.values()) if results else False
        if not any_success:
            err_details = "; ".join([f"{ch}: {r.get('result')}" for ch, r in results.items()])
            return Response(
                {"error": f"Brief dispatch failed: {err_details or 'No delivery channel configured.'}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        digest.status = Digest.Status.DELIVERED
        digest.delivered_at = timezone.now()
        digest.save(update_fields=['status', 'delivered_at', 'updated_at'])

        channels_sent = [ch for ch, r in results.items() if r.get('success')]
        return Response({
            "status": "sent",
            "channels": channels_sent,
            "recipient": user.email,
            "message": f"Test brief sent via {', '.join(channels_sent)} to {user.email}",
            "delivered_at": digest.delivered_at.isoformat(),
            "results": results,
        }, status=status.HTTP_200_OK)

