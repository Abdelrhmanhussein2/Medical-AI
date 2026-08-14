from fastapi import APIRouter, HTTPException, Depends, status, Request, Response
from pydantic import EmailStr
from app.schemes.auth_schema import LoginRequest, Token, OTPRequest, OTPVerify, PasswordReset
from app.services.auth_service import auth_service
from app.services.otp_service import otp_service
from app.core.dependencies import get_current_user, blacklist_token
import logging
import time
from jose import jwt
from app.core.config import settings

from app.core.security import get_password_hash
from app.core.validators import validate_password_strength

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me", response_model=Token)
async def get_me(response: Response, current_user: dict = Depends(get_current_user)):
    """
    Get logged-in user profile from secure cookie and refresh the cookie.
    """
    role = current_user.get("role")
    token_dict = auth_service.create_token(current_user, role)
    
    # Refresh HttpOnly cookie to extend session (sliding expiration)
    response.set_cookie(
        key="access_token",
        value=token_dict.access_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=1800  # 30 mins
    )
    return token_dict

@router.post("/login", response_model=Token)
async def login(login_data: LoginRequest, response: Response, request: Request, role: str = "doctor"):
    """
    Login endpoint. Role can be 'admin', 'doctor', or 'patient'.
    """
    from app.core.rate_limiter import login_rate_limiter
    from app.core.redis import redis_client

    # 0. IP-based Rate Limiting
    client_ip = request.client.host if request.client else "unknown"
    ip_key = f"login_ip:{client_ip}"

    if not redis_client.redis:
        await redis_client.connect()

    ip_attempts = await redis_client.redis.incr(ip_key)
    if ip_attempts == 1:
        await redis_client.redis.expire(ip_key, 900)  # 15 minutes window
    if ip_attempts > 25:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="تم تجاوز الحد المسموح لعدد محاولات الدخول من هذا الجهاز. يرجى الانتظار 15 دقيقة."
        )

    # 1. Check if user is blocked
    if await login_rate_limiter.is_blocked(login_data.email):
        seconds_left = await login_rate_limiter.get_remaining_seconds(login_data.email)
        minutes_left = (seconds_left + 59) // 60
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"تم حظر حسابك مؤقتاً بسبب محاولات دخول فاشلة متكررة. يرجى المحاولة بعد {minutes_left} دقيقة. / Your account has been temporarily blocked. Please try again in {minutes_left} minutes.",
        )

    # 2. Authenticate
    user = await auth_service.authenticate_user(login_data.email, login_data.password, role)
    if not user:
        # Record failed attempt
        remaining = await login_rate_limiter.record_failed_attempt(login_data.email)
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
    await login_rate_limiter.reset_attempts(login_data.email)
    
    token_dict = auth_service.create_token(user=user, role=role)
    
    # Set HttpOnly, Secure, Lax cookie
    response.set_cookie(
        key="access_token",
        value=token_dict.access_token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=1800  # 30 mins
    )
    
    return token_dict

@router.post("/logout")
async def logout(request: Request, response: Response, current_user: dict = Depends(get_current_user)):
    """
    Logout endpoint. Validates the bearer token, blacklists it in Redis, clears the HttpOnly cookie, and registers logout.
    """
    user_email = current_user.get("email", "unknown")
    user_role = current_user.get("role", "unknown")
    user_name = current_user.get("name", "unknown")

    # Extract raw token
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.cookies.get("access_token")

    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            exp = payload.get("exp")
            if exp:
                remaining = int(exp - time.time())
                if remaining > 0:
                    await blacklist_token(token, remaining)
        except Exception as e:
            logger.warning(f"Error blacklisting token on logout: {e}")

    # Delete access token cookie
    response.delete_cookie("access_token")

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
        
    # 3. Update password safely with parameterized query mapping & password strength validation
    validate_password_strength(request.new_password)
    hashed_password = get_password_hash(request.new_password)

    _RESET_QUERIES = {
        "doctors": "UPDATE doctors SET password_hash = $1, updated_at = now() WHERE email = $2",
        "departments": "UPDATE departments SET password_hash = $1, updated_at = now() WHERE email = $2",
        "admins": "UPDATE admins SET password_hash = $1, updated_at = now() WHERE email = $2",
    }
    if table not in _RESET_QUERIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="جدول غير صالح.")

    async with db.pool.acquire() as conn:
        await conn.execute(_RESET_QUERIES[table], hashed_password, email)
        
    # 4. Delete OTP and reset login rate limits
    await redis_client.redis.delete(redis_key)
    
    from app.core.rate_limiter import login_rate_limiter
    await login_rate_limiter.reset_attempts(email)
    
    return {"message": "تم إعادة تعيين كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن."}
