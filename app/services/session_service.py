"""
Session Service — CRUD operations للجلسات الطبية
"""
import json
from typing import Optional
from app.core.database import db
from app.services.ai_service import summarize_session_transcript


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
                summary_text    = $1,
                soap_note       = $2,
                patient_summary = $3,
                prescriptions   = $4,
                tasks           = $5,
                ai_model_used   = $6,
                ai_tokens_used  = $7,
                status          = 'summarized'
            WHERE id = $8
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
                ai_result.get("model", "gpt-4o-mini"),
                ai_result.get("tokens_used", 0),
                session_id
            )
        
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
