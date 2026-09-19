import time
import logging
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.connections.telegram_service import TelegramService, verify_telegram_bind_token
from apps.connections.models import Connection
from apps.digest.models import Digest
from apps.digest.tasks import build_digest

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Run long-polling Telegram Bot listener for MorningBrief'

    def handle(self, *args, **options):
        bot_token = TelegramService.get_bot_token()
        if not bot_token or bot_token.startswith('mock-'):
            self.stderr.write(self.style.ERROR("TELEGRAM_BOT_TOKEN is not set or is a mock token."))
            return

        bot_username = TelegramService.get_bot_username()
        self.stdout.write(self.style.SUCCESS(f"Starting Telegram Bot polling for @{bot_username}..."))

        # 1. Delete existing webhook so polling works
        try:
            del_resp = requests.post(
                f"https://api.telegram.org/bot{bot_token}/deleteWebhook",
                json={'drop_pending_updates': False},
                timeout=10,
            )
            self.stdout.write(f"Webhook cleanup: {del_resp.json().get('description', 'OK')}")
        except Exception as e:
            self.stderr.write(f"Warning: Could not delete webhook: {e}")

        offset = None
        self.stdout.write(self.style.SUCCESS("Telegram bot listener is actively waiting for messages. Press Ctrl+C to stop."))

        while True:
            try:
                params = {'timeout': 20}
                if offset:
                    params['offset'] = offset

                resp = requests.get(
                    f"https://api.telegram.org/bot{bot_token}/getUpdates",
                    params=params,
                    timeout=25,
                )

                if resp.status_code != 200:
                    time.sleep(2)
                    continue

                data = resp.json()
                if not data.get('ok'):
                    time.sleep(2)
                    continue

                for update in data.get('result', []):
                    offset = update['update_id'] + 1
                    self.process_update(update)

            except requests.exceptions.Timeout:
                continue
            except requests.exceptions.ConnectionError:
                time.sleep(3)
            except Exception as e:
                logger.exception(f"Error in telegram polling loop: {e}")
                time.sleep(2)

    def process_update(self, update):
        # 1. Check callback query (rating clicks)
        if 'callback_query' in update:
            TelegramService.handle_webhook_update(update)
            return

        # 2. Check message
        message = update.get('message', {})
        text = message.get('text', '').strip()
        chat = message.get('chat', {})
        chat_id = str(chat.get('id', ''))

        if not chat_id or not text:
            return

        parts = text.split()
        cmd = parts[0].lower() if parts else ''

        # Handle /start with deep link token
        if cmd == '/start':
            if len(parts) > 1:
                token = parts[1]
                user_id = verify_telegram_bind_token(token)
                if user_id:
                    try:
                        user = User.objects.get(pk=user_id)
                        TelegramService.bind_chat_to_user(user, chat_id)
                        TelegramService.send_message(
                            chat_id,
                            f"<b>MorningBrief Connected!</b>\n\n"
                            f"Your Telegram account is now linked to <b>{user.email}</b>.\n\n"
                            f"Commands:\n"
                            f"• /brief — Get today's morning briefing\n"
                            f"• /status — Check connection & feed status\n"
                            f"• /unlink — Unlink your Telegram account\n\n"
                            f"You will automatically receive your daily briefing at your scheduled time."
                        )
                        self.stdout.write(self.style.SUCCESS(f"Bound chat_id {chat_id} to user {user.email} via token"))
                        return
                    except User.DoesNotExist:
                        pass

            # If /start without token, check if user is already bound
            existing_user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
            if existing_user:
                TelegramService.send_message(
                    chat_id,
                    f"<b>Welcome back!</b>\n\n"
                    f"Your account is linked to <b>{existing_user.email}</b>.\n\n"
                    f"Commands:\n"
                    f"• /brief — Get today's morning briefing\n"
                    f"• /status — Check connection & feed status\n"
                    f"• /unlink — Unlink this Telegram account"
                )
                return

            # Unbound user greeting
            TelegramService.send_message(
                chat_id,
                f"<b>Welcome to MorningBrief!</b>\n\n"
                f"To link your account, either:\n"
                f"1. Open your dashboard at <a href=\"http://localhost:5173/connections\">MorningBrief Connections</a> and click <b>Connect Bot</b>\n\n"
                f"2. Or reply here directly with:\n"
                f"<code>/link your-email@example.com</code>"
            )
            return

        # Handle /link <email>
        if cmd == '/link':
            if len(parts) < 2:
                TelegramService.send_message(
                    chat_id,
                    "<b>Usage:</b> <code>/link your-email@example.com</code>\n\n"
                    "Please provide the email address of your MorningBrief account."
                )
                return

            target_email = parts[1].strip().lower()
            target_user = User.objects.filter(email__iexact=target_email).first()
            if not target_user:
                TelegramService.send_message(
                    chat_id,
                    f"<b>User not found:</b> No MorningBrief account found with email <code>{target_email}</code>.\n\n"
                    f"Please check the email or create an account at http://localhost:5173/register"
                )
                return

            TelegramService.bind_chat_to_user(target_user, chat_id)
            TelegramService.send_message(
                chat_id,
                f"<b>MorningBrief Connected!</b>\n\n"
                f"Your Telegram account is now linked to <b>{target_user.email}</b>.\n\n"
                f"Commands:\n"
                f"• /brief — Get today's morning briefing\n"
                f"• /status — Check connection & feed status\n"
                f"• /unlink — Unlink your Telegram account"
            )
            self.stdout.write(self.style.SUCCESS(f"Bound chat_id {chat_id} to user {target_user.email} via /link"))
            return

        # Handle /brief
        if cmd == '/brief':
            user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
            if not user:
                TelegramService.send_message(
                    chat_id,
                    "<b>Account Not Linked</b>\n\nPlease link your account first by sending:\n"
                    "<code>/link your-email@example.com</code>"
                )
                return

            TelegramService.send_message(chat_id, "Compiling your morning briefing...")
            import pytz
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
                TelegramService.send_message(
                    chat_id,
                    "<b>No items found for today.</b>\n\n"
                    "Make sure you have active RSS feeds or connections in your dashboard."
                )
                return

            from apps.delivery.services import DeliveryService
            success, res = DeliveryService.send_digest_telegram(digest, chat_id=chat_id)
            if success:
                self.stdout.write(self.style.SUCCESS(f"Dispatched /brief to chat_id {chat_id}"))
            else:
                TelegramService.send_message(chat_id, f"Failed to deliver brief: {res}")
            return

        # Handle /status
        if cmd == '/status':
            user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
            if not user:
                TelegramService.send_message(
                    chat_id,
                    "Status: <b>Not Linked</b>\n\nLink your account with <code>/link your-email@example.com</code>"
                )
                return

            conns = Connection.objects.filter(user=user, is_active=True)
            conn_list = "\n".join([f"• {c.display_name} ({c.provider})" for c in conns]) or "None active"

            TelegramService.send_message(
                chat_id,
                f"<b>MorningBrief Status</b>\n\n"
                f"Linked User: <b>{user.email}</b>\n"
                f"Timezone: <code>{getattr(user.profile, 'timezone', 'Asia/Kolkata')}</code>\n"
                f"Delivery Time: <code>{getattr(user.profile, 'digest_time', '07:00')}</code>\n\n"
                f"<b>Active Feeds:</b>\n{conn_list}\n\n"
                f"Send /brief to fetch today's briefing."
            )
            return

        # Handle /unlink
        if cmd == '/unlink':
            user = User.objects.filter(profile__telegram_chat_id=chat_id).first()
            if user:
                user.profile.telegram_chat_id = None
                user.profile.save(update_fields=['telegram_chat_id'])
                Connection.objects.filter(user=user, provider=Connection.Provider.TELEGRAM).delete()
                TelegramService.send_message(
                    chat_id,
                    "<b>Disconnected</b>\n\nYour Telegram account has been unlinked from MorningBrief."
                )
                self.stdout.write(self.style.NOTICE(f"Unlinked chat_id {chat_id} from user {user.email}"))
            else:
                TelegramService.send_message(chat_id, "This chat is not currently linked to any account.")
            return

        # Default fallback
        TelegramService.send_message(
            chat_id,
            "<b>MorningBrief Bot Commands:</b>\n\n"
            "• /brief — Fetch today's morning briefing\n"
            "• /status — Check connection status\n"
            "• /link &lt;email&gt; — Link your MorningBrief account\n"
            "• /unlink — Unlink this Telegram chat"
        )
