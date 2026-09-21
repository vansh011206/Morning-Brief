import pytz
from django.conf import settings
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


class CronDispatchView(APIView):
    """
    GET /api/v1/delivery/cron-dispatch/
    POST /api/v1/delivery/cron-dispatch/

    Automated Keep-Alive & Task Dispatcher endpoint designed for Render Free Tier.
    1. Keeps Render web service awake 24/7 (resets the 15-minute inactivity spin-down timer).
    2. Runs scheduled digest checks to deliver briefings on time via Email & Telegram.
    3. Triggers RSS feed ingestion to keep raw items fresh.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        return self._handle_dispatch(request)

    def post(self, request):
        return self._handle_dispatch(request)

    def _handle_dispatch(self, request):
        now_ts = timezone.now().isoformat()
        cron_secret = getattr(settings, 'CRON_SECRET', 'morningbrief_cron_2025')

        # Check query param, header, or body key
        provided_key = (
            request.query_params.get('key')
            or request.headers.get('X-Cron-Key')
            or (request.data.get('key') if isinstance(getattr(request, 'data', None), dict) else None)
        )

        is_authorized = (
            request.user.is_authenticated
            or (provided_key and provided_key in [cron_secret, getattr(settings, 'SECRET_KEY', None)])
        )

        # Unauthenticated / unkeyed ping:
        # Return 200 OK immediately. This resets Render's 15-minute sleep timer
        # keeping the container active without executing heavy LLM/delivery tasks.
        if not is_authorized:
            return Response({
                "status": "awake",
                "service": "MorningBrief API",
                "timestamp": now_ts,
                "keep_alive": "warm",
                "message": "Render keep-alive ping acknowledged. Backend is warm and active.",
            }, status=status.HTTP_200_OK)

        # Authorized cron trigger: Execute RSS ingestion and scheduled digest delivery
        from apps.ingestor.tasks import fetch_all_active_rss_feeds
        from .tasks import dispatch_scheduled_digests

        fetch_rss = request.query_params.get('rss', 'true').lower() in ['true', '1', 'yes']
        rss_result = {}
        if fetch_rss:
            try:
                rss_result = fetch_all_active_rss_feeds()
            except Exception as e:
                rss_result = {"status": "error", "error": str(e)}

        force_user_id = request.query_params.get('force_user_id')
        try:
            window_minutes = int(request.query_params.get('window', 60))
        except (ValueError, TypeError):
            window_minutes = 60

        dispatch_result = {}
        try:
            dispatch_result = dispatch_scheduled_digests(
                force_user_id=int(force_user_id) if force_user_id else None,
                window_minutes=window_minutes
            )
        except Exception as e:
            dispatch_result = {"status": "error", "error": str(e)}

        return Response({
            "status": "dispatched",
            "service": "MorningBrief API",
            "timestamp": now_ts,
            "keep_alive": "warm",
            "rss_ingestion": rss_result,
            "scheduled_delivery": dispatch_result,
        }, status=status.HTTP_200_OK)

