import base64
import hashlib
from django.conf import settings
from cryptography.fernet import Fernet


def _get_fernet() -> Fernet:
    """Derive a valid 32-byte url-safe base64 key for Fernet from settings.ENCRYPTION_KEY."""
    raw_key = getattr(settings, 'ENCRYPTION_KEY', settings.SECRET_KEY)
    if isinstance(raw_key, str):
        raw_key = raw_key.encode('utf-8')
    key_bytes = hashlib.sha256(raw_key).digest()
    b64_key = base64.urlsafe_b64encode(key_bytes)
    return Fernet(b64_key)


def encrypt_token(plaintext: str) -> str:
    """Encrypts plaintext string into Fernet ciphertext."""
    if not plaintext:
        return ''
    f = _get_fernet()
    return f.encrypt(plaintext.encode('utf-8')).decode('utf-8')


def decrypt_token(ciphertext: str) -> str:
    """Decrypts Fernet ciphertext back to plaintext string."""
    if not ciphertext:
        return ''
    f = _get_fernet()
    return f.decrypt(ciphertext.encode('utf-8')).decode('utf-8')
