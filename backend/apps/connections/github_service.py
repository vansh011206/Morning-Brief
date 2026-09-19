"""
GitHub OAuth service — mirrors gmail_service.py architecture.

Handles:
  - OAuth consent URL generation with signed state
  - Authorization-code-for-token exchange
  - Fernet-encrypted token storage
  - Notification & PR ingestion into RawItem
"""

import json
import logging
import hashlib
import requests
from django.conf import settings
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.utils import timezone
from apps.connections.models import Connection
from apps.connections.crypto import encrypt_token, decrypt_token
from apps.ingestor.models import RawItem

logger = logging.getLogger(__name__)

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_API_BASE = "https://api.github.com"


# ---------------------------------------------------------------------------
# State token helpers (TimestampSigner, 10-minute validity)
# ---------------------------------------------------------------------------

def generate_github_state(user_id: int) -> str:
    """Generates a cryptographically signed state token valid for 10 minutes."""
    signer = TimestampSigner()
    return signer.sign(f"github_oauth:{user_id}")


def verify_github_state(state: str) -> int:
    """Verifies the state token and returns the user_id, or raises ValueError."""
    signer = TimestampSigner()
    try:
        unsigned = signer.unsign(state, max_age=600)
    except (BadSignature, SignatureExpired) as e:
        raise ValueError(f"Invalid or expired OAuth state: {e}")

    if not unsigned.startswith("github_oauth:"):
        raise ValueError("Invalid OAuth state prefix")

    try:
        user_id = int(unsigned.split(":", 1)[1])
        return user_id
    except (IndexError, ValueError):
        raise ValueError("Malformed OAuth state content")


# ---------------------------------------------------------------------------
# OAuth URL + token exchange
# ---------------------------------------------------------------------------

def get_github_auth_url(user_id: int) -> str:
    """Constructs the GitHub OAuth consent URL with signed state."""
    state = generate_github_state(user_id)
    client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
    redirect_uri = getattr(settings, 'GITHUB_REDIRECT_URI',
                           'http://localhost:8000/api/v1/connections/github/callback/')
    scope = getattr(settings, 'GITHUB_SCOPES', 'repo,notifications,read:user')

    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'scope': scope,
        'state': state,
    }
    encoded = requests.compat.urlencode(params)
    return f"{GITHUB_AUTH_URL}?{encoded}"


def exchange_code_for_token(code: str) -> dict:
    """Exchanges an authorization code for a GitHub access token + user info."""
    client_id = getattr(settings, 'GITHUB_CLIENT_ID', '')
    client_secret = getattr(settings, 'GITHUB_CLIENT_SECRET', '')
    redirect_uri = getattr(settings, 'GITHUB_REDIRECT_URI',
                           'http://localhost:8000/api/v1/connections/github/callback/')

    payload = {
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri,
    }
    resp = requests.post(
        GITHUB_TOKEN_URL,
        data=payload,
        headers={'Accept': 'application/json'},
        timeout=10,
    )
    resp.raise_for_status()
    token_data = resp.json()

    access_token = token_data.get('access_token', '')

    # Fetch authenticated user profile
    username = ''
    avatar_url = ''
    if access_token:
        try:
            user_resp = requests.get(
                f"{GITHUB_API_BASE}/user",
                headers={
                    'Authorization': f'token {access_token}',
                    'Accept': 'application/vnd.github+json',
                },
                timeout=10,
            )
            if user_resp.status_code == 200:
                user_data = user_resp.json()
                username = user_data.get('login', '')
                avatar_url = user_data.get('avatar_url', '')
        except Exception as e:
            logger.warning(f"Failed to fetch GitHub user profile: {e}")

    token_data['username'] = username
    token_data['avatar_url'] = avatar_url
    return token_data


# ---------------------------------------------------------------------------
# Credential storage (Fernet encryption)
# ---------------------------------------------------------------------------

def get_github_credentials(connection: Connection) -> dict:
    """Decrypts and returns credentials dict for a GitHub connection."""
    if not connection.encrypted_token:
        return {}
    decrypted_json = decrypt_token(connection.encrypted_token)
    return json.loads(decrypted_json)


def save_github_credentials(connection: Connection, token_dict: dict):
    """Encrypts and stores credentials dict onto Connection model."""
    serialized = json.dumps(token_dict)
    connection.encrypted_token = encrypt_token(serialized)
    connection.save(update_fields=['encrypted_token', 'updated_at'])


