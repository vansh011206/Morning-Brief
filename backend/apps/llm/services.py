import json
import logging
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple, Optional
from django.conf import settings
from .models import TokenUsage
from .prompts import SUMMARIZE_PROMPT

logger = logging.getLogger(__name__)


class LLMClient(ABC):
    """
    Abstract interface for LLM provider clients.
    """

    @abstractmethod
    def generate_json(
        self,
        messages: List[Dict[str, str]],
        schema_description: Optional[str] = None,
        max_tokens: int = 1500,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        """
        Generates structured JSON from the model.
        Returns a tuple: (parsed_json_dict, usage_metadata)
        where usage_metadata contains:
        {"prompt_tokens": int, "completion_tokens": int, "model": str}
        """
        pass


class OpenAIClient(LLMClient):
    """
    OpenAI API client implementation using Chat Completions with JSON mode.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or getattr(settings, 'OPENAI_API_KEY', '')
        self.model = model or getattr(settings, 'LLM_MODEL', 'gpt-4o-mini')

    def generate_json(
        self,
        messages: List[Dict[str, str]],
        schema_description: Optional[str] = None,
        max_tokens: int = 1500,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=self.api_key)
            response = client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                max_tokens=max_tokens,
                temperature=0.3,
            )
            content = response.choices[0].message.content or "{}"
            parsed = json.loads(content)
            usage = {
                'prompt_tokens': response.usage.prompt_tokens if response.usage else 0,
                'completion_tokens': response.usage.completion_tokens if response.usage else 0,
                'model': self.model,
            }
            return parsed, usage
        except Exception as exc:
            logger.error(f"[OpenAIClient] Chat completion error: {exc}")
            raise


class MockLLMClient(LLMClient):
    """
    Mock LLM client returning realistic canned JSON for development and testing
    when OPENAI_API_KEY is not configured.
    """

    def __init__(self, model: str = 'mock-gpt-4o-mini'):
        self.model = model

    def generate_json(
        self,
        messages: List[Dict[str, str]],
        schema_description: Optional[str] = None,
        max_tokens: int = 1500,
    ) -> Tuple[Dict[str, Any], Dict[str, Any]]:
        user_text = messages[-1].get('content', '') if messages else ''
        items_output = []

        # Find all raw items passed in format: [Item ID: <id>]\nSource: ...\nTitle: <title>
        pattern = r'\[Item ID:\s*(\d+)\]\s*(?:Source:\s*([^\n\r]*))?\s*Title:\s*([^\n\r]*)'
        matches = re.findall(pattern, user_text)

        if matches:
            for item_id_str, source, title in matches:
                iid = int(item_id_str)
                title_clean = title.strip() or f"Notification Item #{iid}"
                t_lower = title_clean.lower()

                # Intelligent heuristic classification
                if any(k in t_lower for k in ['market', 'stock', 'share', 'rupee', 'dollar', 'sensex', 'nifty', 'money', 'crypto', 'bitcoin']):
                    sec = 'money'
                    pri = 'high' if any(k in t_lower for k in ['surge', 'crash', 'record', 'fall']) else 'normal'
                elif any(k in t_lower for k in ['pull request', 'pr #', 'bug', 'patch', 'vulnerability', 'cve', 'security', 'fix']):
                    sec = 'actions'
                    pri = 'urgent' if any(k in t_lower for k in ['security', 'cve', 'critical']) else 'high'
                elif any(k in t_lower for k in ['hiring', 'interview', 'offer', 'recruiter', 'email', 'inquiry']):
                    sec = 'emails'
                    pri = 'high'
                elif any(k in t_lower for k in ['meet', 'sync', 'webinar', 'calendar', 'call', 'summit']):
                    sec = 'events'
                    pri = 'normal'
                else:
                    sec = 'news'
                    pri = 'normal'

                summary = (
                    f"{title_clean}. Key updates and technical takeaways synthesized "
                    f"from {source.strip() or 'connected feed'} for your morning brief."
                )

                items_output.append({
                    'id': iid,
                    'summary': summary,
                    'section': sec,
                    'priority': pri,
                    'ai_reason': f"Categorized into {sec} with {pri} priority based on notification metadata",
                    'source_title': title_clean,
                })
        else:
            # Fallback canned brief item if no formatted items found
            items_output.append({
                'id': 1,
                'summary': "Executive briefing synthesis ready. All high-priority feeds reviewed.",
                'section': "news",
                'priority': "normal",
                'ai_reason': "Default summary synthesized from active channels",
                'source_title': "Morning Briefing Overview",
            })

        parsed = {"items": items_output}
        usage = {
            'prompt_tokens': 120 + len(items_output) * 35,
            'completion_tokens': 60 + len(items_output) * 45,
            'model': self.model,
        }
        return parsed, usage


def get_llm_client() -> LLMClient:
    """
    Factory resolving active LLM client:
    Returns MockLLMClient if OPENAI_API_KEY is missing or LLM_PROVIDER is 'mock',
    otherwise returns OpenAIClient.
    """
    provider = getattr(settings, 'LLM_PROVIDER', 'openai').lower()
    api_key = getattr(settings, 'OPENAI_API_KEY', '').strip()

    if provider == 'mock' or not api_key:
        return MockLLMClient()

    try:
        import openai
        return OpenAIClient(api_key=api_key)
    except ImportError:
        logger.warning("openai package not available; using MockLLMClient.")
        return MockLLMClient()


def llm_json(
    messages: List[Dict[str, str]],
    schema_description: Optional[str] = None,
    user=None,
    call_type: str = 'general'
) -> Dict[str, Any]:
    """
    Structured output helper: calls active LLM provider requesting JSON object.
    Retries once on JSON parse/decode failure.
    Logs token consumption and records a TokenUsage instance in the database.
    """
    client = get_llm_client()
    max_attempts = 2
    last_exc = None

    for attempt in range(1, max_attempts + 1):
        try:
            parsed, usage = client.generate_json(messages, schema_description=schema_description)

            # Record token consumption in DB
            auth_user = user if (user and getattr(user, 'is_authenticated', False)) else None
            TokenUsage.objects.create(
                user=auth_user,
                call_type=call_type,
                prompt_tokens=usage.get('prompt_tokens', 0),
                completion_tokens=usage.get('completion_tokens', 0),
                model=usage.get('model', 'unknown'),
            )
            return parsed
        except Exception as exc:
            last_exc = exc
            logger.warning(f"[LLM] llm_json attempt {attempt}/{max_attempts} failed: {exc}")
            if attempt == max_attempts:
                # If OpenAI failed after retrying, fall back safely to MockLLMClient
                if not isinstance(client, MockLLMClient):
                    logger.warning("[LLM] Falling back to MockLLMClient after OpenAI failure.")
                    mock_client = MockLLMClient()
                    parsed, usage = mock_client.generate_json(messages, schema_description=schema_description)
                    auth_user = user if (user and getattr(user, 'is_authenticated', False)) else None
                    TokenUsage.objects.create(
                        user=auth_user,
                        call_type=call_type,
                        prompt_tokens=usage.get('prompt_tokens', 0),
                        completion_tokens=usage.get('completion_tokens', 0),
                        model='mock-fallback',
                    )
                    return parsed
                raise last_exc


def summarize_items(items, user=None) -> List[Dict[str, Any]]:
    """
    Batch summarizer helper: takes RawItem models and produces structured summaries.
    """
    if not items:
        return []

    formatted_blocks = []
    for itm in items:
        source_name = itm.connection.display_name if getattr(itm, 'connection', None) else 'News Feed'
        snippet = itm.body_snippet[:350] if itm.body_snippet else itm.title
        formatted_blocks.append(
            f"[Item ID: {itm.id}]\n"
            f"Source: {source_name}\n"
            f"Title: {itm.title}\n"
            f"Snippet: {snippet}\n"
            f"URL: {itm.source_url}"
        )

    user_prompt = "Please summarize and categorize the following notifications:\n\n" + "\n---\n".join(formatted_blocks)

    messages = [
        {"role": "system", "content": SUMMARIZE_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    res = llm_json(
        messages=messages,
        schema_description="Structured briefing items",
        user=user,
        call_type='summarize'
    )
    return res.get('items', [])
