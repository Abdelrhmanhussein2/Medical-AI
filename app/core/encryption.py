from cryptography.fernet import Fernet
from app.core.config import settings

# Initialize Fernet cipher using key from config
_cipher = Fernet(settings.CHAT_ENCRYPTION_KEY.encode())

def encrypt_text(plaintext: str) -> bytes:
    """
    Encrypt a plaintext string to bytes using AES-256 Fernet.
    Used for text fields like transcripts and chat messages.
    """
    if not plaintext:
        return b""
    return _cipher.encrypt(plaintext.encode("utf-8"))

def decrypt_bytes(ciphertext: bytes) -> str:
    """
    Decrypt bytes back to a plaintext string.
    Supports memoryview or raw bytes returned from database bytea column.
    Used for decrypting text fields (transcripts, chat messages).
    """
    if not ciphertext:
        return ""
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    return _cipher.decrypt(ciphertext).decode("utf-8")

def encrypt_binary(raw_bytes: bytes) -> bytes:
    """
    Encrypt raw binary data (e.g. audio chunks) to encrypted bytes using AES-256 Fernet.
    Input  : raw audio bytes
    Output : Fernet-encrypted bytes suitable for storing in a PostgreSQL bytea column.
    """
    if not raw_bytes:
        return b""
    return _cipher.encrypt(raw_bytes)

def decrypt_binary(ciphertext: bytes) -> bytes:
    """
    Decrypt Fernet-encrypted bytes back to the original raw binary data.
    Supports memoryview returned by asyncpg from bytea columns.
    Input  : encrypted bytes (from bytea column)
    Output : original raw bytes (e.g. the audio chunk binary)
    """
    if not ciphertext:
        return b""
    if isinstance(ciphertext, memoryview):
        ciphertext = bytes(ciphertext)
    return _cipher.decrypt(ciphertext)
