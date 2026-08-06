from app.core.database import db
from app.schemes.patient_schema import PatientCreate, PatientUpdate
from typing import Optional
from uuid import UUID

class PatientService:
    @staticmethod
    async def create_patient(patient_data: PatientCreate, doctor_id: Optional[str] = None):
        effective_doctor_id = doctor_id or (str(patient_data.doctor_id) if patient_data.doctor_id else None)
        doc_uuid = UUID(effective_doctor_id) if effective_doctor_id else None

        query = """
            INSERT INTO patients (name, phone, email, national_id, date_of_birth, gender, doctor_id, file_id, diseases, habits, general_summary)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id, doctor_id, name, phone, email, national_id, date_of_birth, gender, file_id, diseases, habits, general_summary, created_at, updated_at
        """
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(
                query,
                patient_data.name,
                patient_data.phone,
                patient_data.email,
                patient_data.national_id,
                patient_data.date_of_birth,
                patient_data.gender,
                doc_uuid,
                patient_data.file_id,
                patient_data.diseases,
                patient_data.habits,
                patient_data.general_summary
            )
            return dict(row) if row else None

    @staticmethod
    async def update_patient(patient_id: str, patient_data: PatientUpdate, doctor_id: Optional[str] = None):
        """
        تعديل بيانات مريض مع دعم التحديث الجزئي (PATCH).
        """
        doc_uuid = UUID(doctor_id) if doctor_id else None
        
        # Build query dynamically
        update_data = patient_data.model_dump(exclude_unset=True)
        if not update_data:
            return await PatientService.get_patient(patient_id)
            
        set_clauses = []
        values = []
        for i, (key, val) in enumerate(update_data.items(), start=1):
            set_clauses.append(f"{key} = ${i}")
            if key == "doctor_id" and val:
                values.append(UUID(str(val)))
            else:
                values.append(val)
                
        pid_idx = len(values) + 1
        doc_idx = len(values) + 2
        
        values.append(UUID(patient_id))
        values.append(doc_uuid)
        
        query = f"""
            UPDATE patients
            SET {", ".join(set_clauses)}, updated_at = now()
            WHERE id = ${pid_idx} AND (${doc_idx}::uuid IS NULL OR doctor_id = ${doc_idx}::uuid)
            RETURNING id, doctor_id, name, phone, email, national_id, date_of_birth, gender, file_id, diseases, habits, general_summary, created_at, updated_at
        """
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(query, *values)
            return dict(row) if row else None

    @staticmethod
    async def get_patient(patient_id: str):
        query = "SELECT * FROM patients WHERE id = $1"
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(query, UUID(patient_id))
            return dict(row) if row else None

    @staticmethod
    async def search_patients(q: str = None, doctor_id: Optional[str] = None):
        """
        البحث عن مريض بالاسم أو رقم التليفون، مصفى بالطبيب الحالي.
        لو الـ doctor_id فارغ (مثال: الأدمن)، يجلب كل المرضى.
        """
        doc_uuid = UUID(doctor_id) if doctor_id else None

        if q:
            query = """
                SELECT * FROM patients
                WHERE
                    ($2::uuid IS NULL OR doctor_id = $2::uuid)
                    AND (phone ILIKE $1 OR name ILIKE $1)
                ORDER BY created_at DESC
                LIMIT 20
            """
            search_term = f"%{q}%"
            async with db.pool.acquire() as connection:
                rows = await connection.fetch(query, search_term, doc_uuid)
                return [dict(r) for r in rows]
        else:
            query = """
                SELECT * FROM patients
                WHERE ($1::uuid IS NULL OR doctor_id = $1::uuid)
                ORDER BY created_at DESC
                LIMIT 50
            """
            async with db.pool.acquire() as connection:
                rows = await connection.fetch(query, doc_uuid)
                return [dict(r) for r in rows]

    @staticmethod
    async def generate_general_summary(patient_id: str, doctor_id: Optional[str] = None):
        """
        توليد الملخص العام للمريض بالذكاء الاصطناعي بناءً على تاريخ زياراته وجلساته السابقة.
        """
        # 1. جلب المريض
        patient = await PatientService.get_patient(patient_id)
        if not patient:
            raise ValueError("Patient not found")
        
        # 2. جلب جميع الجلسات المكتملة للمريض
        from app.services.session_service import SessionService
        sessions = await SessionService.get_sessions_by_patient(patient_id)
        completed_sessions = [s for s in sessions if s.get("status") in ("summarized", "completed")]
        
        if not completed_sessions:
            return patient

        # 3. صياغة النص المرسل للموديل
        summaries_text = ""
        for idx, s in enumerate(completed_sessions, 1):
            date_str = s.get("created_at").strftime("%Y-%m-%d") if s.get("created_at") else "غير معروف"
            summary = s.get("summary_text") or "لا يوجد ملخص"
            soap = s.get("soap_note") or {}
            soap_str = f"S: {soap.get('S', '')}, O: {soap.get('O', '')}, A: {soap.get('A', '')}, P: {soap.get('P', '')}"
            summaries_text += f"\nالزيارة {idx} ({date_str}):\nالملخص: {summary}\nSOAP: {soap_str}\n"

        # 4. استدعاء الموديل للتوليد
        from app.services.ai_service import generate_global_patient_summary
        new_general_summary = await generate_global_patient_summary(summaries_text, patient.get("name"))
        
        # 5. تحديث المريض بداخل قاعدة البيانات
        from app.schemes.patient_schema import PatientUpdate
        update_data = PatientUpdate(general_summary=new_general_summary)
        return await PatientService.update_patient(patient_id, update_data, doctor_id)

