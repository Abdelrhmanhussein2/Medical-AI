from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import EmailStr
from app.schemes.auth_schema import LoginRequest, Token, OTPRequest, OTPVerify, PasswordReset
from app.services.auth_service import auth_service
from app.services.otp_service import otp_service
from app.core.dependencies import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
async def login(request: LoginRequest, role: str = "doctor"):
    """
    Login endpoint. Role can be 'admin', 'doctor', or 'patient'.
    """
    from app.core.rate_limiter import login_rate_limiter

    # 1. Check if user is blocked
    if await login_rate_limiter.is_blocked(request.email):
        seconds_left = await login_rate_limiter.get_remaining_seconds(request.email)
        minutes_left = (seconds_left + 59) // 60
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"تم حظر حسابك مؤقتاً بسبب محاولات دخول فاشلة متكررة. يرجى المحاولة بعد {minutes_left} دقيقة. / Your account has been temporarily blocked. Please try again in {minutes_left} minutes.",
        )

    # 2. Authenticate
    user = await auth_service.authenticate_user(request.email, request.password, role)
    if not user:
        # Record failed attempt
        remaining = await login_rate_limiter.record_failed_attempt(request.email)
        if remaining == 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="تم حظر حسابك مؤقتاً لمدة 30 دقيقة بسبب محاولات دخول فاشلة متكررة. / Your account has been temporarily blocked for 30 minutes due to repeated failed login attempts.",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"البريد الإلكتروني أو كلمة المرور غير صحيحة. المحاولات المتبقية: {remaining} / Incorrect email or password. Remaining attempts: {remaining}",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # 3. Successful login - reset attempts
    await login_rate_limiter.reset_attempts(request.email)
    return auth_service.create_token(user=user, role=role)

@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint. Validates the Bearer token and registers a logout event.
    The frontend is responsible for discarding the token after calling this endpoint.
    Since JWTs are stateless, this endpoint serves as an audit trail for sign-out events.
    """
    user_email = current_user.get("email", "unknown")
    user_role = current_user.get("role", "unknown")
    user_name = current_user.get("name", "unknown")

    # Log the logout event server-side
    logger.info(
        f"LOGOUT: user='{user_name}' | email='{user_email}' | role='{user_role}' | "
        f"action='sign_out' | status='success'"
    )

    return {
        "message": "تم تسجيل الخروج بنجاح.",
        "message_en": "Signed out successfully.",
        "user": user_email,
        "role": user_role
    }

@router.post("/request-otp")
async def request_otp(request: OTPRequest):
    """
    Generate an OTP and store it in Redis.
    In a real system, this would send an email/SMS. 
    Here we return it in the response for testing.
    """
    otp = otp_service.generate_otp()
    await otp_service.store_otp(request.email, otp)
    
    # Send email in background
    from app.services.email_service import email_service
    import asyncio
    asyncio.create_task(email_service.send_otp_email(request.email, otp, "تسجيل الدخول"))
    
    return {"message": "OTP generated successfully"}

@router.post("/verify-otp")
async def verify_otp(request: OTPVerify):
    """
    Verify the OTP provided by the user.
    """
    is_valid = await otp_service.verify_otp(request.email, request.otp)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )
    return {"message": "OTP verified successfully"}

@router.post("/forgot-password")
async def forgot_password(request: OTPRequest):
    """
    Initiate forgot password flow: generates an OTP and emails it to the user.
    """
    from app.services.email_service import email_service
    from app.core.redis import redis_client
    from app.core.database import db
    
    email = request.email
    
    # 1. Verify user exists and determine their table
    table = None
    async with db.pool.acquire() as conn:
        # Check doctors
        if await conn.fetchval("SELECT EXISTS(SELECT 1 FROM doctors WHERE email = $1)", email):
            table = "doctors"
        # Check departments
        elif await conn.fetchval("SELECT EXISTS(SELECT 1 FROM departments WHERE email = $1)", email):
            table = "departments"
        # Check admins
        elif await conn.fetchval("SELECT EXISTS(SELECT 1 FROM admins WHERE email = $1)", email):
            table = "admins"
            
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="البريد الإلكتروني المدخل غير مسجل لدينا."
        )
        
    # 2. Rate limit OTP requests: max 3 per 10 minutes
    rate_key = f"otp_limit:forgot_password:{email}"
    requests_count = await redis_client.redis.get(rate_key)
    if requests_count and int(requests_count) >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="لقد تجاوزت الحد الأقصى لطلب رموز التحقق. يرجى المحاولة بعد 10 دقائق."
        )
    
    # Increment or set limit
    await redis_client.redis.incr(rate_key)
    if not requests_count:
        await redis_client.redis.expire(rate_key, 600) # 10 minutes expiration
        
    # 3. Generate and store OTP
    otp = otp_service.generate_otp()
    redis_key = f"otp:forgot_password:{email}"
    await redis_client.redis.set(redis_key, otp, ex=300) # 5 minutes expiry
    
    # 4. Send email in background
    import asyncio
    asyncio.create_task(email_service.send_otp_email(email, otp, "استعادة كلمة المرور"))
    
    return {"message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني بنجاح."}

@router.post("/reset-password")
async def reset_password(request: PasswordReset):
    """
    Verify OTP and reset the user's password.
    """
    from app.core.redis import redis_client
    from app.core.security import get_password_hash
    from app.core.database import db
    
    email = request.email
    redis_key = f"otp:forgot_password:{email}"
    
    # 1. Verify OTP
    stored_otp = await redis_client.redis.get(redis_key)
    if not stored_otp or stored_otp != request.otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="رمز التحقق غير صحيح أو انتهت صلاحيته."
        )
        
    # 2. Determine user table
    table = None
    async with db.pool.acquire() as conn:
        if await conn.fetchval("SELECT EXISTS(SELECT 1 FROM doctors WHERE email = $1)", email):
            table = "doctors"
        elif await conn.fetchval("SELECT EXISTS(SELECT 1 FROM departments WHERE email = $1)", email):
            table = "departments"
        elif await conn.fetchval("SELECT EXISTS(SELECT 1 FROM admins WHERE email = $1)", email):
            table = "admins"
            
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المستخدم غير موجود."
        )
        
    # 3. Update password
    hashed_password = get_password_hash(request.new_password)
    async with db.pool.acquire() as conn:
        await conn.execute(f"UPDATE {table} SET password_hash = $1, updated_at = now() WHERE email = $2", hashed_password, email)
        
    # 4. Delete OTP and reset login rate limits
    await redis_client.redis.delete(redis_key)
    
    from app.core.rate_limiter import login_rate_limiter
    await login_rate_limiter.reset_attempts(email)
    
    return {"message": "تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن."}
