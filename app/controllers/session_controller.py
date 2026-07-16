"""
Session Controller — API endpoints للجلسات الطبية
"""
from fastapi import APIRouter, HTTPException, status
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["Sessions"])


# ---- Pydantic Schemas ----

class SessionCreate(BaseModel):
    doctor_id: str
    appointment_id: Optional[str] = None
    patient_id: Optional[str] = None


class TranscriptUpdate(BaseModel):
    transcript_raw: str
    duration_seconds: int = 0


class SummarizeRequest(BaseModel):
    patient_name: Optional[str] = "المريض"


class CompleteRequest(BaseModel):
    duration_seconds: int


# ---- Endpoints ----

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_session(data: SessionCreate):
    """إنشاء جلسة جديدة عند بدء التسجيل"""
    try:
        session = await SessionService.create_session(
            doctor_id=data.doctor_id,
            appointment_id=data.appointment_id,
            patient_id=data.patient_id
        )
        if not session:
            raise HTTPException(status_code=400, detail="تعذر إنشاء الجلسة")
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{session_id}/transcript")
async def update_transcript(session_id: UUID, data: TranscriptUpdate):
    """تحديث نص الجلسة أثناء التسجيل أو عند الانتهاء"""
    result = await SessionService.update_transcript(
        session_id=str(session_id),
        transcript_raw=data.transcript_raw,
        duration_seconds=data.duration_seconds
    )
    if not result:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return result


@router.post("/{session_id}/summarize")
async def summarize_session(session_id: UUID, data: SummarizeRequest):
    """إرسال الجلسة للـ AI للحصول على ملخص وSOAP Note"""
    try:
        result = await SessionService.summarize(
            session_id=str(session_id),
            patient_name=data.patient_name or "المريض"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل التلخيص: {str(e)}")


@router.patch("/{session_id}/complete")
async def complete_session(session_id: UUID, data: CompleteRequest):
    """إنهاء الجلسة وحفظ المدة"""
    result = await SessionService.complete_session(
        session_id=str(session_id),
        duration_seconds=data.duration_seconds
    )
    if not result:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return result


@router.get("/{session_id}")
async def get_session(session_id: UUID):
    """جلب تفاصيل جلسة"""
    session = await SessionService.get_session(str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return session


@router.get("/by-appointment/{appointment_id}")
async def get_by_appointment(appointment_id: UUID):
    """جلب كل الجلسات لموعد معين"""
    return await SessionService.get_sessions_by_appointment(str(appointment_id))


@router.get("/by-doctor/{doctor_id}")
async def get_doctor_sessions(doctor_id: UUID, limit: int = 20):
    """جلب آخر جلسات الدكتور"""
    return await SessionService.get_doctor_sessions(str(doctor_id), limit)
