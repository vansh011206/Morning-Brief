from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from apps.connections.models import Connection
from apps.ingestor.models import RawItem
from apps.ingestor.tasks import fetch_rss_feeds

User = get_user_model()

SAMPLE_RSS_XML = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Sample Tech Feed</title>
    <link>https://example.com</link>
    <description>Sample RSS Description</description>
    <item>
      <title>Exciting Python Release</title>
      <link>https://example.com/python-release</link>
      <description>Python 3.13 is released with amazing features.</description>
      <author>Guido van Rossum</author>
      <guid>guid-python-123</guid>
      <pubDate>Wed, 09 Sep 2026 10:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Django 5.2 Deep Dive</title>
      <link>https://example.com/django-5-2</link>
      <description>&lt;p&gt;Learn all about Django 5.2 features &amp;amp; updates.&lt;/p&gt;</description>
      <guid>guid-django-456</guid>
      <pubDate>Wed, 09 Sep 2026 12:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>
"""


class RssIngestionTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='alex.tester@morningbrief.ai',
            username='alextester',
            password='Password123!'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_registration_seeds_four_default_feeds(self):
        """Registering a new user must seed 4 default RSS connections."""
        connections = Connection.objects.filter(user=self.user, provider=Connection.Provider.RSS)
        self.assertEqual(connections.count(), 4)
        display_names = set(connections.values_list('display_name', flat=True))
        self.assertIn('Hacker News', display_names)
        self.assertIn('Django Weblog', display_names)
        self.assertIn('Cricket News', display_names)
        self.assertIn('Moneycontrol', display_names)

    @patch('requests.get')
    def test_fetch_rss_feeds_and_deduplication(self, mock_get):
        """Fetch RSS feeds creates RawItem and re-fetching does not duplicate."""
        mock_resp = MagicMock()
        mock_resp.content = SAMPLE_RSS_XML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        conn = Connection.objects.filter(user=self.user).first()

        # First run: should create 2 items
        result1 = fetch_rss_feeds(conn.id)
        self.assertEqual(result1['status'], 'success')
        self.assertEqual(result1['created_count'], 2)
        self.assertEqual(result1['existing_count'], 0)

        # Verify RawItem records in DB
        items = RawItem.objects.filter(connection=conn)
        self.assertEqual(items.count(), 2)

        first_item = items.get(external_id='guid-python-123')
        self.assertEqual(first_item.title, 'Exciting Python Release')
        self.assertEqual(first_item.author, 'Guido van Rossum')
        self.assertIn('Python 3.13 is released', first_item.body_snippet)
        self.assertTrue(first_item.dedup_hash)

        # Connection status should be updated
        conn.refresh_from_db()
        self.assertEqual(conn.status, Connection.Status.ACTIVE)
        self.assertIsNotNone(conn.last_sync_at)
        self.assertEqual(conn.last_error, '')

        # Second run: must deduplicate and create 0 new items
        result2 = fetch_rss_feeds(conn.id)
        self.assertEqual(result2['status'], 'success')
        self.assertEqual(result2['created_count'], 0)
        self.assertEqual(result2['existing_count'], 2)

        # DB count stays exactly 2
        self.assertEqual(RawItem.objects.filter(connection=conn).count(), 2)

    @patch('requests.get')
    def test_broken_feed_error_handling(self, mock_get):
        """A broken feed marks connection status error gracefully."""
        mock_get.side_effect = Exception("Connection refused / 404 Not Found")

        conn = Connection.objects.filter(user=self.user).first()
        result = fetch_rss_feeds(conn.id)

        self.assertEqual(result['status'], 'error')
        conn.refresh_from_db()
        self.assertEqual(conn.status, Connection.Status.ERROR)
        self.assertIn('Connection refused', conn.last_error)

    @patch('requests.get')
    def test_cascade_delete_removes_raw_items(self, mock_get):
        """Disconnecting / deleting a connection removes all its associated RawItems."""
        mock_resp = MagicMock()
        mock_resp.content = SAMPLE_RSS_XML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        conn = Connection.objects.filter(user=self.user).first()
        fetch_rss_feeds(conn.id)
        self.assertEqual(RawItem.objects.filter(connection=conn).count(), 2)

        # Delete connection
        conn.delete()
        self.assertEqual(RawItem.objects.filter(connection_id=conn.id).count(), 0)

    @patch('requests.get')
    def test_api_connections_list_and_total_items_7d(self, mock_get):
        """GET /api/v1/connections/ returns connections with total_items_7d count."""
        mock_resp = MagicMock()
        mock_resp.content = SAMPLE_RSS_XML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        conn = Connection.objects.filter(user=self.user).first()
        fetch_rss_feeds(conn.id)

        resp = self.client.get('/api/v1/connections/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data), 4)

        matching = next(c for c in data if c['id'] == conn.id)
        self.assertEqual(matching['total_items_7d'], 2)
        self.assertEqual(matching['status'], 'active')

    @patch('requests.get')
    def test_api_raw_items_endpoint(self, mock_get):
        """GET /api/v1/ingestor/raw-items/ returns ingested items."""
        mock_resp = MagicMock()
        mock_resp.content = SAMPLE_RSS_XML
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        conn = Connection.objects.filter(user=self.user).first()
        fetch_rss_feeds(conn.id)

        resp = self.client.get('/api/v1/ingestor/raw-items/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]['connection_name'], conn.display_name)
