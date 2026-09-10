from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from apps.llm.services import (
    LLMClient,
    MockLLMClient,
    OpenAIClient,
    get_llm_client,
    llm_json,
    summarize_items,
)
from apps.llm.models import TokenUsage
from apps.ingestor.models import RawItem
from apps.connections.models import Connection
from django.utils import timezone

User = get_user_model()


class LLMServiceTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='llm.tester@morningbrief.ai',
            username='llmtester',
            password='TestPassword123!'
        )

    def test_mock_llm_client_generation(self):
        """MockLLMClient must generate structured JSON with items and usage."""
        client = MockLLMClient()
        messages = [
            {"role": "system", "content": "You are MorningBrief AI."},
            {
                "role": "user",
                "content": "[Item ID: 101]\nSource: Hacker News\nTitle: Python 3.14 Released with New JIT Compiler\nSnippet: Performance improvements in standard library.",
            },
        ]
        parsed, usage = client.generate_json(messages)

        self.assertIn('items', parsed)
        self.assertEqual(len(parsed['items']), 1)
        item = parsed['items'][0]
        self.assertEqual(item['id'], 101)
        self.assertEqual(item['section'], 'news')
        self.assertIn('Python 3.14', item['summary'])
        self.assertGreater(usage['prompt_tokens'], 0)
        self.assertGreater(usage['completion_tokens'], 0)
        self.assertEqual(usage['model'], 'mock-gpt-4o-mini')

    @override_settings(OPENAI_API_KEY='', LLM_PROVIDER='openai')
    def test_get_llm_client_fallback_without_api_key(self):
        """When OPENAI_API_KEY is empty, get_llm_client() must return MockLLMClient transparently."""
        client = get_llm_client()
        self.assertIsInstance(client, MockLLMClient)

    @override_settings(LLM_PROVIDER='mock')
    def test_llm_json_records_token_usage(self):
        """Every call to llm_json must record a TokenUsage entry in the database."""
        initial_usage_count = TokenUsage.objects.count()

        messages = [
            {"role": "system", "content": "Summarize."},
            {"role": "user", "content": "[Item ID: 55] Title: Server vulnerability CVE-2026-1111 reported"},
        ]
        result = llm_json(messages, user=self.user, call_type='summarize_test')

        self.assertIn('items', result)
        self.assertEqual(TokenUsage.objects.count(), initial_usage_count + 1)

        usage = TokenUsage.objects.latest('created_at')
        self.assertEqual(usage.user, self.user)
        self.assertEqual(usage.call_type, 'summarize_test')
        self.assertGreater(usage.prompt_tokens, 0)
        self.assertGreater(usage.completion_tokens, 0)
        self.assertGreater(usage.cost_cents, 0.0)

    @override_settings(LLM_PROVIDER='mock')
    def test_summarize_items_batch(self):
        """summarize_items must process raw items and return structured list."""
        conn, _ = Connection.objects.get_or_create(
            user=self.user,
            provider=Connection.Provider.RSS,
            external_account='https://hnrss.org/frontpage',
            defaults={'display_name': 'Hacker News'}
        )
        raw_item = RawItem.objects.create(
            user=self.user,
            connection=conn,
            external_id='hn-test-1',
            type=RawItem.ItemType.NEWS,
            title='Breaking: Sensex hits record high as markets surge',
            body_snippet='Major market rally led by tech and banking shares.',
            source_url='https://example.com/market-surge',
            received_at=timezone.now(),
            dedup_hash='hash-test-llm-1'
        )

        summaries = summarize_items([raw_item], user=self.user)
        self.assertEqual(len(summaries), 1)
        summary = summaries[0]
        self.assertEqual(summary['id'], raw_item.id)
        # Check that market keyword triggered money classification
        self.assertEqual(summary['section'], 'money')
        self.assertIn('Sensex hits record high', summary['summary'])
