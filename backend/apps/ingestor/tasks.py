import html
import re
import time
import hashlib
import logging
from datetime import datetime, timezone as dt_timezone
import requests
import feedparser
from celery import shared_task
from django.utils import timezone
from apps.connections.models import Connection
from .models import RawItem

logger = logging.getLogger(__name__)

USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 MorningBrief/1.0'


def clean_html_snippet(raw_html: str, max_chars: int = 1000) -> str:
    """Strip HTML tags and unescape entities for clean snippet text."""
    if not raw_html:
        return ''
    clean_text = re.sub(r'<[^>]+>', ' ', raw_html)
    clean_text = html.unescape(clean_text)
    clean_text = re.sub(r'\s+', ' ', clean_text).strip()
    if len(clean_text) > max_chars:
        return clean_text[:max_chars] + '...'
    return clean_text


def parse_entry_datetime(entry) -> datetime:
    """Parse feed entry published or updated timestamp to UTC datetime."""
    published_parsed = entry.get('published_parsed') or entry.get('updated_parsed')
    if published_parsed:
        try:
            timestamp = time.mktime(published_parsed)
            return datetime.fromtimestamp(timestamp, tz=dt_timezone.utc)
        except Exception:
            pass
    return timezone.now()


@shared_task(name='apps.ingestor.tasks.fetch_rss_feeds')
def fetch_rss_feeds(connection_id: int):
    """
    Fetch and parse RSS feed for a single Connection, normalizing entries to RawItem.
    Deduplicates using SHA-256 hash of (user_id + external_id/url).
    """
    try:
        connection = Connection.objects.select_related('user').get(pk=connection_id)
    except Connection.DoesNotExist:
        logger.error(f"[Ingestor] Connection {connection_id} not found.")
        return {'status': 'error', 'message': f'Connection {connection_id} not found'}

    feed_url = connection.external_account.strip()
    logger.info(f"[Ingestor] Fetching RSS feed for '{connection.display_name}' ({feed_url})")

    try:
        response = requests.get(
            feed_url,
            headers={'User-Agent': USER_AGENT},
            timeout=15
        )
        response.raise_for_status()

        feed = feedparser.parse(response.content)

        # Check if parsing was completely broken with no entries
        if feed.bozo and not feed.entries and feed.bozo_exception:
            raise ValueError(f"Feed parser error: {feed.bozo_exception}")

        created_count = 0
        existing_count = 0

        for entry in feed.entries:
            external_id = (
                entry.get('id')
                or entry.get('link')
                or entry.get('title')
                or ''
            ).strip()

            if not external_id:
                continue

            source_url = entry.get('link', '').strip() or feed_url
            title = clean_html_snippet(entry.get('title', 'Untitled'), max_chars=500)

            # Extract raw snippet/body
            raw_content = ''
            if entry.get('summary'):
                raw_content = entry.get('summary')
            elif entry.get('description'):
                raw_content = entry.get('description')
            elif entry.get('content') and len(entry.get('content')) > 0:
                raw_content = entry.get('content')[0].get('value', '')

            body_snippet = clean_html_snippet(raw_content, max_chars=1200)

            author = (
                entry.get('author')
                or (entry.get('author_detail', {}).get('name') if entry.get('author_detail') else '')
                or connection.display_name
            ).strip()[:255]

            received_at = parse_entry_datetime(entry)

            # Compute unique SHA256 dedup_hash for this user & entry
            raw_hash_source = f"{connection.user_id}:{connection.id}:{external_id}"
            dedup_hash = hashlib.sha256(raw_hash_source.encode('utf-8')).hexdigest()

            _, created = RawItem.objects.get_or_create(
                dedup_hash=dedup_hash,
                defaults={
                    'user': connection.user,
                    'connection': connection,
                    'external_id': external_id[:512],
                    'type': RawItem.ItemType.NEWS,
                    'title': title,
                    'body_snippet': body_snippet,
                    'author': author,
                    'source_url': source_url[:1024],
                    'received_at': received_at,
                }
            )

            if created:
                created_count += 1
            else:
                existing_count += 1

        # Update connection success status
        connection.status = Connection.Status.ACTIVE
        connection.last_sync_at = timezone.now()
        connection.last_error = ''
        connection.save(update_fields=['status', 'last_sync_at', 'last_error', 'updated_at'])

        logger.info(
            f"[Ingestor] Finished feed '{connection.display_name}': {created_count} created, {existing_count} existing."
        )
        return {
            'status': 'success',
            'connection_id': connection_id,
            'created_count': created_count,
            'existing_count': existing_count,
            'total_entries': len(feed.entries),
        }

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {str(exc)}"
        logger.error(f"[Ingestor] Failed fetching RSS feed for connection {connection_id}: {error_msg}")
        connection.status = Connection.Status.ERROR
        connection.last_error = error_msg[:1000]
        connection.save(update_fields=['status', 'last_error', 'updated_at'])
        return {
            'status': 'error',
            'connection_id': connection_id,
            'error': error_msg,
        }


@shared_task(name='apps.ingestor.tasks.fetch_all_active_rss_feeds')
def fetch_all_active_rss_feeds():
    """
    Periodic task: fan out RSS ingestion for all active RSS connections.
    """
    active_connections = Connection.objects.filter(
        provider=Connection.Provider.RSS,
        is_active=True
    ).values_list('id', flat=True)

    logger.info(f"[Ingestor] Triggering periodic fetch for {len(active_connections)} active RSS connections.")

    dispatched = 0
    for conn_id in active_connections:
        fetch_rss_feeds.delay(conn_id)
        dispatched += 1

    return {'status': 'dispatched', 'count': dispatched}
