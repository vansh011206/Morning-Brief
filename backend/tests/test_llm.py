import pytest
from unittest.mock import patch, MagicMock
from django.test import override_settings
from apps.llm.services import MockLLMClient, get_llm_client, llm_json
from apps.llm.models import TokenUsage
from tests.factories import UserFactory


@pytest.mark.django_db
class TestLLM:
    def test_mock_llm_path(self):
        """MockLLMClient produces structured JSON with items and token usage."""
        client = MockLLMClient()
        messages = [
            {"role": "system", "content": "You are MorningBrief AI."},
            {"role": "user", "content": "[Item ID: 42]\nSource: Tech News\nTitle: New Release\nSnippet: Details."},
        ]
        parsed, usage = client.generate_json(messages)

        assert 'items' in parsed
        assert len(parsed['items']) >= 1
        assert parsed['items'][0]['id'] == 42
        assert 'summary' in parsed['items'][0]
        assert usage['prompt_tokens'] > 0
        assert usage['completion_tokens'] > 0
        assert usage['model'] == 'mock-gpt-4o-mini'

    @override_settings(OPENAI_API_KEY='', LLM_PROVIDER='openai')
    def test_get_llm_client_fallback_without_key(self):
        """get_llm_client returns MockLLMClient when API key is empty."""
        client = get_llm_client()
        assert isinstance(client, MockLLMClient)

    def test_token_usage_recorded(self, user):
        """llm_json records a TokenUsage instance with prompt/completion counts and cost in cents."""
        initial_count = TokenUsage.objects.count()
        messages = [{"role": "user", "content": "Summarize notification"}]

        with override_settings(LLM_PROVIDER='mock'):
            result = llm_json(messages, user=user, call_type='summarize')

        assert 'items' in result
        assert TokenUsage.objects.count() == initial_count + 1

        usage = TokenUsage.objects.latest('created_at')
        assert usage.user == user
        assert usage.call_type == 'summarize'
        assert usage.prompt_tokens > 0
        assert usage.completion_tokens > 0
        assert usage.cost_cents >= 0.0

    def test_llm_json_retry_on_bad_json(self, user):
        """llm_json retries on failure and recovers (or falls back to MockLLM)."""
        mock_client = MagicMock()
        # First call raises ValueError (bad JSON), second call succeeds
        mock_client.generate_json.side_effect = [
            ValueError("Bad JSON: Unterminated string"),
            ({"items": [{"id": 1, "summary": "Recovered", "section": "news", "priority": "normal"}]},
             {"prompt_tokens": 100, "completion_tokens": 50, "model": "test-model"})
        ]

        with patch('apps.llm.services.get_llm_client', return_value=mock_client):
            messages = [{"role": "user", "content": "Test prompt"}]
            result = llm_json(messages, user=user)

        assert mock_client.generate_json.call_count == 2
        assert 'items' in result
        assert result['items'][0]['summary'] == "Recovered"