# ---------------------------------------------------------------------------
# Ingestion: fetch GitHub notifications & assigned PRs
# ---------------------------------------------------------------------------

def fetch_github_notifications(connection_id: int) -> dict:
    """
    Ingests notifications from GitHub for a given connection.
    Dedupes by external_id (notification id) and dedup_hash.
    Creates RawItem with type=PR, section_hint='actions'.
    """
    try:
        connection = Connection.objects.select_related('user').get(pk=connection_id)
    except Connection.DoesNotExist:
        return {'status': 'error', 'error': 'Connection not found'}

    creds = get_github_credentials(connection)
    access_token = creds.get('access_token', '')

    if not access_token:
        connection.status = Connection.Status.ERROR
        connection.last_error = 'No GitHub access token stored'
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': 'No GitHub access token stored'}

    headers = {
        'Authorization': f'token {access_token}',
        'Accept': 'application/vnd.github+json',
    }

    # --- Fetch notifications ---
    try:
        notif_resp = requests.get(
            f"{GITHUB_API_BASE}/notifications",
            headers=headers,
            params={'all': 'false', 'per_page': '50'},
            timeout=15,
        )
    except Exception as e:
        connection.status = Connection.Status.ERROR
        connection.last_error = f"GitHub API request failed: {e}"
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': str(e)}

    if notif_resp.status_code == 401:
        connection.status = Connection.Status.ERROR
        connection.last_error = 'GitHub token expired or revoked'
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': 'Token expired or revoked'}

    if notif_resp.status_code != 200:
        connection.status = Connection.Status.ERROR
        connection.last_error = f"GitHub API error: {notif_resp.status_code} {notif_resp.text[:200]}"
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': connection.last_error}

    notifications = notif_resp.json()
    created_count = 0
    existing_count = 0

    for notif in notifications:
        notif_id = str(notif.get('id', ''))
        if not notif_id:
            continue

        dedup_hash = hashlib.sha256(
            f"github:{connection.id}:{notif_id}".encode('utf-8')
        ).hexdigest()

        if RawItem.objects.filter(dedup_hash=dedup_hash).exists():
            existing_count += 1
            continue

        subject = notif.get('subject', {})
        reason = notif.get('reason', '')
        repo = notif.get('repository', {})
        repo_full_name = repo.get('full_name', '')

        title = subject.get('title', '(No title)')
        notif_type = subject.get('type', 'Unknown')  # PullRequest, Issue, etc.
        subject_url = subject.get('url', '')

        # Build a human-readable source URL
        html_url = ''
        if subject_url:
            # Convert API URL to browser URL
            html_url = (
                subject_url
                .replace('api.github.com/repos/', 'github.com/')
                .replace('/pulls/', '/pull/')
            )

        # Build snippet from reason + type
        reason_map = {
            'review_requested': 'Review requested',
            'assign': 'Assigned to you',
            'mention': 'You were mentioned',
            'ci_activity': 'CI activity',
            'author': 'You authored this',
            'comment': 'New comment',
            'state_change': 'State changed',
            'subscribed': 'Subscribed notification',
        }
        body_snippet = f"[{notif_type}] {reason_map.get(reason, reason)} in {repo_full_name}"

        # Parse updated_at for received_at
        updated_at_str = notif.get('updated_at', '')
        received_at = timezone.now()
        if updated_at_str:
            try:
                from django.utils.dateparse import parse_datetime
                parsed = parse_datetime(updated_at_str)
                if parsed:
                    received_at = parsed
            except Exception:
                pass

        RawItem.objects.create(
            user=connection.user,
            connection=connection,
            external_id=notif_id,
            type=RawItem.ItemType.PR,
            title=title[:512],
            body_snippet=body_snippet[:500],
            author=repo_full_name[:255],
            source_url=html_url[:1024] if html_url else '',
            received_at=received_at,
            section_hint='actions',
            dedup_hash=dedup_hash,
        )
        created_count += 1

    # Update connection success state
    connection.status = Connection.Status.ACTIVE
    connection.last_sync_at = timezone.now()
    connection.last_error = ''
    connection.save(update_fields=['status', 'last_sync_at', 'last_error', 'updated_at'])

    return {
        'status': 'success',
        'created_count': created_count,
        'existing_count': existing_count,
    }
