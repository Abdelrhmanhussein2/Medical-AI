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
from groq import AsyncGroq


class SessionService:
    
    @staticmethod
    async def create_session(doctor_id: str, appointment_id: Optional[str] = None, patient_id: Optional[str] = None) -> dict:
        """إنشاء جلسة جديدة"""
        query = """
            INSERT INTO sessions (doctor_id, appointment_id, patient_id, status)
            VALUES ($1, $2, $3, 'in_progress')
            RETURNING id, doctor_id, appointment_id, patient_id, status, created_at
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, doctor_id, appointment_id, patient_id)
            return dict(row) if row else None
            
    @staticmethod
    async def process_audio_chunk(session_id: str, file) -> dict:
        """
        يستقبل جزء من الصوت، يرسله لـ Groq Whisper لتفريغه،
        ثم يدمجه في transcript_raw للجلسة المعنية.
        """
        api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            raise ValueError("Groq API Key is not configured.")

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
            
        # 3. إرسال لـ Groq Whisper
        chunk_text = ""
        try:
            client = AsyncGroq(api_key=api_key.strip())
            with open(saved_file_path, "rb") as audio_file:
                transcription = await client.audio.transcriptions.create(
                    file=(unique_name, audio_file.read()),
                    model="whisper-large-v3",
                    response_format="text"
                )
                chunk_text = str(transcription).strip()
        except Exception as e:
            if os.path.exists(saved_file_path):
                os.remove(saved_file_path)
            raise RuntimeError(f"Groq Whisper transcription failed: {str(e)}")
            
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
    async def summarize(session_id: str, patient_name: str = "المريض") -> dict:
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
        ai_result = await summarize_session_transcript(transcript, patient_name)
        
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
            SELECT id, status, duration_seconds, summary_text, soap_note, patient_summary, prescriptions, tasks, ai_model_used, ai_tokens_used, ai_prompt_tokens, ai_completion_tokens, created_at
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
