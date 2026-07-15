from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from app.schemes.doctor_schema import DoctorCreate, DoctorResponse
from app.services.doctor_service import doctor_service
from app.core.database import db

router = APIRouter(prefix="/doctors", tags=["Doctors"])

class SubscriptionActivate(BaseModel):
    subscription_plan: str
    subscription_expiry: str  # YYYY-MM-DD

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(
    name: str = Form(...),
    email: EmailStr = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    specialization: str = Form(...),
    department_id: str = Form(None),
    status: str = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
):
    """
    Register a new doctor. Uploads certificate file and creates a pending record.
    """
    try:
        # Save file if provided
        certificate_url = None
        if certificate_file:
            certificate_url = await doctor_service.save_certificate(certificate_file, email)
        
        # Prepare data
        doctor_data = DoctorCreate(
            name=name,
            email=email,
            phone=phone,
            password=password,
            specialization=specialization,
            department_id=department_id,
            certificate_url=certificate_url,
            status=status
        )
        
        # Register in DB
        doctor = await doctor_service.register_doctor(doctor_data, certificate_url)
        return doctor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/{doctor_id}/activate-subscription", response_model=DoctorResponse)
async def activate_doctor_subscription(doctor_id: UUID, body: SubscriptionActivate):
    """
    Activate a doctor's subscription and set status to approved.
    """
    try:
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                UPDATE doctors
                SET status = 'approved',
                    subscription_plan = $1,
                    subscription_expiry = $2::DATE,
                    subscription_activated_at = now(),
                    updated_at = now()
                WHERE id = $3
                RETURNING *
                """,
                body.subscription_plan,
                body.subscription_expiry,
                doctor_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Doctor not found")
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

