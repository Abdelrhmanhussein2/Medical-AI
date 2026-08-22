from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    ENV: str = "production"
    DATABASE_URL: str
    SECRET_KEY: str
    REDIS_URL: str = "redis://localhost:6379/0"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    DAILY_TOKEN_LIMIT: int = 50000000
    GEMINI_API_KEY: Optional[str] = None
    CHAT_ENCRYPTION_KEY: str = "tmDxk2NXIA7urGusgb3yySpQNcWNkQKvGKQIVKjCLm4="

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

    # ──────────── Moyasar Payment Gateway ────────────
    MOYASAR_SECRET_KEY: str = ""          # sk_test_... or sk_live_...
    MOYASAR_PUBLISHABLE_KEY: str = ""     # pk_test_... or pk_live_...
    MOYASAR_WEBHOOK_SECRET: str = ""      # From Moyasar Dashboard → Webhooks
    MOYASAR_CURRENCY: str = "SAR"         # SAR, USD, KWD, BHD
    MOYASAR_API_BASE: str = "https://api.moyasar.com/v1"

    class Config:
        env_file = ".env"
        extra = "ignore" # Allow extra fields in .env without raising validation errors

settings = Settings()
