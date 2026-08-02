import pytest
from unittest.mock import patch, MagicMock
from app.services.otp_service import otp_service
from app.services.email_service import email_service
from app.core.redis import redis_client

@pytest.mark.asyncio
async def test_otp_generation_and_verification():
    # Make sure redis is connected
    await redis_client.connect()
    
    email = "test_doctor@example.com"
    otp = otp_service.generate_otp(length=6)
    assert len(otp) == 6
    assert otp.isdigit()
    
    # Store OTP in redis
    await otp_service.store_otp(email, otp, expire_seconds=30)
    
    # Verify incorrect OTP
    is_valid_incorrect = await otp_service.verify_otp(email, "000000")
    assert is_valid_incorrect is False
    
    # Verify correct OTP
    is_valid_correct = await otp_service.verify_otp(email, otp)
    assert is_valid_correct is True
    
    # Verify correct OTP is deleted and cannot be reused
    is_valid_reused = await otp_service.verify_otp(email, otp)
    assert is_valid_reused is False

@pytest.mark.asyncio
async def test_email_service_welcome_html():
    # Verify welcome email construction and async send
    with patch.object(email_service, "_send_sync") as mock_send_sync:
        await email_service.send_welcome_email(
            to_email="doctor@example.com",
            doctor_name="Dr. Smith",
            temp_password="tempPassword123"
        )
        
        mock_send_sync.assert_called_once()
        args, kwargs = mock_send_sync.call_args
        to_email, subject, html = args
        assert to_email == "doctor@example.com"
        assert "بيانات حسابك الجديد" in subject
        assert "tempPassword123" in html
        assert "Dr. Smith" in html

@pytest.mark.asyncio
async def test_email_service_otp_html():
    # Verify OTP email construction and async send
    with patch.object(email_service, "_send_sync") as mock_send_sync:
        await email_service.send_otp_email(
            to_email="verify@example.com",
            otp_code="987654",
            action_text="تغيير كلمة المرور"
        )
        
        mock_send_sync.assert_called_once()
        args, kwargs = mock_send_sync.call_args
        to_email, subject, html = args
        assert to_email == "verify@example.com"
        assert "تغيير كلمة المرور" in subject
        assert "987654" in html
