"""
Session Controller — API endpoints للجلسات الطبية
"""
from fastapi import APIRouter, HTTPException, status, File, UploadFile, Depends
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from app.services.session_service import SessionService
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/sessions", tags=["Sessions"], dependencies=[Depends(get_current_user)])

async def assert_session_owner(session_id: str, current_user: dict):
    session = await SessionService.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    role = current_user.get("role")
    if role == "doctor" and str(session.get("doctor_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول لمحتوى هذه الجلسة.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                UUID(str(session["doctor_id"])), UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الجلسة لا تخص أطباء قسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")
    return session

@router.post("/{session_id}/chunks")
async def upload_audio_chunk(session_id: UUID, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """رفع جزء صوتي من الجلسة وتفريغه ودمجه في النص الكامل"""
    await assert_session_owner(str(session_id), current_user)
    try:
        result = await SessionService.process_audio_chunk(str(session_id), file)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل معالجة جزء الصوت: {str(e)}")


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
    summary_format: Optional[str] = "soap"


class CompleteRequest(BaseModel):
    duration_seconds: int


# ---- Endpoints ----

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_session(data: SessionCreate, current_user: dict = Depends(get_current_user)):
    """إنشاء جلسة جديدة عند بدء التسجيل"""
    role = current_user.get("role")
    if role == "doctor" and str(current_user["id"]) != str(data.doctor_id):
        raise HTTPException(status_code=403, detail="لا يمكنك إنشاء جلسات لأطباء آخرين.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                UUID(str(data.doctor_id)), UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الطبيب لا ينتمي لقسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    try:
        session = await SessionService.create_session(
            doctor_id=data.doctor_id,
            appointment_id=data.appointment_id,
            patient_id=data.patient_id
        )
        if not session:
            raise HTTPException(status_code=400, detail="تعذر إنشاء الجلسة")
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{session_id}/transcript")
async def update_transcript(session_id: UUID, data: TranscriptUpdate, current_user: dict = Depends(get_current_user)):
    """تحديث نص الجلسة أثناء التسجيل أو عند الانتهاء"""
    await assert_session_owner(str(session_id), current_user)
    result = await SessionService.update_transcript(
        session_id=str(session_id),
        transcript_raw=data.transcript_raw,
        duration_seconds=data.duration_seconds
    )
    if not result:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return result


@router.post("/{session_id}/summarize")
async def summarize_session(session_id: UUID, data: SummarizeRequest, current_user: dict = Depends(get_current_user)):
    """إرسال الجلسة للـ AI للحصول على ملخص وSOAP Note"""
    await assert_session_owner(str(session_id), current_user)
    try:
        result = await SessionService.summarize(
            session_id=str(session_id),
            patient_name=data.patient_name or "المريض",
            summary_format=data.summary_format or "soap"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل التلخيص: {str(e)}")


class SessionNotesUpdate(BaseModel):
    soap_note: Optional[dict] = None
    summary_text: Optional[str] = None
    patient_summary: Optional[str] = None


@router.patch("/{session_id}/complete")
async def complete_session(session_id: UUID, data: CompleteRequest, current_user: dict = Depends(get_current_user)):
    """إنهاء الجلسة وحفظ المدة"""
    await assert_session_owner(str(session_id), current_user)
    result = await SessionService.complete_session(
        session_id=str(session_id),
        duration_seconds=data.duration_seconds
    )
    if not result:
        raise HTTPException(status_code=404, detail="الجلسة غير موجودة")
    return result


@router.patch("/{session_id}/notes")
async def update_session_notes(session_id: UUID, data: SessionNotesUpdate, current_user: dict = Depends(get_current_user)):
    """تحديث ملاحظات الكشف والملخص للجلسة بعد المراجعة والتحرير"""
    await assert_session_owner(str(session_id), current_user)
    try:
        result = await SessionService.update_session_notes(
            session_id=str(session_id),
            soap_note=data.soap_note,
            summary_text=data.summary_text,
            patient_summary=data.patient_summary
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class PatientInstructionsRequest(BaseModel):
    raw_text: str
    patient_name: Optional[str] = "المريض"
    language: Optional[str] = "ar"


@router.post("/{session_id}/patient-instructions/format")
async def format_patient_instructions_endpoint(
    session_id: UUID,
    data: PatientInstructionsRequest,
    current_user: dict = Depends(get_current_user)
):
    """تنسيق تعليمات المراجع بالذكاء الاصطناعي من ملاحظات الطبيب الخام"""
    await assert_session_owner(str(session_id), current_user)
    if not data.raw_text or not data.raw_text.strip():
        raise HTTPException(status_code=400, detail="النص الخام مطلوب ولا يمكن أن يكون فارغاً.")
    try:
        from app.services.ai_service import format_patient_instructions
        formatted = await format_patient_instructions(
            raw_text=data.raw_text,
            patient_name=data.patient_name or "المريض",
            language=data.language or "ar"
        )
        return {"formatted_text": formatted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل تنسيق التعليمات: {str(e)}")



@router.get("/{session_id}")
async def get_session(session_id: UUID, current_user: dict = Depends(get_current_user)):
    """جلب تفاصيل جلسة"""
    return await assert_session_owner(str(session_id), current_user)


@router.get("/by-appointment/{appointment_id}")
async def get_by_appointment(appointment_id: UUID, current_user: dict = Depends(get_current_user)):
    """جلب كل الجلسات لموعد معين"""
    from app.services.appointment_service import AppointmentService
    appointment = await AppointmentService.get_appointment(str(appointment_id))
    if not appointment:
        raise HTTPException(status_code=404, detail="الموعد غير موجود")
        
    role = current_user.get("role")
    if role == "doctor" and str(appointment.get("doctor_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="غير مصرح لك بعرض جلسات هذا الموعد.")
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

    return await SessionService.get_sessions_by_appointment(str(appointment_id))


@router.get("/by-doctor/{doctor_id}")
async def get_doctor_sessions(doctor_id: UUID, limit: int = 20, current_user: dict = Depends(get_current_user)):
    """جلب آخر جلسات الدكتور"""
    role = current_user.get("role")
    if role == "doctor" and str(current_user["id"]) != str(doctor_id):
        raise HTTPException(status_code=403, detail="غير مصرح لك بعرض جلسات طبيب آخر.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                doctor_id, UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الطبيب لا ينتمي لقسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    return await SessionService.get_doctor_sessions(str(doctor_id), limit)


@router.get("/by-patient/{patient_id}")
async def get_patient_sessions(patient_id: UUID, current_user: dict = Depends(get_current_user)):
    """جلب كل الجلسات لمريض معين"""
    from app.services.patient_service import PatientService
    patient = await PatientService.get_patient(str(patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="المريض غير موجود")
        
    role = current_user.get("role")
    if role == "doctor" and patient.get("doctor_id") and str(patient["doctor_id"]) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="غير مصرح لك بعرض جلسات مريض لا يخصك.")
    elif role == "department":
        if patient.get("doctor_id"):
            from app.core.database import db
            async with db.pool.acquire() as conn:
                belongs = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                    UUID(str(patient["doctor_id"])), UUID(str(current_user["id"]))
                )
                if not belongs:
                    raise HTTPException(status_code=403, detail="المريض لا يخص أطباء قسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    return await SessionService.get_sessions_by_patient(str(patient_id))
