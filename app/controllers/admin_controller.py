from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemes.doctor_schema import DoctorResponse
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admins", tags=["Admins"])

class ReviewRequest(BaseModel):
    admin_id: UUID  # In a real app, this comes from the JWT token dependency
    status: str
    rejection_reason: Optional[str] = None

@router.get("/doctors/pending", response_model=List[DoctorResponse])
async def get_pending_doctors():
    """
    Get all doctors waiting for admin approval.
    """
    return await admin_service.get_pending_doctors()

@router.post("/doctors/{doctor_id}/review", response_model=DoctorResponse)
async def review_doctor(doctor_id: UUID, request: ReviewRequest):
    """
    Admin reviews a doctor and updates status to 'approved' or 'rejected'.
    """
    try:
        doctor = await admin_service.review_doctor(
            doctor_id=doctor_id,
            admin_id=request.admin_id,
            status=request.status,
            rejection_reason=request.rejection_reason
        )
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return doctor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
