from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "secret"
    REDIS_URL: str = "redis://localhost:6379/0"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200
    
    class Config:
        env_file = ".env"

settings = Settings()
