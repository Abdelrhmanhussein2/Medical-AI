from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import EmailStr
from app.schemes.auth_schema import LoginRequest, Token, OTPRequest, OTPVerify
from app.services.auth_service import auth_service
from app.services.otp_service import otp_service

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
    
    # Check if doctor is pending (we might want to restrict them)
    if role == "doctor" and user["status"] == "pending":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending admin approval",
        )

    return auth_service.create_token(user_email=user["email"], role=role)

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
