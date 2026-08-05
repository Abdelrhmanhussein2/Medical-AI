from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID
from datetime import date
from pydantic import BaseModel

from app.schemes.appointment_schema import AppointmentCreate, AppointmentResponse
from app.services.appointment_service import AppointmentService
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/appointments", tags=["Appointments"])


class StatusUpdateRequest(BaseModel):
    status: str


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    """
    حجز موعد جديد لمريض مع دكتور معين.
    لا يسمح بحجز نفس الوقت مرتين لنفس الدكتور.
    """
    if current_user.get("role") == "doctor" and str(current_user["id"]) != str(data.doctor_id):
        raise HTTPException(status_code=403, detail="لا يمكنك حجز مواعيد لأطباء آخرين.")
        
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
    doctor_id: Optional[UUID] = None,
    date: Optional[date] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    جلب مواعيد دكتور معين.
    يمكن تصفيتها بالتاريخ: ?date=2026-07-11
    أو جلب الكل بدون تصفية.
    """
    effective_doctor_id = doctor_id
    if current_user.get("role") == "doctor":
        effective_doctor_id = UUID(str(current_user["id"]))
        
    if not effective_doctor_id:
        raise HTTPException(status_code=400, detail="يجب تحديد doctor_id.")

    role = current_user.get("role")
    if role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                effective_doctor_id, UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الطبيب لا ينتمي لقسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول لمواعيد الطبيم.")

    appointments = await AppointmentService.get_doctor_appointments(
        str(effective_doctor_id), date
    )
    return appointments


@router.get("/{appointment_id}")
async def get_appointment(appointment_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    جلب تفاصيل موعد محدد.
    """
    appointment = await AppointmentService.get_appointment(str(appointment_id))
    if not appointment:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
        
    role = current_user.get("role")
    if role == "doctor" and str(appointment.get("doctor_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="غير مصرح لك بعرض هذا الموعد.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                UUID(str(appointment["doctor_id"])), UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الموعد لا يخص أطباء قسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    return appointment


@router.patch("/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: UUID,
    body: StatusUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    تغيير حالة الموعد.
    الحالات المتاحة: scheduled | confirmed | completed | cancelled | no_show
    """
    appointment = await AppointmentService.get_appointment(str(appointment_id))
    if not appointment:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
        
    role = current_user.get("role")
    if role == "doctor" and str(appointment.get("doctor_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="غير مصرح لك بتعديل هذا الموعد.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                UUID(str(appointment["doctor_id"])), UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الموعد لا يخص أطباء قسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بتعديل الموعد.")

    try:
        updated = await AppointmentService.update_appointment_status(
            str(appointment_id), body.status
        )
        if not updated:
            raise HTTPException(status_code=404, detail="الموعد غير موجود")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
