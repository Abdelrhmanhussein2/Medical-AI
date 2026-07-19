from cryptography.fernet import Fernet
from app.core.config import settings

# Initialize Fernet cipher using key from config
_cipher = Fernet(settings.CHAT_ENCRYPTION_KEY.encode())

def encrypt_text(plaintext: str) -> bytes:
    """
    Encrypt a plaintext string to bytes using AES-256 Fernet.
    """
    if not plaintext:
        return b""
    return _cipher.encrypt(plaintext.encode("utf-8"))

def decrypt_bytes(ciphertext: bytes) -> str:
    """
    Decrypt bytes back to a plaintext string.
    Supports memoryview or raw bytes returned from database bytea column.
    """
    if not ciphertext:
        return ""
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    return _cipher.decrypt(ciphertext).decode("utf-8")
