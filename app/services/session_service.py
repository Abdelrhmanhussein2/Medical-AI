"""
Session Service — CRUD operations للجلسات الطبية
"""
import json
import os
from typing import Optional
from uuid import UUID, uuid4
from app.core.database import db
from app.core.config import settings
from app.services.ai_service import summarize_session_transcript


class SessionService:
    
    @staticmethod
    async def create_session(doctor_id: str, appointment_id: Optional[str] = None, patient_id: Optional[str] = None) -> dict:
        """إنشاء جلسة جديدة بعد التحقق من حدود الباقة والاشتراك"""
        from app.services.subscription_service import SubscriptionService
        
        # 1. جلب بيانات الطبيب للتأكد من وجود حد مخصص للدقائق
        async with db.pool.acquire() as conn_check:
            doc_info = await conn_check.fetchrow(
                "SELECT custom_minutes_limit, department_id FROM doctors WHERE id = $1", 
                UUID(str(doctor_id))
            )
        custom_minutes_limit = doc_info.get("custom_minutes_limit") if doc_info else None
        is_org_doctor = bool(doc_info.get("department_id")) if doc_info else False
        
        # 2. جلب الاشتراك النشط للطبيب
        sub = await SubscriptionService.get_active_subscription(UUID(str(doctor_id)), is_department=False)
        if not sub:
            if is_org_doctor:
                raise ValueError("حسابك تابع لمنظمة. يرجى التواصل مع مسؤول المنظمة لتفعيل اشتراكك قبل بدء الجلسات الطبية.")
            else:
                raise ValueError("انتهت الفترة التجريبية أو ليس لديك اشتراك نشط. يرجى الاشتراك في إحدى الباقات للتمكن من بدء الجلسات الطبية.")
            
        # 3. تحديد الدقائق المتاحة للباقة المفعّلة أو الحد المخصص
        if custom_minutes_limit is not None:
            allowed_minutes = custom_minutes_limit
        elif sub.get("allowed_minutes") is not None:
            # Read directly from subscription_bundles.allowed_minutes (added via migration)
            allowed_minutes = sub["allowed_minutes"]
        else:
            # Legacy fallback: derive from bundle name
            bundle_name = sub.get("bundle_name") or ""
            name_clean = bundle_name.lower().strip()
            allowed_minutes = 60
            if "basic" in name_clean:
                allowed_minutes = 1500
            elif "pro" in name_clean:
                allowed_minutes = 3000
            elif "org_4" in name_clean or "4_doctors" in name_clean:
                allowed_minutes = 6000
            elif "org_7" in name_clean or "7_doctors" in name_clean:
                allowed_minutes = 8000
            elif "starter" in name_clean:
                allowed_minutes = 1000
            elif "business" in name_clean:
                allowed_minutes = 3500
            elif "enterprise" in name_clean:
                allowed_minutes = 5000
            
        # 3. التحقق من تجاوز الاستهلاك للدقائق المتاحة
        used_minutes = sub.get("used_minutes", 0)
        if used_minutes >= allowed_minutes:
            raise ValueError(
                f"لقد استهلكت كافة الدقائق المتاحة في باقتك الحالية ({used_minutes}/{allowed_minutes} دقيقة). "
                "يرجى تجديد اشتراكك أو الترقية لباقة أعلى للتمكن من بدء جلسات كشف جديدة."
            )
            
        # 4. إنشاء الجلسة في حالة سماح الرصيد
        query = """
            INSERT INTO sessions (doctor_id, appointment_id, patient_id, status)
            VALUES ($1, $2, $3, 'in_progress')
            RETURNING id, doctor_id, appointment_id, patient_id, status, created_at
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                query, 
                UUID(str(doctor_id)), 
                UUID(str(appointment_id)) if appointment_id else None, 
                UUID(str(patient_id)) if patient_id else None
            )
            return dict(row) if row else None
            
    @staticmethod
    async def process_audio_chunk(session_id: str, file) -> dict:
        """
        يستقبل جزء من الصوت، يرسله لـ OpenAI Whisper لتفريغه،
        ثم يدمجه في transcript_raw للجلسة المعنية.
        """
        openai_key = settings.OPENAI_API_KEY or os.environ.get("OPENAI_API_KEY", "")
        if not openai_key:
            raise ValueError("OpenAI API Key is not configured.")

        # 1. التحقق من وجود الجلسة أولاً
        check_query = "SELECT id, transcript_raw FROM sessions WHERE id = $1"
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(check_query, UUID(session_id))
            if not row:
                raise ValueError("Session not found")
        
        # 2. حفظ الملف الصوتي مؤقتاً
        filename = getattr(file, "filename", None) or ""
        ext = os.path.splitext(filename)[1].lower() if filename else ".webm"
        if not ext:
            ext = ".webm"
            
        upload_dir = os.path.join(os.getcwd(), "app", "uploads", "session_chunks")
        os.makedirs(upload_dir, exist_ok=True)
        
        unique_name = f"{session_id}_{uuid4()}{ext}"
        saved_file_path = os.path.join(upload_dir, unique_name)
        
        contents = await file.read()
        try:
            with open(saved_file_path, "wb") as f:
                f.write(contents)
        except Exception as e:
            raise RuntimeError(f"Failed to save chunk file: {str(e)}")
            
        # 3. إرسال لـ OpenAI Whisper
        chunk_text = ""
        try:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=openai_key.strip())
            with open(saved_file_path, "rb") as audio_file:
                transcription = await client.audio.transcriptions.create(
                    file=(unique_name, audio_file.read()),
                    model="whisper-1",
                    response_format="text"
                )
                chunk_text = str(transcription).strip()
        except Exception as e:
            if os.path.exists(saved_file_path):
                os.remove(saved_file_path)
            raise RuntimeError(f"OpenAI Whisper transcription failed: {str(e)}")
            
        # 4. مسح الملف المؤقت من القرص فوراً
        if os.path.exists(saved_file_path):
            os.remove(saved_file_path)
            
        # إذا لم يتم كشف أي كلام في هذا الجزء
        if not chunk_text or chunk_text.startswith("Subtitles by") or chunk_text.startswith("Amara.org"):
            chunk_text = ""
            
        # 5. تحديث قاعدة البيانات وإلحاق النص الجديد
        if chunk_text:
            update_query = """
                UPDATE sessions 
                SET transcript_raw = CASE 
                    WHEN transcript_raw IS NULL OR TRIM(transcript_raw) = '' THEN $1
                    ELSE transcript_raw || '\n' || $1
                END
                WHERE id = $2
                RETURNING transcript_raw
            """
            async with db.pool.acquire() as conn:
                res_row = await conn.fetchrow(update_query, chunk_text, UUID(session_id))
                updated_transcript = res_row["transcript_raw"] if res_row else ""
        else:
            updated_transcript = row["transcript_raw"] or ""

        return {
            "chunk_text": chunk_text,
            "transcript_raw": updated_transcript
        }
    
    @staticmethod
    async def update_transcript(session_id: str, transcript_raw: str, duration_seconds: int = 0) -> dict:
        """تحديث نص الجلسة"""
        query = """
            UPDATE sessions 
            SET transcript_raw = $1, duration_seconds = $2
            WHERE id = $3
            RETURNING id, status, duration_seconds
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, transcript_raw, duration_seconds, session_id)
            return dict(row) if row else None
    
    @staticmethod
    async def summarize(session_id: str, patient_name: str = "المريض", summary_format: str = "soap") -> dict:
        """
        يجلب نص الجلسة، يرسله للـ AI، ويحفظ النتيجة.
        """
        # جلب الجلسة
        get_query = "SELECT * FROM sessions WHERE id = $1"
        async with db.pool.acquire() as conn:
            session_row = await conn.fetchrow(get_query, session_id)
        
        if not session_row:
            raise ValueError(f"Session {session_id} not found")
        
        session = dict(session_row)
        transcript = session.get("transcript_raw") or ""
        
        if not transcript.strip():
            transcript = "لم يتم تسجيل أي نص في هذه الجلسة."
        
        # إرسال للـ AI
        ai_result = await summarize_session_transcript(transcript, patient_name, summary_format)
        
        # حفظ النتيجة
        update_query = """
            UPDATE sessions SET
                summary_text         = $1,
                soap_note            = $2,
                patient_summary      = $3,
                prescriptions        = $4,
                tasks                = $5,
                ai_model_used        = $6,
                ai_tokens_used       = $7,
                ai_prompt_tokens     = $8,
                ai_completion_tokens = $9,
                status               = 'summarized'
            WHERE id = $10
            RETURNING *
        """
        soap_note_json = json.dumps(ai_result.get("soap_note", {}), ensure_ascii=False)
        prescriptions_json = json.dumps(ai_result.get("prescriptions", []), ensure_ascii=False)
        tasks_json = json.dumps(ai_result.get("tasks", []), ensure_ascii=False)
        
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                update_query,
                ai_result.get("summary"),
                soap_note_json,
                ai_result.get("patient_summary"),
                prescriptions_json,
                tasks_json,
                ai_result.get("model", settings.OPENAI_MODEL),
                ai_result.get("tokens_used", 0),
                ai_result.get("prompt_tokens", 0),
                ai_result.get("completion_tokens", 0),
                session_id
            )
            
            # Log token usage to database
            tokens_used = ai_result.get("tokens_used", 0)
            if row and tokens_used > 0:
                try:
                    from uuid import UUID
                    doc_id = row.get("doctor_id") or session.get("doctor_id")
                    if doc_id:
                        await conn.execute(
                            """
                            INSERT INTO token_usage_logs (
                                doctor_id, service_type, model_name,
                                prompt_tokens, completion_tokens, total_tokens
                            )
                            VALUES ($1, $2, $3, $4, $5, $6)
                            """,
                            UUID(str(doc_id)), "summarization", ai_result.get("model", settings.OPENAI_MODEL),
                            ai_result.get("prompt_tokens", 0), ai_result.get("completion_tokens", 0), tokens_used
                        )
                except Exception as log_err:
                    print(f"Failed to log summarization tokens: {log_err}")
        
        if not row:
            raise ValueError("Failed to save session summary")
        
        result = dict(row)
        # تحويل JSONB strings إلى dicts
        if result.get("soap_note"):
            try:
                result["soap_note"] = json.loads(result["soap_note"])
            except Exception:
                pass
        if result.get("prescriptions"):
            try:
                result["prescriptions"] = json.loads(result["prescriptions"])
            except Exception:
                pass
        if result.get("tasks"):
            try:
                result["tasks"] = json.loads(result["tasks"])
            except Exception:
                pass

        # Update general summary of the patient automatically
        patient_id = result.get("patient_id")
        if patient_id:
            try:
                from app.services.patient_service import PatientService
                # Update patient chronic diseases & habits if extracted in the current session
                extracted_diseases = ai_result.get("extracted_diseases")
                extracted_habits = ai_result.get("extracted_habits")
                if (extracted_diseases and extracted_diseases.strip() and extracted_diseases.lower() != "null") or (extracted_habits and extracted_habits.strip() and extracted_habits.lower() != "null"):
                    patient_data = await PatientService.get_patient(str(patient_id))
                    if patient_data:
                        patient_updates = {}
                        
                        # Merge chronic diseases
                        if extracted_diseases and extracted_diseases.strip() and extracted_diseases.lower() != "null":
                            existing_diseases = patient_data.get("diseases") or ""
                            clean_existing = existing_diseases.strip().lower()
                            if not clean_existing or clean_existing in ["لا يوجد", "none", "null", ""]:
                                patient_updates["diseases"] = extracted_diseases.strip()
                            elif extracted_diseases.strip().lower() not in clean_existing:
                                # Append newly mentioned diseases
                                patient_updates["diseases"] = f"{existing_diseases.strip()}، {extracted_diseases.strip()}"
                                
                        # Merge habits
                        if extracted_habits and extracted_habits.strip() and extracted_habits.lower() != "null":
                            existing_habits = patient_data.get("habits") or ""
                            clean_existing = existing_habits.strip().lower()
                            if not clean_existing or clean_existing in ["لا يوجد", "none", "null", ""]:
                                patient_updates["habits"] = extracted_habits.strip()
                            elif extracted_habits.strip().lower() not in clean_existing:
                                # Append newly mentioned habits
                                patient_updates["habits"] = f"{existing_habits.strip()}، {extracted_habits.strip()}"
                                
                        if patient_updates:
                            from app.schemes.patient_schema import PatientUpdate
                            await PatientService.update_patient(str(patient_id), PatientUpdate(**patient_updates))

                # This compiles all historical sessions (including the one just finalized)
                # and updates general_summary in the patients table
                await PatientService.generate_general_summary(str(patient_id))
            except Exception as ex:
                print(f"Failed to automatically update patient medical details / summary: {ex}")

        return result
    
    @staticmethod
    async def update_session_notes(session_id: str, soap_note: Optional[dict] = None, summary_text: Optional[str] = None, patient_summary: Optional[str] = None) -> dict:
        """تحديث ملاحظات الكشف والملخص للجلسة بعد المراجعة والتحرير"""
        updates = []
        params = []
        
        if soap_note is not None:
            params.append(json.dumps(soap_note, ensure_ascii=False))
            updates.append(f"soap_note = ${len(params)}")
            
        if summary_text is not None:
            params.append(summary_text)
            updates.append(f"summary_text = ${len(params)}")
            
        if patient_summary is not None:
            params.append(patient_summary)
            updates.append(f"patient_summary = ${len(params)}")
            
        if not updates:
            return await SessionService.get_session(session_id)
            
        params.append(session_id)
        query = f"""
            UPDATE sessions 
            SET {", ".join(updates)}
            WHERE id = ${len(params)}
            RETURNING *
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, *params)
            if not row:
                return None
            result = dict(row)
            if result.get("soap_note"):
                result["soap_note"] = json.loads(result["soap_note"])
            if result.get("prescriptions"):
                result["prescriptions"] = json.loads(result["prescriptions"])
            if result.get("tasks"):
                result["tasks"] = json.loads(result["tasks"])
            return result
            
    @staticmethod
    async def complete_session(session_id: str, duration_seconds: int) -> dict:
        """إنهاء الجلسة وتغيير الحالة إلى completed"""
        query = """
            UPDATE sessions 
            SET status = 'completed', duration_seconds = $1
            WHERE id = $2
            RETURNING id, status, duration_seconds
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, duration_seconds, session_id)
            return dict(row) if row else None
    
    @staticmethod
    async def get_session(session_id: str) -> Optional[dict]:
        """جلب جلسة بالـ ID"""
        query = "SELECT * FROM sessions WHERE id = $1"
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, session_id)
            if not row:
                return None
            result = dict(row)
            if result.get("soap_note"):
                result["soap_note"] = json.loads(result["soap_note"])
            if result.get("prescriptions"):
                result["prescriptions"] = json.loads(result["prescriptions"])
            if result.get("tasks"):
                result["tasks"] = json.loads(result["tasks"])
            return result
    
    @staticmethod
    async def get_sessions_by_appointment(appointment_id: str) -> list:
        """جلب كل الجلسات لموعد معين"""
        query = """
            SELECT id, status, duration_seconds, summary_text, created_at
            FROM sessions 
            WHERE appointment_id = $1
            ORDER BY created_at DESC
        """
        async with db.pool.acquire() as conn:
            rows = await conn.fetch(query, appointment_id)
            return [dict(r) for r in rows]
    
    @staticmethod
    async def get_doctor_sessions(doctor_id: str, limit: int = 20) -> list:
        """جلب آخر الجلسات للدكتور"""
        query = """
            SELECT s.id, s.status, s.duration_seconds, s.summary_text, s.created_at,
                   p.name as patient_name
            FROM sessions s
            LEFT JOIN patients p ON p.id = s.patient_id
            WHERE s.doctor_id = $1
            ORDER BY s.created_at DESC
            LIMIT $2
        """
        async with db.pool.acquire() as conn:
            rows = await conn.fetch(query, doctor_id, limit)
            return [dict(r) for r in rows]

    @staticmethod
    async def get_sessions_by_patient(patient_id: str) -> list:
        """جلب كل الجلسات الطبية لمريض معين"""
        query = """
            SELECT id, status, duration_seconds, summary_text, soap_note, patient_summary, prescriptions, tasks, ai_model_used, ai_tokens_used, ai_prompt_tokens, ai_completion_tokens, created_at, transcript_raw
            FROM sessions 
            WHERE patient_id = $1
            ORDER BY created_at DESC
        """
        async with db.pool.acquire() as conn:
            rows = await conn.fetch(query, UUID(patient_id))
            results = []
            for r in rows:
                item = dict(r)
                if item.get("soap_note"):
                    try:
                        item["soap_note"] = json.loads(item["soap_note"])
                    except Exception:
                        pass
                if item.get("prescriptions"):
                    try:
                        item["prescriptions"] = json.loads(item["prescriptions"])
                    except Exception:
                        pass
                if item.get("tasks"):
                    try:
                        item["tasks"] = json.loads(item["tasks"])
                    except Exception:
                        pass
                results.append(item)
            return results
