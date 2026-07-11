import random
import string
from app.core.redis import redis_client

class OTPService:
    @staticmethod
    def generate_otp(length: int = 6) -> str:
        return ''.join(random.choices(string.digits, k=length))

    @staticmethod
    async def store_otp(email: str, otp: str, expire_seconds: int = 300) -> None:
        key = f"otp:{email}"
        await redis_client.redis.set(key, otp, ex=expire_seconds)

    @staticmethod
    async def verify_otp(email: str, otp: str) -> bool:
        key = f"otp:{email}"
        stored_otp = await redis_client.redis.get(key)
        if stored_otp and stored_otp == otp:
            # Delete OTP after successful verification to prevent reuse
            await redis_client.redis.delete(key)
            return True
        return False

otp_service = OTPService()
