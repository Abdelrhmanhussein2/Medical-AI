from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import EmailStr
from app.schemes.auth_schema import LoginRequest, Token, OTPRequest, OTPVerify
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
    user = await auth_service.authenticate_user(request.email, request.password, role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password, or account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
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
    return {"message": "OTP generated successfully", "otp": otp} # Returning OTP for testing

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
