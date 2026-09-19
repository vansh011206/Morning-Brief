import json
import logging
import re
from typing import Optional, Tuple, Dict, Any
import requests
from django.conf import settings
from django.core.signing import TimestampSigner, BadSignature, SignatureExpired
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.connections.models import Connection

logger = logging.getLogger(__name__)
User = get_user_model()

SIGNER_SALT = 'telegram-bind'
TOKEN_MAX_AGE = 86400  # 24 hours
TELEGRAM_MAX_CHARS = 4096


def generate_telegram_bind_token(user_id: int) -> str:
    """Generate signed 24h deep-link token to bind a user to Telegram chat_id."""
    signer = TimestampSigner(salt=SIGNER_SALT)
    return signer.sign(str(user_id))


def verify_telegram_bind_token(token: str) -> Optional[int]:
    """Verify signed Telegram bind token and return user_id if valid."""
    signer = TimestampSigner(salt=SIGNER_SALT)
    try:
        val = signer.unsign(token, max_age=TOKEN_MAX_AGE)
        return int(val)
    except (BadSignature, SignatureExpired, ValueError) as e:
        logger.warning(f"[TelegramService] Token verification failed: {e}")
        return None


class TelegramService:
    """
    Unified Telegram Bot API integration service for authentication,
    binding, and emojiless formatted briefing delivery.
    """

    @classmethod
    def get_bot_token(cls) -> str:
        return getattr(settings, 'TELEGRAM_BOT_TOKEN', '').strip()

    @classmethod
    def get_bot_username(cls) -> str:
        return getattr(settings, 'TELEGRAM_BOT_USERNAME', 'MorningBriefBot').strip().lstrip('@')

    @classmethod
    def get_deep_link_url(cls, token: str) -> str:
        username = cls.get_bot_username()
        return f"https://t.me/{username}?start={token}"

    @classmethod
    def bind_chat_to_user(cls, user, chat_id: str) -> Connection:
        """Binds a Telegram chat_id to the user profile and creates an active Connection."""
        chat_id_str = str(chat_id).strip()

        # Update user profile
        if hasattr(user, 'profile'):
            user.profile.telegram_chat_id = chat_id_str
            user.profile.save(update_fields=['telegram_chat_id', 'updated_at'])

        # Create or update Connection record
        connection, _ = Connection.objects.update_or_create(
            user=user,
            provider=Connection.Provider.TELEGRAM,
            defaults={
                'external_account': chat_id_str,
                'display_name': f"Telegram (@{user.username})",
                'status': Connection.Status.ACTIVE,
                'is_active': True,
                'last_error': '',
            }
        )
        logger.info(f"[TelegramService] Bound chat_id {chat_id_str} to user {user.email}")
        return connection

    @classmethod
    def send_message(
        cls,
        chat_id: str,
        text: str,
        parse_mode: str = 'HTML',
        reply_markup: Optional[Dict[str, Any]] = None
    ) -> Tuple[bool, str]:
        """Sends a message to a Telegram chat using Bot API with mock fallback."""
        bot_token = cls.get_bot_token()

        # Mock fallback for development or test environments
        if not bot_token or bot_token.startswith('mock-') or getattr(settings, 'MOCK_TELEGRAM', False):
            logger.info(f"[TelegramService] Mock dispatch to chat_id {chat_id}: {text[:100]}...")
            return True, f"mock-tg-{int(timezone.now().timestamp())}"

        url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
        payload = {
            'chat_id': chat_id,
            'text': text,
            'parse_mode': parse_mode,
            'disable_web_page_preview': True,
        }
        if reply_markup:
            payload['reply_markup'] = reply_markup

        try:
            resp = requests.post(url, json=payload, timeout=10)
            data = resp.json()
            if resp.status_code == 200 and data.get('ok'):
                msg_id = str(data.get('result', {}).get('message_id', ''))
                return True, msg_id
            err = data.get('description', resp.text)
            logger.error(f"[TelegramService] Send message failed: {err}")
            return False, err
        except Exception as e:
            logger.exception(f"[TelegramService] Network error sending Telegram message: {e}")
            return False, str(e)

    @classmethod
    def format_digest_html(cls, digest) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Formats a Daily Digest into clean, emojiless HTML text for Telegram.
        Respects the Telegram 4,096 character limit with safety margin and
        provides inline buttons for preference ratings.
        """
        user = digest.user
        formatted_date = digest.digest_date.strftime('%A, %b %d, %Y')
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173').rstrip('/')

        lines = [
            f"<b>MORNING BRIEF</b> — {formatted_date}",
            f"<i>Curated intelligence for {user.first_name or user.email}</i>",
            "",
        ]

        items = list(digest.items.select_related('raw_item').order_by('rank', 'id'))
        if not items:
            lines.append("No high-priority notifications recorded for today.")
            return "\n".join(lines), None

        # Group items by section
        grouped = {}
        for item in items:
            grouped.setdefault(item.section, []).append(item)

        section_titles = {
            'actions': 'ACTION ITEMS',
            'emails': 'IMPORTANT EMAILS',
            'money': 'MONEY WATCH',
            'news': 'WORLD & TECH NEWS',
            'events': 'SCHEDULE & EVENTS',
        }

        # Render sections in priority order
        for sec_key in ['actions', 'emails', 'money', 'news', 'events']:
            sec_items = grouped.get(sec_key, [])
            if not sec_items:
                continue

            sec_title = section_titles.get(sec_key, sec_key.upper())
            lines.append(f"<b>[ {sec_title} ]</b>")

            for item in sec_items:
                pri_tag = f"[{item.priority.upper()}] " if item.priority in ('high', 'urgent') else ""
                title_clean = re.sub(r'<[^>]+>', '', item.source_title)
                summary_clean = re.sub(r'<[^>]+>', '', item.summary)

                lines.append(f"• <b>{pri_tag}{title_clean}</b>")
                lines.append(f"  {summary_clean}")

                if item.raw_item and item.raw_item.source_url:
                    lines.append(f'  <a href="{item.raw_item.source_url}">View Source</a>')
                lines.append("")

        lines.append(f'<a href="{frontend_url}/today">View Full Brief on Web</a>')
        full_text = "\n".join(lines)

        # Enforce Telegram 4,096 character limit
        if len(full_text) > 4000:
            truncated = full_text[:3850]
            cutoff_idx = truncated.rfind('\n\n')
            if cutoff_idx > 0:
                truncated = truncated[:cutoff_idx]
            full_text = f"{truncated}\n\n<i>[Brief truncated. View complete brief on web]</i>\n<a href=\"{frontend_url}/today\">Open MorningBrief Web</a>"

        # Inline keyboard for thumbs rating on top item
        top_item = items[0] if items else None
        reply_markup = None
        if top_item:
            reply_markup = {
                'inline_keyboard': [
                    [
                        {'text': '[+] Helpful', 'callback_data': f"rate:{top_item.id}:up"},
                        {'text': '[-] Unhelpful', 'callback_data': f"rate:{top_item.id}:down"},
                    ]
                ]
            }

        return full_text, reply_markup

    @classmethod
    def handle_webhook_update(cls, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handles incoming webhook updates from Telegram Bot API."""
        # 1. Handle Message updates (/start <token>)
        message = update_data.get('message', {})
        text = message.get('text', '').strip()
        chat = message.get('chat', {})
        chat_id = str(chat.get('id', ''))

        if text.startswith('/start') and chat_id:
            parts = text.split()
            if len(parts) > 1:
                token = parts[1]
                user_id = verify_telegram_bind_token(token)
                if user_id:
                    try:
                        user = User.objects.get(pk=user_id)
                        cls.bind_chat_to_user(user, chat_id)
                        cls.send_message(
                            chat_id,
                            f"<b>MorningBrief Connected!</b>\n\nYour Telegram account is now linked to <b>{user.email}</b>. You will receive your daily briefings here at your scheduled digest time."
                        )
                        return {'status': 'bound', 'user_id': user_id, 'chat_id': chat_id}
                    except User.DoesNotExist:
                        pass

            cls.send_message(
                chat_id,
                "<b>Welcome to MorningBrief</b>\n\nTo link your account, visit your MorningBrief web dashboard and click 'Connect Telegram'."
            )
            return {'status': 'welcomed', 'chat_id': chat_id}

        # 2. Handle Callback queries (interactive ratings)
        callback_query = update_data.get('callback_query', {})
        if callback_query:
            cb_id = callback_query.get('id')
            data = callback_query.get('data', '')
            cb_chat = callback_query.get('message', {}).get('chat', {})
            cb_chat_id = str(cb_chat.get('id', ''))

            if data.startswith('rate:'):
                _, item_id_str, vote = data.split(':')
                try:
                    from apps.digest.models import DigestItem
                    from apps.feedback.models import ItemFeedback, CategoryWeight

                    item_id = int(item_id_str)
                    digest_item = DigestItem.objects.select_related('digest__user').get(pk=item_id)
                    user = digest_item.digest.user

                    fb_type = ItemFeedback.FeedbackType.HELPFUL if vote == 'up' else ItemFeedback.FeedbackType.UNHELPFUL
                    ItemFeedback.objects.create(
                        user=user,
                        digest_item=digest_item,
                        feedback_type=fb_type,
                        notes='Submitted via Telegram bot button'
                    )

                    # Adjust weight
                    delta = 0.5 if vote == 'up' else -1.0
                    cats = [digest_item.section]
                    if digest_item.raw_item and digest_item.raw_item.connection:
                        cats.append(digest_item.raw_item.connection.display_name)

                    for cat in cats:
                        cw, _ = CategoryWeight.objects.get_or_create(user=user, category_key=cat)
                        cw.weight = max(-10.0, min(10.0, cw.weight + delta))
                        cw.save(update_fields=['weight', 'updated_at'])

                    # Answer callback query
                    bot_token = cls.get_bot_token()
                    if bot_token and not bot_token.startswith('mock-'):
                        requests.post(
                            f"https://api.telegram.org/bot{bot_token}/answerCallbackQuery",
                            json={'callback_query_id': cb_id, 'text': f"Feedback recorded ({'+' if vote == 'up' else '-'})!"},
                            timeout=5
                        )
                    return {'status': 'feedback_recorded', 'item_id': item_id, 'vote': vote}
                except Exception as e:
                    logger.warning(f"[TelegramService] Failed to process callback rating: {e}")

        return {'status': 'ignored'}
