from app.core.database import db
from app.schemes.patient_schema import PatientCreate
from typing import Optional
from uuid import UUID

class PatientService:
    @staticmethod
    async def create_patient(patient_data: PatientCreate, doctor_id: Optional[str] = None):
        effective_doctor_id = doctor_id or (str(patient_data.doctor_id) if patient_data.doctor_id else None)
        doc_uuid = UUID(effective_doctor_id) if effective_doctor_id else None

        query = """
            INSERT INTO patients (name, phone, email, national_id, date_of_birth, gender, doctor_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, doctor_id, name, phone, email, national_id, date_of_birth, gender, created_at, updated_at
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
                doc_uuid
            )
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
                    ($2::uuid IS NULL OR doctor_id = $2::uuid OR doctor_id IS NULL)
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
                WHERE ($1::uuid IS NULL OR doctor_id = $1::uuid OR doctor_id IS NULL)
                ORDER BY created_at DESC
                LIMIT 50
            """
            async with db.pool.acquire() as connection:
                rows = await connection.fetch(query, doc_uuid)
                return [dict(r) for r in rows]

