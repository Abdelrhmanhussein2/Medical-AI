from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import UUID
from datetime import date
from pydantic import BaseModel

from app.schemes.appointment_schema import AppointmentCreate, AppointmentResponse
from app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class StatusUpdateRequest(BaseModel):
    status: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_appointment(data: AppointmentCreate):
    """
    حجز موعد جديد لمريض مع دكتور معين.
    لا يسمح بحجز نفس الوقت مرتين لنفس الدكتور.
    """
    try:
        appointment = await AppointmentService.create_appointment(data)
        if not appointment:
            raise HTTPException(status_code=400, detail="تعذر إنشاء الموعد")
        return appointment
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"خطأ داخلي: {str(e)}")


@router.get("/my")
async def get_my_appointments(
    doctor_id: UUID,
    date: Optional[date] = None
):
    """
    جلب مواعيد دكتور معين.
    يمكن تصفيتها بالتاريخ: ?date=2026-07-11
    أو جلب الكل بدون تصفية.
    """
    appointments = await AppointmentService.get_doctor_appointments(
        str(doctor_id), date
    )
    return appointments


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: UUID):
    """
    جلب تفاصيل موعد محدد.
    """
    appointment = await AppointmentService.get_appointment(str(appointment_id))
    if not appointment:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
    return appointment


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: UUID,
    body: StatusUpdateRequest
):
    """
    تغيير حالة الموعد.
    الحالات المتاحة: scheduled | confirmed | completed | cancelled | no_show
    """
    try:
        updated = await AppointmentService.update_appointment_status(
            str(appointment_id), body.status
        )
        if not updated:
            raise HTTPException(status_code=404, detail="الموعد غير موجود")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
