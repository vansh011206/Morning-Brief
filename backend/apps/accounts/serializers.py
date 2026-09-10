import re
import pytz
from rest_framework import serializers
from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'id',
            'timezone',
            'digest_time',
            'delivery_channel',
            'telegram_chat_id',
            'job_hunt_mode',
            'digest_enabled',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id',
            'email',
            'username',
            'name',
            'first_name',
            'last_name',
            'phone',
            'profile',
            'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']

    def get_name(self, obj):
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or obj.username or obj.email


class RegisterSerializer(serializers.Serializer):
    """
    Serializer accepting name, email, and password for streamlined registration.
    """
    name = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def validate(self, attrs):
        if 'password_confirm' in attrs and attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        name = validated_data.get('name', '').strip()
        email = validated_data['email']
        password = validated_data['password']

        first_name = name
        last_name = ''
        if ' ' in name:
            parts = name.split(' ', 1)
            first_name = parts[0]
            last_name = parts[1]

        username = email.split('@')[0]
        base_username = username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        return user


class UserPreferencesSerializer(serializers.ModelSerializer):
    """
    Serializer for updating UserProfile preferences with strict timezone & time format validation.
    """
    name = serializers.CharField(source='user.first_name', required=False, allow_blank=True)

    class Meta:
        model = UserProfile
        fields = [
            'name',
            'timezone',
            'digest_time',
            'delivery_channel',
            'telegram_chat_id',
            'job_hunt_mode',
            'digest_enabled',
            'completed_at',
        ]

    def validate_timezone(self, value):
        if not value:
            return value
        if value not in pytz.all_timezones:
            raise serializers.ValidationError(
                f"Invalid timezone '{value}'. Must be a valid IANA timezone (e.g. 'Asia/Kolkata', 'America/New_York')."
            )
        return value

    def validate_digest_time(self, value):
        # Value can be a time object or string
        val_str = str(value)
        # Check standard HH:MM or HH:MM:SS format
        if not re.match(r'^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$', val_str):
            raise serializers.ValidationError(
                f"Invalid digest_time format '{val_str}'. Must be in 24-hour HH:MM format (e.g. 07:00)."
            )
        return value

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        name = user_data.get('first_name')
        if name is not None:
            user = instance.user
            user.first_name = name
            user.save(update_fields=['first_name'])

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()
        return instance
