from app.core.database import db
from app.schemes.visit_schema import VisitCreate
from datetime import date


class VisitService:

    @staticmethod
    async def create_visit(data: VisitCreate):
        query = """
            INSERT INTO visits (
                patient_id, doctor_id, appointment_id,
                visit_date, description, diagnosis, notes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """
        visit_date = data.visit_date or date.today()
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(
                query,
                str(data.patient_id),
                str(data.doctor_id),
                str(data.appointment_id) if data.appointment_id else None,
                visit_date,
                data.description,
                data.diagnosis,
                data.notes,
            )
            return dict(row) if row else None

    @staticmethod
    async def get_patient_visits(patient_id: str):
        """
        جلب كل سجل الزيارات لمريض معين مرتبة من الأحدث للأقدم.
        """
        query = """
            SELECT v.*, d.name as doctor_name
            FROM visits v
            JOIN doctors d ON v.doctor_id = d.id
            WHERE v.patient_id = $1
            ORDER BY v.visit_date DESC, v.created_at DESC
        """
        async with db.pool.acquire() as conn:
            rows = await conn.fetch(query, patient_id)
            return [dict(r) for r in rows]

    @staticmethod
    async def get_visit(visit_id: str):
        query = """
            SELECT v.*, d.name as doctor_name, p.name as patient_name
            FROM visits v
            JOIN doctors d ON v.doctor_id = d.id
            JOIN patients p ON v.patient_id = p.id
            WHERE v.id = $1
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, visit_id)
            return dict(row) if row else None
