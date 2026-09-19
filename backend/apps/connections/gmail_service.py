import json
import logging
import hashlib
from datetime import timedelta
import requests
from django.conf import settings
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from apps.connections.models import Connection
from apps.connections.crypto import encrypt_token, decrypt_token
from apps.ingestor.models import RawItem

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GMAIL_MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"

GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
]

SPAM_KEYWORDS = [
    'unsubscribe', 'viagra', 'casino', 'lottery', 'winner', 'crypto giveaway',
    'click here to claim', 'wire transfer', 'nigerian prince', 'act now'
]


def generate_gmail_state(user_id: int) -> str:
    """Generates a cryptographically signed state token valid for 10 minutes (600s)."""
    signer = TimestampSigner()
    return signer.sign(f"gmail_oauth:{user_id}")


def verify_gmail_state(state: str) -> int:
    """Verifies the state token and returns the user_id, or raises ValueError."""
    signer = TimestampSigner()
    try:
        unsigned = signer.unsign(state, max_age=600)
    except (BadSignature, SignatureExpired) as e:
        raise ValueError(f"Invalid or expired OAuth state: {e}")

    if not unsigned.startswith("gmail_oauth:"):
        raise ValueError("Invalid OAuth state prefix")

    try:
        user_id = int(unsigned.split(":", 1)[1])
        return user_id
    except (IndexError, ValueError):
        raise ValueError("Malformed OAuth state content")


def get_gmail_auth_url(user_id: int) -> str:
    """Constructs the Google OAuth consent URL with signed state."""
    state = generate_gmail_state(user_id)
    scope_str = " ".join(getattr(settings, 'GMAIL_SCOPES', GMAIL_SCOPES))
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    redirect_uri = getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/v1/connections/gmail/callback/')

    params = {
        'client_id': client_id,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': scope_str,
        'access_type': 'offline',
        'prompt': 'consent',
        'state': state,
    }
    encoded = requests.compat.urlencode(params)
    return f"{GOOGLE_AUTH_URL}?{encoded}"


def exchange_code_for_tokens(code: str) -> dict:
    """Exchanges an authorization code for access and refresh tokens."""
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')
    redirect_uri = getattr(settings, 'GOOGLE_REDIRECT_URI', 'http://localhost:8000/api/v1/connections/gmail/callback/')

    payload = {
        'code': code,
        'client_id': client_id,
        'client_secret': client_secret,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }
    resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=10)
    resp.raise_for_status()
    token_data = resp.json()

    # Fetch user's profile email
    email = ''
    access_token = token_data.get('access_token')
    if access_token:
        try:
            info_resp = requests.get(
                GOOGLE_USERINFO_URL,
                headers={'Authorization': f'Bearer {access_token}'},
                timeout=10
            )
            if info_resp.status_code == 200:
                email = info_resp.json().get('email', '')
        except Exception as e:
            logger.warning(f"Failed to fetch user email during Gmail OAuth: {e}")

    token_data['email'] = email
    return token_data


def refresh_access_token(refresh_token: str) -> str:
    """Refreshes access token using refresh_token."""
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')

    payload = {
        'refresh_token': refresh_token,
        'client_id': client_id,
        'client_secret': client_secret,
        'grant_type': 'refresh_token',
    }
    resp = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data.get('access_token', '')


def get_gmail_credentials(connection: Connection) -> dict:
    """Decrypts and returns credentials dict for a Gmail connection."""
    if not connection.encrypted_token:
        return {}
    decrypted_json = decrypt_token(connection.encrypted_token)
    return json.loads(decrypted_json)


def save_gmail_credentials(connection: Connection, token_dict: dict):
    """Encrypts and stores credentials dict onto Connection model."""
    serialized = json.dumps(token_dict)
    connection.encrypted_token = encrypt_token(serialized)
    connection.save(update_fields=['encrypted_token', 'updated_at'])


