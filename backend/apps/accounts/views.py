from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import User, UserProfile
from .serializers import (
    UserSerializer,
    UserProfileSerializer,
    RegisterSerializer,
    UserPreferencesSerializer,
)


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'
    rate = '5/min'


class RegisterRateThrottle(AnonRateThrottle):
    scope = 'register'
    rate = '5/min'


class LoginView(TokenObtainPairView):
    """
    Authenticate with email/password and obtain JWT access & refresh tokens.
    Rate limited to 5 attempts per minute per IP address.
    """
    throttle_classes = [LoginRateThrottle]


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account with name, email, and password. Returns user object and JWT tokens.
    Rate limited to 5 registrations per minute per IP address.
    """
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]

    @extend_schema(
        summary="Register new user",
        description="Creates a user account, initializes profile preferences, and returns JWT tokens.",
        responses={201: UserSerializer}
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response({
            "user": UserSerializer(user).data,
            "tokens": {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    """
    Logout user by blacklisting the provided refresh token.
    """
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Logout & blacklist refresh token",
        request={"application/json": {"type": "object", "properties": {"refresh": {"type": "string"}}}},
        responses={200: OpenApiResponse(description="Successfully logged out")}
    )
    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required to logout."},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"status": "ok", "message": "Successfully logged out and token invalidated."})
        except TokenError as e:
            return Response(
                {"error": f"Invalid or expired token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class CurrentUserView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete currently authenticated user account.
    """
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user

    def delete(self, request, *args, **kwargs):
        user = self.get_object()
        user.delete()
        return Response(
            {"status": "deleted", "message": "Account and all associated briefing data deleted."},
            status=status.HTTP_204_NO_CONTENT
        )


class UserPreferencesView(APIView):
    """
    Update timezone, digest_time, delivery_channel, completed_at, and toggles for current user.
    Validates digest_time format (HH:MM) and timezone name against pytz.
    """
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="Update delivery preferences and onboarding completion",
        request=UserPreferencesSerializer,
        responses={200: UserSerializer}
    )
    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response(UserProfileSerializer(profile).data)

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserPreferencesSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        request.user.refresh_from_db()

        # Return refreshed UserSerializer with embedded profile
        return Response(UserSerializer(request.user).data)


class DeleteAccountView(APIView):
    """
    POST/DELETE /api/v1/auth/delete-account/
    GDPR-compliant transactional data wipe:
    Permanently deletes all RawItems, Connections, Digests, DigestItems,
    ItemFeedbacks, CategoryWeights, TokenUsages, and the User account.
    """
    permission_classes = (permissions.IsAuthenticated,)

    @extend_schema(
        summary="GDPR Account & Data Wipe",
        description="Permanently deletes all user accounts, connections, raw items, digests, feedback, and token usage.",
        responses={200: OpenApiResponse(description="All personal data wiped")}
    )
    def delete(self, request):
        from django.db import transaction
        from apps.ingestor.models import RawItem
        from apps.connections.models import Connection
        from apps.digest.models import Digest
        from apps.feedback.models import ItemFeedback, CategoryWeight
        from apps.llm.models import TokenUsage
        from apps.delivery.models import DeliveryLog

        user = request.user
        with transaction.atomic():
            RawItem.objects.filter(user=user).delete()
            Connection.objects.filter(user=user).delete()
            Digest.objects.filter(user=user).delete()
            ItemFeedback.objects.filter(user=user).delete()
            CategoryWeight.objects.filter(user=user).delete()
            TokenUsage.objects.filter(user=user).delete()
            DeliveryLog.objects.filter(digest__user=user).delete()
            user.delete()

        return Response(
            {"status": "deleted", "message": "All personal data, ingested items, and account records have been permanently wiped."},
            status=status.HTTP_200_OK
        )

    def post(self, request):
        return self.delete(request)
