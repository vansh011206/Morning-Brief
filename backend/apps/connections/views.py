import logging
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import Connection
from .serializers import ConnectionSerializer
from apps.ingestor.tasks import fetch_rss_feeds

logger = logging.getLogger(__name__)


class ConnectionListView(generics.ListCreateAPIView):
    """
    List user connected accounts or register a new connection (e.g. custom RSS feed).
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        return Connection.objects.filter(user=self.request.user).prefetch_related('raw_items')

    def perform_create(self, serializer):
        display_name = serializer.validated_data.get('display_name', '').strip()
        external_account = serializer.validated_data.get('external_account', '').strip()
        if not display_name:
            display_name = external_account

        connection = serializer.save(
            user=self.request.user,
            display_name=display_name
        )

        # Trigger immediate initial RSS fetch for fresh content
        if connection.provider == Connection.Provider.RSS and connection.is_active:
            try:
                fetch_rss_feeds(connection.id)
            except Exception as e:
                logger.warning(f"Initial sync failed for connection {connection.id}: {e}")


class ConnectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    Get connection details, update settings (e.g. is_active toggle), or disconnect (cascades raw items).
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ConnectionSerializer

    def get_queryset(self):
        return Connection.objects.filter(user=self.request.user).prefetch_related('raw_items')


class TriggerSyncView(APIView):
    """
    Trigger immediate ingestion sync for a given connection.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        try:
            connection = Connection.objects.get(pk=pk, user=request.user)
        except Connection.DoesNotExist:
            return Response(
                {"error": "Connection not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        if connection.provider == Connection.Provider.RSS:
            result = fetch_rss_feeds(connection.id)
        elif connection.provider == Connection.Provider.GITHUB:
            from .github_service import fetch_github_notifications
            result = fetch_github_notifications(connection.id)
        elif connection.provider == Connection.Provider.GMAIL:
            from .gmail_service import fetch_gmail_messages
            result = fetch_gmail_messages(connection.id)
        elif connection.provider == Connection.Provider.CALENDAR:
            from .calendar_service import fetch_calendar_events
            result = fetch_calendar_events(connection.id)
        else:
            return Response(
                {"error": f"Sync is not supported yet for provider '{connection.provider}'"},
                status=status.HTTP_400_BAD_REQUEST
            )

        connection.refresh_from_db()
        serialized = ConnectionSerializer(connection).data

        if result.get('status') == 'success':
            return Response({
                "status": "success",
                "message": f"Successfully synchronized '{connection.display_name}'.",
                "connection": serialized,
                "created_count": result.get('created_count', 0),
                "existing_count": result.get('existing_count', 0),
            })
        else:
            return Response({
                "status": "error",
                "message": f"Sync failed: {result.get('error', 'Unknown error')}",
                "connection": serialized,
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TelegramTokenView(APIView):
    """
    GET /api/v1/connections/telegram/token/
    Returns deep-link token and bot details for linking a Telegram account.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .telegram_service import generate_telegram_bind_token, TelegramService

        token = generate_telegram_bind_token(request.user.id)
        bot_username = TelegramService.get_bot_username()
        deep_link = TelegramService.get_deep_link_url(token)

        # Check existing connection
        tg_conn = Connection.objects.filter(
            user=request.user,
            provider=Connection.Provider.TELEGRAM,
            status=Connection.Status.ACTIVE,
            is_active=True
        ).first()

        chat_id = tg_conn.external_account if tg_conn else getattr(request.user.profile, 'telegram_chat_id', None)

        return Response({
            "token": token,
            "bot_username": bot_username,
            "deep_link": deep_link,
            "is_bound": bool(tg_conn and tg_conn.is_active),
            "chat_id": chat_id,
            "connection": ConnectionSerializer(tg_conn).data if tg_conn else None,
        })


class TelegramBindView(APIView):
    """
    POST /api/v1/connections/telegram/bind/
    Binds a chat_id to the user account using either a signed token or authenticated session.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from .telegram_service import verify_telegram_bind_token, TelegramService

        token = request.data.get('token', '').strip()
        chat_id = str(request.data.get('chat_id', '')).strip()

        if not chat_id:
            return Response(
                {"error": "chat_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        target_user = None
        if token:
            user_id = verify_telegram_bind_token(token)
            if user_id:
                try:
                    target_user = User.objects.get(pk=user_id)
                except User.DoesNotExist:
                    pass

        if not target_user and request.user and request.user.is_authenticated:
            target_user = request.user

        if not target_user:
            return Response(
                {"error": "Invalid or expired token, or unauthenticated request"},
                status=status.HTTP_400_BAD_REQUEST
            )

        connection = TelegramService.bind_chat_to_user(target_user, chat_id)

        return Response({
            "status": "active",
            "message": "Telegram account successfully linked.",
            "chat_id": chat_id,
            "connection": ConnectionSerializer(connection).data,
        }, status=status.HTTP_200_OK)


class TelegramWebhookView(APIView):
    """
    POST /api/v1/connections/telegram/webhook/
    Public webhook receiver for Telegram Bot updates.
    Handles /start <token> commands and inline rating button callbacks.
    """
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        from .telegram_service import TelegramService

        update_data = request.data
        result = TelegramService.handle_webhook_update(update_data)
        return Response({"ok": True, "result": result}, status=status.HTTP_200_OK)


class GmailAuthUrlView(APIView):
    """
    GET /api/v1/connections/gmail/auth-url/
    Returns Google OAuth authorization consent URL with a cryptographically signed state token.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .gmail_service import get_gmail_auth_url
        auth_url = get_gmail_auth_url(request.user.id)
        return Response({"auth_url": auth_url, "url": auth_url})


class GmailCallbackView(APIView):
    """
    GET /api/v1/connections/gmail/callback/
    Validates state, exchanges authorization code for tokens, encrypts & stores them on Connection.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.http import HttpResponseRedirect
        from django.conf import settings
        from .gmail_service import (
            verify_gmail_state,
            exchange_code_for_tokens,
            save_gmail_credentials,
        )

        state = request.query_params.get('state', '')
        code = request.query_params.get('code', '')

        if not state or not code:
            return Response(
                {"error": "state and code query parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id = verify_gmail_state(state)
        except ValueError as e:
            return Response(
                {"error": f"State validation failed: {e}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User associated with state not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            token_data = exchange_code_for_tokens(code)
        except Exception as e:
            logger.error(f"Gmail token exchange failed: {e}")
            return Response(
                {"error": f"Token exchange failed: {e}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        email = token_data.get('email', '')
        external_account = email or f"gmail_{user.id}"
        display_name = f"Gmail ({email})" if email else "Google Gmail"

        connection, _ = Connection.objects.get_or_create(
            user=user,
            provider=Connection.Provider.GMAIL,
            external_account=external_account,
            defaults={
                'display_name': display_name,
                'status': Connection.Status.ACTIVE,
                'is_active': True,
            }
        )
        connection.display_name = display_name
        connection.status = Connection.Status.ACTIVE
        connection.is_active = True
        save_gmail_credentials(connection, token_data)

        # Trigger async ingestion if celery available
        try:
            from .gmail_service import fetch_gmail_messages
            fetch_gmail_messages(connection.id)
        except Exception as e:
            logger.warning(f"Initial Gmail sync failed: {e}")

        # Redirect to frontend if web browser navigation, or return JSON
        accept_header = request.headers.get('Accept', '')
        if 'application/json' in accept_header or request.query_params.get('format') == 'json':
            return Response({
                "status": "active",
                "message": "Gmail successfully connected.",
                "connection": ConnectionSerializer(connection).data,
            })

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return HttpResponseRedirect(f"{frontend_url}/connections?connected=gmail")


class GitHubAuthUrlView(APIView):
    """
    GET /api/v1/connections/github/auth-url/
    Returns GitHub OAuth authorization consent URL with a cryptographically signed state token.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .github_service import get_github_auth_url
        auth_url = get_github_auth_url(request.user.id)
        return Response({"auth_url": auth_url, "url": auth_url})


class GitHubCallbackView(APIView):
    """
    GET /api/v1/connections/github/callback/
    Validates state, exchanges authorization code for token, encrypts & stores on Connection.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.http import HttpResponseRedirect
        from django.conf import settings
        from .github_service import (
            verify_github_state,
            exchange_code_for_token,
            save_github_credentials,
            fetch_github_notifications,
        )

        state = request.query_params.get('state', '')
        code = request.query_params.get('code', '')

        if not state or not code:
            return Response(
                {"error": "state and code query parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id = verify_github_state(state)
        except ValueError as e:
            return Response(
                {"error": f"State validation failed: {e}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User associated with state not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            token_data = exchange_code_for_token(code)
        except Exception as e:
            logger.error(f"GitHub token exchange failed: {e}")
            return Response(
                {"error": f"Token exchange failed: {e}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        username = token_data.get('username', '')
        avatar_url = token_data.get('avatar_url', '')
        external_account = username or f"github_{user.id}"
        display_name = f"GitHub (@{username})" if username else "GitHub"

        connection, _ = Connection.objects.get_or_create(
            user=user,
            provider=Connection.Provider.GITHUB,
            external_account=external_account,
            defaults={
                'display_name': display_name,
                'status': Connection.Status.ACTIVE,
                'is_active': True,
            }
        )
        connection.display_name = display_name
        connection.status = Connection.Status.ACTIVE
        connection.is_active = True
        if avatar_url:
            connection.avatar_url = avatar_url
        save_github_credentials(connection, token_data)
        connection.save(update_fields=['display_name', 'status', 'is_active', 'avatar_url', 'updated_at'])

        # Trigger initial ingestion
        try:
            fetch_github_notifications(connection.id)
        except Exception as e:
            logger.warning(f"Initial GitHub sync failed: {e}")

        # Redirect to frontend or return JSON
        accept_header = request.headers.get('Accept', '')
        if 'application/json' in accept_header or request.query_params.get('format') == 'json':
            return Response({
                "status": "active",
                "message": "GitHub successfully connected.",
                "connection": ConnectionSerializer(connection).data,
            })

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return HttpResponseRedirect(f"{frontend_url}/connections?connected=github")


class CalendarAuthUrlView(APIView):
    """
    GET /api/v1/connections/calendar/auth-url/
    Returns Google Calendar OAuth authorization consent URL with a cryptographically signed state token.
    """
    permission_classes = (permissions.IsAuthenticated,)

    def get(self, request):
        from .calendar_service import get_calendar_auth_url
        auth_url = get_calendar_auth_url(request.user.id)
        return Response({"auth_url": auth_url, "url": auth_url})


class CalendarCallbackView(APIView):
    """
    GET /api/v1/connections/calendar/callback/
    Validates state, exchanges authorization code for tokens, stores on Connection.
    """
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.http import HttpResponseRedirect
        from django.conf import settings
        from .calendar_service import (
            verify_calendar_state,
            exchange_calendar_code_for_tokens,
            save_calendar_credentials,
            fetch_calendar_events,
        )

        state = request.query_params.get('state', '')
        code = request.query_params.get('code', '')

        if not state or not code:
            return Response(
                {"error": "state and code query parameters are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user_id = verify_calendar_state(state)
        except ValueError as e:
            return Response(
                {"error": f"State validation failed: {e}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User associated with state not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            token_data = exchange_calendar_code_for_tokens(code)
        except Exception as e:
            logger.error(f"Google Calendar token exchange failed: {e}")
            return Response(
                {"error": f"Token exchange failed: {e}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        email = token_data.get('email', '')
        external_account = email or f"calendar_{user.id}"
        display_name = f"Google Calendar ({email})" if email else "Google Calendar"

        connection, _ = Connection.objects.get_or_create(
            user=user,
            provider=Connection.Provider.CALENDAR,
            external_account=external_account,
            defaults={
                'display_name': display_name,
                'status': Connection.Status.ACTIVE,
                'is_active': True,
            }
        )
        connection.display_name = display_name
        connection.status = Connection.Status.ACTIVE
        connection.is_active = True
        save_calendar_credentials(connection, token_data)
        connection.save(update_fields=['display_name', 'status', 'is_active', 'updated_at'])

        # Trigger initial events fetch
        try:
            fetch_calendar_events(connection.id)
        except Exception as e:
            logger.warning(f"Initial Calendar fetch failed: {e}")

        # Redirect to frontend or return JSON
        accept_header = request.headers.get('Accept', '')
        if 'application/json' in accept_header or request.query_params.get('format') == 'json':
            return Response({
                "status": "active",
                "message": "Google Calendar successfully connected.",
                "connection": ConnectionSerializer(connection).data,
            })

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return HttpResponseRedirect(f"{frontend_url}/connections?connected=calendar")




