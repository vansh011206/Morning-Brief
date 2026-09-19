import pytz
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Digest
from .serializers import DigestSerializer
from .tasks import build_digest



from rest_framework.throttling import UserRateThrottle


class GenerateNowRateThrottle(UserRateThrottle):
    scope = 'generate_now'


def get_user_today_date(user):
    tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata') if hasattr(user, 'profile') else 'Asia/Kolkata'
    try:
        user_tz = pytz.timezone(tz_name)
    except Exception:
        user_tz = pytz.timezone('Asia/Kolkata')
    return timezone.now().astimezone(user_tz).date()


class GenerateNowView(APIView):
    """
    POST /api/v1/digests/generate-now/
    On-demand briefing compilation for current user, respecting timezone date.
    Executes summarization pipeline immediately. If ?deliver=1 is passed,
    immediately dispatches email delivery.
    """
    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = (GenerateNowRateThrottle,)

    def post(self, request):
        digest_date = get_user_today_date(request.user)
        result = build_digest(request.user.id, digest_date.isoformat())

        if result.get('status') == 'error':
            return Response(result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        digest = Digest.objects.prefetch_related(
            'items__raw_item__connection'
        ).get(user=request.user, digest_date=digest_date)

        # Check if delivery was requested via query param or post body
        should_deliver = (
            request.query_params.get('deliver') in ('1', 'true', 'True')
            or request.data.get('deliver') in (True, '1', 'true')
        )
        if should_deliver:
            from apps.delivery.tasks import deliver_digest
            deliver_digest(digest.id)
            digest.refresh_from_db()

        return Response(DigestSerializer(digest).data, status=status.HTTP_201_CREATED)



class TodayDigestView(APIView):
    """
    GET /api/v1/digests/today/
    Retrieve today's digest for user; builds one if none exists yet.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        digest_date = get_user_today_date(request.user)
        digest = Digest.objects.filter(
            user=request.user,
            digest_date=digest_date
        ).prefetch_related('items__raw_item__connection').first()

        if not digest:
            # Build on-demand if no digest exists for today
            build_digest(request.user.id, digest_date.isoformat())
            digest = Digest.objects.filter(
                user=request.user,
                digest_date=digest_date
            ).prefetch_related('items__raw_item__connection').first()

        if not digest:
            return Response(
                {"error": "No digest available for today"},
                status=status.HTTP_404_NOT_FOUND
            )

        return Response(DigestSerializer(digest).data)


class DigestArchivePagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50


class DigestListView(generics.ListAPIView):
    """
    List user daily digests with pagination for archive browsing.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DigestSerializer
    pagination_class = DigestArchivePagination

    def get_queryset(self):
        return Digest.objects.filter(user=self.request.user).prefetch_related(
            'items__raw_item__connection'
        ).order_by('-digest_date')



class DigestDetailView(generics.RetrieveAPIView):
    """
    Retrieve specific daily digest details.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = DigestSerializer

    def get_queryset(self):
        return Digest.objects.filter(user=self.request.user).prefetch_related(
            'items__raw_item__connection'
        )
        from apps.ingestor.models import RawItem

        try:
            digest = Digest.objects.get(pk=pk, user=request.user)
        except Digest.DoesNotExist:
            return Response({'error': 'Digest not found'}, status=status.HTTP_404_NOT_FOUND)

        skipped_spam = digest.meta.get('skipped_spam', [])
        item_ids = [s.get('item_id') for s in skipped_spam if s.get('item_id')]

        restored_count = 0
        if item_ids:
            restored_count = RawItem.objects.filter(
                id__in=item_ids,
                user=request.user
            ).update(is_spam=False)

        # Clear skipped spam from digest meta
        digest.meta['skipped_spam'] = []
        digest.meta['skipped_count'] = 0
        digest.save(update_fields=['meta'])

        return Response({
            'status': 'restored',
            'restored_count': restored_count,
            'message': f'Restored {restored_count} newsletters. They will be considered on the next digest build.',
        }, status=status.HTTP_200_OK)

