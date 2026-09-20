"""
Django settings for MorningBrief project.
"""

from datetime import timedelta
import os
from pathlib import Path
import environ

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize environment variables
env = environ.Env(
    DEBUG=(bool, True),
    SECRET_KEY=(str, 'django-insecure-morningbrief-dev-key-change-in-production'),
    ALLOWED_HOSTS=(list, ['localhost', '127.0.0.1', '[::1]', 'testserver', '.onrender.com', 'morning-brief-1t5b.onrender.com']),
    CORS_ALLOWED_ORIGINS=(list, [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'https://morning-brief-sepia.vercel.app',
    ]),
    CSRF_TRUSTED_ORIGINS=(list, [
        'https://morning-brief-sepia.vercel.app',
        'https://morning-brief-1t5b.onrender.com',
        'http://localhost:5173',
        'http://localhost:3000',
    ]),
)

# Read .env file if present
environ.Env.read_env(os.path.join(BASE_DIR.parent, '.env'))
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG')
ALLOWED_HOSTS = env('ALLOWED_HOSTS')

# Application definition
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'django_celery_beat',

    # Local apps
    'apps.accounts.apps.AccountsConfig',
    'apps.connections.apps.ConnectionsConfig',
    'apps.ingestor.apps.IngestorConfig',
    'apps.digest.apps.DigestConfig',
    'apps.delivery.apps.DeliveryConfig',
    'apps.feedback.apps.FeedbackConfig',
    'apps.llm.apps.LlmConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Database
# Default to SQLite for local development if PostgreSQL is not specified
DATABASES = {
    'default': env.db(
        'DATABASE_URL',
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}'
    )
}

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = env('TIMEZONE', default='Asia/Kolkata')
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/min',
        'user': '1000/min',
        'login': '5/min',
        'auth': '5/min',
        'feedback': '20/min',
        'generate_now': '3/hour',
    },
}

# SimpleJWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': env('JWT_SECRET_KEY', default=SECRET_KEY),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# DRF Spectacular OpenAPI Schema
SPECTACULAR_SETTINGS = {
    'TITLE': 'MorningBrief API',
    'DESCRIPTION': 'Personal AI morning-briefing web app API for ranking Gmail, GitHub and other daily notifications.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# CORS & CSRF Settings
CORS_ALLOWED_ORIGINS = env('CORS_ALLOWED_ORIGINS')
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env('CSRF_TRUSTED_ORIGINS')

# Celery & Redis Settings
REDIS_URL = env('REDIS_URL', default='redis://127.0.0.1:6379/0')
CELERY_BROKER_URL = env('CELERY_BROKER_URL', default=REDIS_URL)
CELERY_RESULT_BACKEND = env('CELERY_RESULT_BACKEND', default=REDIS_URL)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_ALWAYS_EAGER = env.bool('CELERY_TASK_ALWAYS_EAGER', default=True)
CELERY_TASK_EAGER_PROPAGATES = True


# LLM Configuration
LLM_PROVIDER = env('LLM_PROVIDER', default='openai')
OPENAI_API_KEY = env('OPENAI_API_KEY', default='')
OPENAI_BASE_URL = env('OPENAI_BASE_URL', default='')
LLM_MODEL = env('LLM_MODEL', default='gpt-4o-mini')
LLM_MAX_TOKENS = env.int('LLM_MAX_TOKENS', default=1500)

# Email & Delivery Configuration
EMAIL_BACKEND = env('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = env('DEFAULT_FROM_EMAIL', default='MorningBrief <briefings@morningbrief.dev>')
EMAIL_HOST = env('EMAIL_HOST', default='smtp.resend.com')
EMAIL_PORT = env.int('EMAIL_PORT', default=587)
EMAIL_USE_TLS = env.bool('EMAIL_USE_TLS', default=True)
EMAIL_HOST_USER = env('EMAIL_HOST_USER', default='resend')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD', default='')
RESEND_API_KEY = env('RESEND_API_KEY', default='')

# Frontend URL for links in emails
FRONTEND_URL = env('FRONTEND_URL', default='http://localhost:5173')

# Cryptographic Encryption Key for storing sensitive tokens (Fernet)
# Key can be any 32-byte urlsafe base64 string or passphrase (derived via SHA-256)
ENCRYPTION_KEY = env('ENCRYPTION_KEY', default=env('FERNET_KEY', default=SECRET_KEY))

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = env('TELEGRAM_BOT_TOKEN', default=env('TELEGRAM_TOKEN', default=''))
TELEGRAM_BOT_USERNAME = env('TELEGRAM_BOT_USERNAME', default='MorningBriefBot')

# Google OAuth & Gmail Configuration
GOOGLE_CLIENT_ID = env('GOOGLE_CLIENT_ID', default='')
GOOGLE_CLIENT_SECRET = env('GOOGLE_CLIENT_SECRET', default='')
GOOGLE_REDIRECT_URI = env('GOOGLE_REDIRECT_URI', default='http://localhost:8000/api/v1/connections/gmail/callback/')
GOOGLE_CALENDAR_REDIRECT_URI = env('GOOGLE_CALENDAR_REDIRECT_URI', default='http://localhost:8000/api/v1/connections/calendar/callback/')
GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
]

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = env('GITHUB_CLIENT_ID', default='')
GITHUB_CLIENT_SECRET = env('GITHUB_CLIENT_SECRET', default='')
GITHUB_REDIRECT_URI = env('GITHUB_REDIRECT_URI', default='http://localhost:8000/api/v1/connections/github/callback/')
GITHUB_SCOPES = 'repo,notifications,read:user'

