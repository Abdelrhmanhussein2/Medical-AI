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
    if role == "doctor":
        effective_doctor_id = str(current_user["id"])
    elif role == "department":
        if not data.doctor_id:
            raise HTTPException(status_code=400, detail="doctor_id مطلوب")
        effective_doctor_id = str(data.doctor_id)
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                UUID(effective_doctor_id), UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الطبيب لا ينتمي لقسمك.")
    elif role == "admin":
        if not data.doctor_id:
            raise HTTPException(status_code=400, detail="doctor_id مطلوب")
        effective_doctor_id = str(data.doctor_id)
    else:
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    try:
        session = await SessionService.create_session(
            doctor_id=effective_doctor_id,
            appointment_id=data.appointment_id,
            patient_id=data.patient_id
        )
        if not session:
            raise HTTPException(status_code=400, detail="تعذر إنشاء الجلسة")
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import logging
        logging.getLogger(__name__).exception("Error creating session")
        raise HTTPException(status_code=500, detail="حدث خطأ داخلي. يرجى المحاولة لاحقاً.")


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


@router.post("/{session_id}/patient-instructions/audio")
async def process_patient_instructions_audio(
    session_id: UUID,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """رفع تسجيل صوتي لتعليمات المراجع وتفريغه وتنسيقه بالذكاء الاصطناعي"""
    await assert_session_owner(str(session_id), current_user)
    
    # 1. Transcribe the audio chunk using OpenAI Whisper (similar to process_audio_chunk)
    from app.core.config import settings
    import os
    from uuid import uuid4
    
    openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
    if not openai_key:
        raise HTTPException(status_code=500, detail="OpenAI API Key is not configured.")
        
    filename = getattr(file, "filename", None) or ""
    ext = os.path.splitext(filename)[1].lower() if filename else ".webm"
    if not ext:
        ext = ".webm"
        
    upload_dir = os.path.join(os.getcwd(), "app", "uploads", "instruction_audios")
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_name = f"instruction_{session_id}_{uuid4()}{ext}"
    saved_file_path = os.path.join(upload_dir, unique_name)
    
    contents = await file.read()
    try:
        with open(saved_file_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")
        
    transcribed_text = ""
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=openai_key.strip())
        with open(saved_file_path, "rb") as audio_file:
            transcription = await client.audio.transcriptions.create(
                file=(unique_name, audio_file.read()),
                model="gpt-4o-transcribe",
                response_format="text",
                language="ar",
                prompt="التسجيل عبارة عن محادثة طبية باللغة العربية والإنجليزية، تحتوي على مصطلحات طبية، تشخيص، أسماء مرضى، وأدوية وعيادات."
            )
            transcribed_text = str(transcription).strip()
    except Exception as e:
        if os.path.exists(saved_file_path):
            os.remove(saved_file_path)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
        
    if os.path.exists(saved_file_path):
        os.remove(saved_file_path)
        
    if not transcribed_text or transcribed_text.startswith("Subtitles by") or transcribed_text.startswith("Amara.org"):
        raise HTTPException(status_code=400, detail="لم يتم كشف أي كلام واضح في التسجيل الصوتي.")

    return {"transcribed_text": transcribed_text}




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


class GenerateLetterRequest(BaseModel):
    patient_name: str
    receiving_doctor_name: Optional[str] = None
    doctor_info: Optional[str] = None  # sender info block (name, address, email)
    sender_role: Optional[str] = "referring"  # "referring" | "consulting"
    soap_note: Optional[dict] = None
    summary_text: Optional[str] = None
    language: Optional[str] = "ar"  # "ar" | "en"


@router.post("/generate-letter")
async def generate_medical_letter(
    data: GenerateLetterRequest,
    current_user: dict = Depends(get_current_user)
):
    """توليد خطاب طبي رسمي (إحالة أو استشارة) بالذكاء الاصطناعي"""
    try:
        from openai import AsyncOpenAI
        from app.core.config import settings

        if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY.startswith("sk-your"):
            raise HTTPException(status_code=503, detail="خدمة الذكاء الاصطناعي غير متاحة حالياً.")

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.strip())
        model = settings.OPENAI_MODEL or "gpt-4o-mini"

        is_ar = data.language == "ar"
        role_label = ("الطبيب المُحيل" if is_ar else "Referring Clinician") if data.sender_role == "referring" else ("الطبيب الاستشاري" if is_ar else "Consulting Clinician")
        today = __import__('datetime').date.today().strftime("%Y-%m-%d")

        # Build notes summary for the prompt
        notes_block = ""
        if data.soap_note:
            for k, v in data.soap_note.items():
                if k == "_original" or not v or not isinstance(v, str):
                    continue
                notes_block += f"- {k}: {v}\n"
        if data.summary_text:
            notes_block += f"\nملخص الزيارة:\n{data.summary_text}"

        if is_ar:
            # Map SOAP keys to Arabic labels
            soap_ar_labels = {
                "S": "الشكوى الرئيسية للمريض",
                "O": "الفحص والملاحظات الموضوعية",
                "A": "التشخيص والتقييم",
                "P": "الخطة العلاجية",
                "subjective": "الشكوى الرئيسية للمريض",
                "objective": "الفحص والملاحظات الموضوعية",
                "assessment": "التشخيص والتقييم",
                "plan": "الخطة العلاجية",
            }
            notes_block_ar = ""
            if data.soap_note:
                for k, v in data.soap_note.items():
                    if k == "_original" or not v or not isinstance(v, str):
                        continue
                    ar_label = soap_ar_labels.get(k, soap_ar_labels.get(k.upper(), k))
                    notes_block_ar += f"- {ar_label}: {v}\n"
            if data.summary_text:
                notes_block_ar += f"\nملخص الزيارة:\n{data.summary_text}"

            prompt = (
                f"أنت طبيب متخصص بارع في كتابة الخطابات الطبية الرسمية باللغة العربية الفصحى.\n\n"
                f"المطلوب: اكتب خطاباً طبياً رسمياً كاملاً باللغة العربية الفصحى فقط.\n\n"
                f"⚠️ تعليمات صارمة:\n"
                f"- لا تستخدم أي حروف أو اختصارات إنجليزية إطلاقاً (مثل A: أو O: أو P: أو SOAP أو Dr. أو أي كلمة إنجليزية)\n"
                f"- اكتب جميع المصطلحات والعناوين باللغة العربية الكاملة\n"
                f"- لا تضع نقطتين بعد حروف مفردة مثل A: أو P:\n\n"
                f"بيانات الخطاب:\n"
                f"- اسم المريض: {data.patient_name}\n"
                f"- الطبيب المُرسَل إليه: {data.receiving_doctor_name or 'الزميل الطبيب'}\n"
                f"- الطبيب المُرسِل: {data.doctor_info or current_user.get('name', 'الطبيب')}\n"
                f"- دور الطبيب المُرسِل: {role_label}\n"
                f"- تاريخ الخطاب: {today}\n\n"
                f"ملاحظات الكشف الطبي:\n{notes_block_ar or 'لا توجد ملاحظات محددة'}\n\n"
                f"اكتب الخطاب كاملاً بأسلوب طبي رسمي يشمل:\n"
                f"1. التحية والمقدمة\n"
                f"2. سبب الإحالة أو الاستشارة مع ذكر المريض والحالة\n"
                f"3. الملاحظات السريرية الرئيسية والتشخيص\n"
                f"4. الخطة العلاجية أو التوصيات\n"
                f"5. الخاتمة والتوقيع\n\n"
                f"تذكر: الخطاب يجب أن يكون مهنياً وكاملاً باللغة العربية الفصحى فقط بدون أي أحرف أو كلمات إنجليزية."
            )
        else:
            prompt = (
                f"You are an expert physician skilled in writing formal medical letters in professional English.\n\n"
                f"Write a complete formal medical letter with the following details:\n\n"
                f"- Patient Name: {data.patient_name}\n"
                f"- To: Dr. {data.receiving_doctor_name or 'Colleague'}\n"
                f"- From: {data.doctor_info or current_user.get('name', 'Physician')}\n"
                f"- Sender Role: {role_label}\n"
                f"- Date: {today}\n\n"
                f"Clinical Notes:\n{notes_block or 'No specific notes available'}\n\n"
                f"Write the full letter professionally including:\n"
                f"1. Salutation and introduction\n"
                f"2. Reason for referral/consultation mentioning the patient and condition\n"
                f"3. Key clinical findings and diagnosis\n"
                f"4. Treatment plan or recommendations\n"
                f"5. Closing and signature\n\n"
                f"The letter must be professional, complete, and suitable for sharing with the receiving physician."
            )

        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500
        )
        letter_text = response.choices[0].message.content.strip()
        return {"letter": letter_text, "date": today}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"فشل توليد الخطاب: {str(e)}")
