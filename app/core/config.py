from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "secret"
    REDIS_URL: str = "redis://localhost:6379/0"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    DAILY_TOKEN_LIMIT: int = 100000
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    CHAT_ENCRYPTION_KEY: str = "K_5H6wXz0Zt7wY_VwO45Q0R-gM1tXqK3_Z9iH4R1Lw0="

    # ──────────── WhatsApp / Evolution API ────────────
    EVOLUTION_API_URL: str = "http://localhost:8080"
    EVOLUTION_API_KEY: str = "change-me"
    EVOLUTION_INSTANCE: str = "SBR-AI"
    # Default country code prefix for phone normalization (Saudi Arabia = 966)
    PHONE_DEFAULT_COUNTRY_CODE: str = "966"

    # ──────────── SMTP Settings ────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_NAME: str = "SBR AI Platform"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "ignore" # Allow extra fields in .env without raising validation errors

settings = Settings()
