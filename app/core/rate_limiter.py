from app.core.redis import redis_client

class LoginRateLimiter:
    MAX_ATTEMPTS = 5
    WINDOW_SECONDS = 900  # 15 minutes
    BLOCK_SECONDS = 1800  # 30 minutes

    @classmethod
    def _attempts_key(cls, email: str) -> str:
        return f"login_attempts:count:{email}"

    @classmethod
    def _blocked_key(cls, email: str) -> str:
        return f"login_attempts:blocked:{email}"

    @classmethod
    async def is_blocked(cls, email: str) -> bool:
        if not redis_client.redis:
            await redis_client.connect()
        return await redis_client.redis.exists(cls._blocked_key(email)) > 0

    @classmethod
    async def get_remaining_seconds(cls, email: str) -> int:
        if not redis_client.redis:
            await redis_client.connect()
        ttl = await redis_client.redis.ttl(cls._blocked_key(email))
        return max(0, ttl)

    @classmethod
    async def get_remaining_attempts(cls, email: str) -> int:
        if not redis_client.redis:
            await redis_client.connect()
        attempts = await redis_client.redis.get(cls._attempts_key(email))
        if not attempts:
            return cls.MAX_ATTEMPTS
        return max(0, cls.MAX_ATTEMPTS - int(attempts))

    @classmethod
    async def record_failed_attempt(cls, email: str) -> int:
        if not redis_client.redis:
            await redis_client.connect()
        
        attempts_key = cls._attempts_key(email)
        blocked_key = cls._blocked_key(email)
        
        # Increment attempts
        attempts = await redis_client.redis.incr(attempts_key)
        
        # Set expiration if it is a new attempt sequence
        if attempts == 1:
            await redis_client.redis.expire(attempts_key, cls.WINDOW_SECONDS)
            
        if attempts >= cls.MAX_ATTEMPTS:
            # Block the user
            await redis_client.redis.set(blocked_key, "1", ex=cls.BLOCK_SECONDS)
            # Clear attempts
            await redis_client.redis.delete(attempts_key)
            return 0  # 0 attempts remaining, blocked
            
        return cls.MAX_ATTEMPTS - attempts

    @classmethod
    async def reset_attempts(cls, email: str) -> None:
        if not redis_client.redis:
            await redis_client.connect()
        await redis_client.redis.delete(cls._attempts_key(email))
        await redis_client.redis.delete(cls._blocked_key(email))

login_rate_limiter = LoginRateLimiter()
