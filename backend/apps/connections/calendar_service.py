import json
import logging
import hashlib
from datetime import datetime, timedelta
import requests
from django.conf import settings
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.utils import timezone
from apps.connections.models import Connection
from apps.connections.crypto import encrypt_token, decrypt_token
from apps.ingestor.models import RawItem

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
]


def generate_calendar_state(user_id: int) -> str:
    signer = TimestampSigner()
    return signer.sign(f"calendar_oauth:{user_id}")


def verify_calendar_state(state: str) -> int:
    signer = TimestampSigner()
    try:
        unsigned = signer.unsign(state, max_age=600)
    except (BadSignature, SignatureExpired) as e:
        raise ValueError(f"Invalid or expired OAuth state: {e}")

    if not unsigned.startswith("calendar_oauth:"):
        raise ValueError("Invalid OAuth state prefix")

    try:
        return int(unsigned.split(":", 1)[1])
    except (IndexError, ValueError):
        raise ValueError("Malformed OAuth state content")


def get_calendar_auth_url(user_id: int) -> str:
    state = generate_calendar_state(user_id)
    scope_str = " ".join(CALENDAR_SCOPES)
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    redirect_uri = getattr(
        settings,
        'GOOGLE_CALENDAR_REDIRECT_URI',
        'http://localhost:8000/api/v1/connections/calendar/callback/'
    )

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


def exchange_calendar_code_for_tokens(code: str) -> dict:
    client_id = getattr(settings, 'GOOGLE_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_CLIENT_SECRET', '')
    redirect_uri = getattr(
        settings,
        'GOOGLE_CALENDAR_REDIRECT_URI',
        'http://localhost:8000/api/v1/connections/calendar/callback/'
    )

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
            logger.warning(f"Failed to fetch user email during Calendar OAuth: {e}")

    token_data['email'] = email
    return token_data


def refresh_calendar_access_token(refresh_token: str) -> str:
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


def get_calendar_credentials(connection: Connection) -> dict:
    if not connection.encrypted_token:
        return {}
    decrypted_json = decrypt_token(connection.encrypted_token)
    return json.loads(decrypted_json)


def save_calendar_credentials(connection: Connection, token_dict: dict):
    serialized = json.dumps(token_dict)
    connection.encrypted_token = encrypt_token(serialized)
    connection.save(update_fields=['encrypted_token', 'updated_at'])


def fetch_calendar_events(connection_id: int) -> dict:
    try:
        connection = Connection.objects.select_related('user').get(pk=connection_id)
    except Connection.DoesNotExist:
        return {'status': 'error', 'error': 'Connection not found'}

    creds = get_calendar_credentials(connection)
    access_token = creds.get('access_token')
    refresh_tok = creds.get('refresh_token')

    if not access_token and not refresh_tok:
        connection.status = Connection.Status.ERROR
        connection.last_error = 'No OAuth tokens stored'
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': 'No OAuth tokens stored'}

    headers = {'Authorization': f'Bearer {access_token}'}
    
    # Query events from start of today until end of tomorrow
    now = timezone.now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_tomorrow = (now + timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=0)
    
    params = {
        'timeMin': start_of_day.isoformat(),
        'timeMax': end_of_tomorrow.isoformat(),
        'singleEvents': 'true',
        'orderBy': 'startTime',
        'maxResults': 50,
    }

    resp = requests.get(GOOGLE_CALENDAR_EVENTS_URL, headers=headers, params=params, timeout=10)

    if resp.status_code == 401 and refresh_tok:
        try:
            new_access_token = refresh_calendar_access_token(refresh_tok)
            creds['access_token'] = new_access_token
            save_calendar_credentials(connection, creds)
            headers = {'Authorization': f'Bearer {new_access_token}'}
            resp = requests.get(GOOGLE_CALENDAR_EVENTS_URL, headers=headers, params=params, timeout=10)
        except Exception as e:
            connection.status = Connection.Status.ERROR
            connection.last_error = f"Token refresh failed: {e}"
            connection.save(update_fields=['status', 'last_error', 'updated_at'])
            return {'status': 'error', 'error': f"Token refresh failed: {e}"}

    if resp.status_code != 200:
        connection.status = Connection.Status.ERROR
        connection.last_error = f"Google Calendar API error: {resp.status_code} {resp.text}"
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {'status': 'error', 'error': connection.last_error}

    events = resp.json().get('items', [])
    created_count = 0
    existing_count = 0

    for ev in events:
        event_id = ev.get('id')
        summary = ev.get('summary', 'Untitled Event')
        description = ev.get('description', '')
        html_link = ev.get('htmlLink', 'https://calendar.google.com')
        
        start_obj = ev.get('start', {})
        start_time_str = start_obj.get('dateTime') or start_obj.get('date', '')
        
        dedup_hash = hashlib.sha256(f"calendar:{connection.id}:{event_id}".encode('utf-8')).hexdigest()

        if RawItem.objects.filter(dedup_hash=dedup_hash).exists():
            existing_count += 1
            continue

        meet_link = ev.get('hangoutLink', '')
        location = ev.get('location', '')
        attendees = [a.get('email', '') for a in ev.get('attendees', []) if a.get('email')]

        content_body = f"Event: {summary}\nStart: {start_time_str}\n"
        if location:
            content_body += f"Location: {location}\n"
        if meet_link:
            content_body += f"Meeting Link: {meet_link}\n"
        if attendees:
            content_body += f"Attendees: {', '.join(attendees[:5])}\n"
        if description:
            content_body += f"\nDescription:\n{description[:500]}"

        try:
            pub_date = datetime.fromisoformat(start_time_str.replace('Z', '+00:00')) if start_time_str else timezone.now()
        except Exception:
            pub_date = timezone.now()

        RawItem.objects.create(
            connection=connection,
            external_id=event_id,
            title=f"Calendar: {summary}",
            author=connection.display_name,
            content=content_body,
            url=meet_link or html_link,
            published_at=pub_date,
            section_hint='events',
            dedup_hash=dedup_hash,
            metadata={
                'event_id': event_id,
                'start_time': start_time_str,
                'meet_link': meet_link,
                'location': location,
            }
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
        'total_events': len(events),
    }
