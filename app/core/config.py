from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "secret"
    REDIS_URL: str = "redis://localhost:6379/0"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    CHAT_ENCRYPTION_KEY: str = "K_5H6wXz0Zt7wY_VwO45Q0R-gM1tXqK3_Z9iH4R1Lw0="
    
    class Config:
        env_file = ".env"

settings = Settings()
