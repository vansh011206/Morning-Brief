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
    def set_webhook(cls, webhook_url: Optional[str] = None) -> Tuple[bool, str]:
        """Registers the Telegram Bot webhook with Telegram Bot API."""
        bot_token = cls.get_bot_token()
        if not bot_token or bot_token.startswith('mock-'):
            return False, "No valid bot token configured"

        if not webhook_url:
            base_url = "https://morning-brief-1t5b.onrender.com"
            for host in getattr(settings, 'ALLOWED_HOSTS', []):
                if 'onrender.com' in host and not host.startswith('.'):
                    base_url = f"https://{host}"
                    break
            webhook_url = f"{base_url.rstrip('/')}/api/v1/connections/telegram/webhook/"

        url = f"https://api.telegram.org/bot{bot_token}/setWebhook"
        try:
            resp = requests.post(url, json={'url': webhook_url}, timeout=10)
            data = resp.json()
            if data.get('ok'):
                logger.info(f"[TelegramService] Webhook successfully set to {webhook_url}")
                return True, webhook_url
            return False, data.get('description', 'Failed to set webhook')
        except Exception as e:
            return False, str(e)

    @classmethod
    def handle_webhook_update(cls, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Handles incoming webhook updates from Telegram Bot API."""
        # 1. Handle Message updates
        message = update_data.get('message', {})
        text = message.get('text', '').strip()
        chat = message.get('chat', {})
        chat_id = str(chat.get('id', ''))
        frontend_url = getattr(settings, 'FRONTEND_URL', 'https://morning-brief-sepia.vercel.app').rstrip('/')

        if chat_id and text:
            parts = text.split()
            cmd = parts[0].lower() if parts else ''

            # Handle /start
            if cmd == '/start':
                if len(parts) > 1:
                    token = parts[1]
                    user_id = verify_telegram_bind_token(token)
                    if user_id:
                        try:
                            user = User.objects.get(pk=user_id)
                            cls.bind_chat_to_user(user, chat_id)
                            cls.send_message(
                                chat_id,
                                f"<b>MorningBrief Connected!</b>\n\n"
                                f"Your Telegram account is now linked to <b>{user.email}</b>.\n\n"
                                f"Commands:\n"
                                f"• /brief — Get today's morning briefing\n"
                                f"• /status — Check connection & feed status\n"
                                f"• /unlink — Unlink your Telegram account\n\n"
                                f"You will automatically receive your daily briefings here at your scheduled digest time."
                            )
                            return {'status': 'bound', 'user_id': user_id, 'chat_id': chat_id}
                        except User.DoesNotExist:
                            pass

                # If /start without token, check if user is already bound
                existing_user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
                if existing_user:
                    cls.send_message(
                        chat_id,
                        f"<b>Welcome back!</b>\n\n"
                        f"Your account is linked to <b>{existing_user.email}</b>.\n\n"
                        f"Commands:\n"
                        f"• /brief — Get today's morning briefing\n"
                        f"• /status — Check connection & feed status\n"
                        f"• /unlink — Unlink this Telegram account"
                    )
                    return {'status': 'welcome_back', 'user_id': existing_user.id, 'chat_id': chat_id}

                # Unbound user
                cls.send_message(
                    chat_id,
                    f"<b>Welcome to MorningBrief Executive Intelligence!</b>\n\n"
                    f"I deliver your curated morning briefings, critical emails, and daily schedule directly to Telegram.\n\n"
                    f"<b>To link your account:</b>\n"
                    f"1. Open your dashboard at {frontend_url}/connections and click <b>Connect Telegram</b>\n\n"
                    f"OR reply here with:\n"
                    f"<code>/link your-email@example.com</code>\n\n"
                    f"Or simply reply with your email address directly."
                )
                return {'status': 'welcomed', 'chat_id': chat_id}

            # Handle direct email reply
            if '@' in text and not text.startswith('/'):
                words = text.strip().split()
                candidate_email = None
                for w in words:
                    if '@' in w and '.' in w:
                        candidate_email = w.strip('<>(),;:"\'').lower()
                        break

                if candidate_email:
                    target_user = User.objects.filter(email__iexact=candidate_email).first()
                    if target_user:
                        cls.bind_chat_to_user(target_user, chat_id)
                        cls.send_message(
                            chat_id,
                            f"<b>MorningBrief Connected!</b>\n\n"
                            f"Your Telegram account is now linked to <b>{target_user.email}</b>.\n\n"
                            f"Commands:\n"
                            f"• /brief — Get today's morning briefing\n"
                            f"• /status — Check connection & feed status\n"
                            f"• /unlink — Unlink your Telegram account"
                        )
                        return {'status': 'bound', 'user_id': target_user.id, 'chat_id': chat_id}
                    else:
                        cls.send_message(
                            chat_id,
                            f"<b>Account Not Found:</b> No MorningBrief account found with email <code>{candidate_email}</code>.\n\n"
                            f"Please check for typos or register at {frontend_url}/register\n\n"
                            f"To link, reply with:\n<code>/link your-email@example.com</code>"
                        )
                        return {'status': 'user_not_found', 'chat_id': chat_id}

            # Handle /link <email>
            if cmd == '/link':
                if len(parts) < 2:
                    cls.send_message(
                        chat_id,
                        "<b>Usage:</b> <code>/link your-email@example.com</code>\n\n"
                        "Please provide the email address registered with your MorningBrief account."
                    )
                    return {'status': 'link_usage_sent', 'chat_id': chat_id}

                target_email = parts[1].strip().lower()
                target_user = User.objects.filter(email__iexact=target_email).first()
                if not target_user:
                    cls.send_message(
                        chat_id,
                        f"<b>Account Not Found:</b> No MorningBrief account found with email <code>{target_email}</code>.\n\n"
                        f"Please check your email or register at {frontend_url}/register"
                    )
                    return {'status': 'user_not_found', 'chat_id': chat_id}

                cls.bind_chat_to_user(target_user, chat_id)
                cls.send_message(
                    chat_id,
                    f"<b>MorningBrief Connected!</b>\n\n"
                    f"Your Telegram account is now linked to <b>{target_user.email}</b>.\n\n"
                    f"Commands:\n"
                    f"• /brief — Get today's morning briefing\n"
                    f"• /status — Check connection & feed status\n"
                    f"• /unlink — Unlink your Telegram account"
                )
                return {'status': 'bound', 'user_id': target_user.id, 'chat_id': chat_id}

            # Handle /brief
            if cmd == '/brief':
                user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
                if not user:
                    cls.send_message(
                        chat_id,
                        "<b>Account Not Linked</b>\n\nPlease link your account first by sending:\n"
                        "<code>/link your-email@example.com</code>"
                    )
                    return {'status': 'not_linked', 'chat_id': chat_id}

                cls.send_message(chat_id, "Compiling your morning briefing...")
                import pytz
                from apps.digest.models import Digest
                from apps.digest.tasks import build_digest
                from apps.delivery.services import DeliveryService

                tz_name = getattr(user.profile, 'timezone', 'Asia/Kolkata')
                try:
                    user_tz = pytz.timezone(tz_name)
                except Exception:
                    user_tz = pytz.timezone('Asia/Kolkata')

                user_today = timezone.now().astimezone(user_tz).date()
                digest = Digest.objects.filter(user=user, digest_date=user_today).first()
                if not digest or digest.items.count() == 0:
                    build_digest(user.id, user_today.isoformat())
                    digest = Digest.objects.filter(user=user, digest_date=user_today).first()

                if not digest or digest.items.count() == 0:
                    cls.send_message(
                        chat_id,
                        "<b>No items found for today.</b>\n\n"
                        "Make sure you have active RSS feeds or connections in your dashboard."
                    )
                    return {'status': 'no_items', 'chat_id': chat_id}

                success, res = DeliveryService.send_digest_telegram(digest, chat_id=chat_id)
                return {'status': 'brief_sent' if success else 'brief_failed', 'chat_id': chat_id, 'result': res}

            # Handle /status
            if cmd == '/status':
                user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
                if not user:
                    cls.send_message(
                        chat_id,
                        "Status: <b>Not Linked</b>\n\nLink your account with <code>/link your-email@example.com</code>"
                    )
                    return {'status': 'not_linked', 'chat_id': chat_id}

                conns = Connection.objects.filter(user=user, is_active=True)
                conn_list = "\n".join([f"• {c.display_name} ({c.provider})" for c in conns]) or "None active"

                cls.send_message(
                    chat_id,
                    f"<b>MorningBrief Status</b>\n\n"
                    f"Linked User: <b>{user.email}</b>\n"
                    f"Timezone: <code>{getattr(user.profile, 'timezone', 'Asia/Kolkata')}</code>\n"
                    f"Delivery Time: <code>{getattr(user.profile, 'digest_time', '07:00')}</code>\n\n"
                    f"<b>Active Feeds:</b>\n{conn_list}\n\n"
                    f"Send /brief to fetch today's briefing."
                )
                return {'status': 'status_sent', 'chat_id': chat_id}

            # Handle /unlink
            if cmd == '/unlink':
                user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
                if user:
                    user.profile.telegram_chat_id = None
                    user.profile.save(update_fields=['telegram_chat_id'])
                    Connection.objects.filter(user=user, provider=Connection.Provider.TELEGRAM).delete()
                    cls.send_message(
                        chat_id,
                        "<b>Disconnected</b>\n\nYour Telegram account has been unlinked from MorningBrief."
                    )
                    return {'status': 'unlinked', 'chat_id': chat_id}
                else:
                    cls.send_message(chat_id, "This chat is not currently linked to any account.")
                    return {'status': 'already_unlinked', 'chat_id': chat_id}

            # Default fallback for unrecognized messages
            cls.send_message(
                chat_id,
                "<b>MorningBrief Bot Commands:</b>\n\n"
                "• /brief — Fetch today's morning briefing\n"
                "• /status — Check connection status\n"
                "• /link &lt;email&gt; — Link your MorningBrief account\n"
                "• /unlink — Unlink this Telegram chat"
            )
            return {'status': 'fallback_sent', 'chat_id': chat_id}

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
