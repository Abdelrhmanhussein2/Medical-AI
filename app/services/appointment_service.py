from app.core.database import db
from app.schemes.appointment_schema import AppointmentCreate
from uuid import UUID
from typing import Optional
from datetime import date


class AppointmentService:

    @staticmethod
    async def create_appointment(data: AppointmentCreate):
        query = """
            INSERT INTO appointments (
                doctor_id, patient_id, appointment_date, appointment_time,
                duration_minutes, description, patient_phone
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        """
        async with db.pool.acquire() as conn:
            try:
                row = await conn.fetchrow(
                    query,
                    str(data.doctor_id),
                    str(data.patient_id),
                    data.appointment_date,
                    data.appointment_time,
                    data.duration_minutes,
                    data.description,
                    data.patient_phone,
                )
                return dict(row) if row else None
            except Exception as e:
                # Handle unique constraint (same doctor, date, time)
                if "unique" in str(e).lower():
                    raise ValueError("هذا الوقت محجوز بالفعل لدى الدكتور")
                raise e

    @staticmethod
    async def get_doctor_appointments(
        doctor_id: str,
        filter_date: Optional[date] = None
    ):
        if filter_date:
            query = """
                SELECT a.*, p.name as patient_name, p.phone as patient_phone_num
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.doctor_id = $1 AND a.appointment_date = $2
                ORDER BY a.appointment_time ASC
            """
            async with db.pool.acquire() as conn:
                rows = await conn.fetch(query, doctor_id, filter_date)
        else:
            query = """
                SELECT a.*, p.name as patient_name, p.phone as patient_phone_num
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                WHERE a.doctor_id = $1
                ORDER BY a.appointment_date DESC, a.appointment_time ASC
            """
            async with db.pool.acquire() as conn:
                rows = await conn.fetch(query, doctor_id)

        return [dict(r) for r in rows]

    @staticmethod
    async def get_appointment(appointment_id: str):
        query = """
            SELECT a.*, p.name as patient_name, p.phone as patient_phone_num
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.id = $1
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, appointment_id)
            return dict(row) if row else None

    @staticmethod
    async def update_appointment_status(appointment_id: str, new_status: str):
        allowed = {"confirmed", "completed", "cancelled", "no_show", "scheduled"}
        if new_status not in allowed:
            raise ValueError(f"حالة غير صالحة. الحالات المسموحة: {allowed}")

        query = """
            UPDATE appointments
            SET status = $1
            WHERE id = $2
            RETURNING *
        """
        async with db.pool.acquire() as conn:
            row = await conn.fetchrow(query, new_status, appointment_id)
            return dict(row) if row else None