def check_is_spam(subject: str, snippet: str, from_addr: str) -> bool:
    """Pre-pass rule to identify obvious spam / marketing noise."""
    content = f"{subject} {snippet}".lower()
    return any(kw in content for kw in SPAM_KEYWORDS)


def fetch_gmail_messages(connection_id: int) -> dict:
    """
    Ingests messages from Gmail for a given connection.
    Dedupes by external_id (message id) and dedup_hash.
    """
    try:
        connection = Connection.objects.select_related('user').get(pk=connection_id)
    except Connection.DoesNotExist:
        return {'status': 'error', 'error': 'Connection not found'}

    creds = get_gmail_credentials(connection)
    access_token = creds.get('access_token')
    refresh_tok = creds.get('refresh_token')

    if not access_token and not refresh_tok:
        connection.status = Connection.Status.ERROR
        connection.last_error = 'No OAuth tokens stored'
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': 'No OAuth tokens stored'}

    # Ensure valid access token
    headers = {'Authorization': f'Bearer {access_token}'}
    list_url = f"{GMAIL_MESSAGES_URL}?q=label:INBOX&maxResults=100"
    resp = requests.get(list_url, headers=headers, timeout=10)

    if resp.status_code == 401 and refresh_tok:
        # Refresh access token
        try:
            new_access_token = refresh_access_token(refresh_tok)
            creds['access_token'] = new_access_token
            save_gmail_credentials(connection, creds)
            headers = {'Authorization': f'Bearer {new_access_token}'}
            resp = requests.get(list_url, headers=headers, timeout=10)
        except Exception as e:
            connection.status = Connection.Status.ERROR
            connection.last_error = f"Token refresh failed: {e}"
            connection.save(update_fields=['status', 'last_error', 'updated_at'])
            return {'status': 'error', 'error': f"Token refresh failed: {e}"}

    if resp.status_code != 200:
        connection.status = Connection.Status.ERROR
        connection.last_error = f"Gmail API error: {resp.status_code} {resp.text}"
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': connection.last_error}

    messages_data = resp.json().get('messages', [])
    created_count = 0
    existing_count = 0

    for m in messages_data:
        msg_id = m.get('id')
        if not msg_id:
            continue

        dedup_hash = hashlib.sha256(f"gmail:{connection.id}:{msg_id}".encode('utf-8')).hexdigest()

        if RawItem.objects.filter(dedup_hash=dedup_hash).exists():
            existing_count += 1
            continue

        # Fetch message detail
        msg_resp = requests.get(f"{GMAIL_MESSAGES_URL}/{msg_id}", headers=headers, timeout=10)
        if msg_resp.status_code != 200:
            continue

        detail = msg_resp.json()
        snippet = detail.get('snippet', '')
        payload = detail.get('payload', {})
        headers_list = payload.get('headers', [])

        header_dict = {h.get('name', '').lower(): h.get('value', '') for h in headers_list}
        subject = header_dict.get('subject', '(No Subject)')
        from_header = header_dict.get('from', '')
        date_header = header_dict.get('date', '')

        received_at = timezone.now()
        if date_header:
            try:
                from email.utils import parsedate_to_datetime
                received_at = parsedate_to_datetime(date_header)
            except Exception:
                received_at = timezone.now()

        is_spam = check_is_spam(subject, snippet, from_header)

        RawItem.objects.create(
            user=connection.user,
            connection=connection,
            external_id=msg_id,
            type=RawItem.ItemType.EMAIL,
            title=subject[:512],
            body_snippet=snippet[:500],
            author=from_header[:255],
            source_url=f"https://mail.google.com/mail/u/0/#inbox/{msg_id}",
            received_at=received_at,
            is_spam=is_spam,
            dedup_hash=dedup_hash,
        )
        created_count += 1

    connection.status = Connection.Status.ACTIVE
    connection.last_sync_at = timezone.now()
    connection.last_error = ''
    connection.save(update_fields=['status', 'last_sync_at', 'last_error', 'updated_at'])

    return {
        'status': 'success',
        'created_count': created_count,
        'existing_count': existing_count,
    }
