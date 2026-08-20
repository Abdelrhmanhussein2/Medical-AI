from app.core.database import db
from app.schemes.appointment_schema import AppointmentCreate
from uuid import UUID
from typing import Optional, Any
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
                if row:
                    row_dict = dict(row)
                    try:
                        from datetime import datetime, timedelta
                        from app.services.whatsapp.reminder_repository import ReminderRepository
                        
                        appt_dt = datetime.combine(data.appointment_date, data.appointment_time)
                        now = datetime.now()
                        reminder_repo = ReminderRepository(db_pool=db.pool)
                        
                        time_24h = appt_dt - timedelta(hours=24)
                        if time_24h > now:
                            await reminder_repo.enqueue_reminder(str(row_dict["id"]), "24h", time_24h.timestamp())
                        
                        time_4h = appt_dt - timedelta(hours=4)
                        if time_4h > now:
                            await reminder_repo.enqueue_reminder(str(row_dict["id"]), "4h", time_4h.timestamp())
                    except Exception as err:
                        import logging
                        logging.getLogger("appointment_service").error(f"Failed to enqueue reminders: {err}")
                    return row_dict
                return None
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
                SELECT a.*, p.name as patient_name, p.phone as patient_phone_num, s.duration_seconds as session_duration
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                LEFT JOIN sessions s ON a.id = s.appointment_id
                WHERE a.doctor_id = $1 AND a.appointment_date = $2
                ORDER BY a.appointment_time ASC
            """
            async with db.pool.acquire() as conn:
                rows = await conn.fetch(query, doctor_id, filter_date)
        else:
            query = """
                SELECT a.*, p.name as patient_name, p.phone as patient_phone_num, s.duration_seconds as session_duration
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                LEFT JOIN sessions s ON a.id = s.appointment_id
                WHERE a.doctor_id = $1
                ORDER BY a.appointment_date DESC, a.appointment_time ASC
            """
            async with db.pool.acquire() as conn:
                rows = await conn.fetch(query, doctor_id)

        return [dict(r) for r in rows]

    @staticmethod
    async def get_appointment(appointment_id: str):
        query = """
            SELECT a.*, p.name as patient_name, p.phone as patient_phone_num, s.duration_seconds as session_duration
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            LEFT JOIN sessions s ON a.id = s.appointment_id
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

    @staticmethod
    async def update_appointment(
        appointment_id: str,
        appointment_date: Optional[date] = None,
        appointment_time: Optional[Any] = None, # Can be time object or datetime.time
        duration_minutes: Optional[int] = None,
        description: Optional[str] = None
    ):
        fields = []
        values = []
        i = 1
        if appointment_date is not None:
            fields.append(f"appointment_date = ${i}")
            values.append(appointment_date)
            i += 1
        if appointment_time is not None:
            fields.append(f"appointment_time = ${i}")
            values.append(appointment_time)
            i += 1
        if duration_minutes is not None:
            fields.append(f"duration_minutes = ${i}")
            values.append(duration_minutes)
            i += 1
        if description is not None:
            fields.append(f"description = ${i}")
            values.append(description)
            i += 1

        if not fields:
            return await AppointmentService.get_appointment(appointment_id)

        values.append(UUID(appointment_id))
        query = f"""
            UPDATE appointments
            SET {", ".join(fields)}, updated_at = NOW()
            WHERE id = ${i}
            RETURNING *
        """
        async with db.pool.acquire() as conn:
            try:
                row = await conn.fetchrow(query, *values)
                row_dict = dict(row) if row else None

                if row_dict:
                    # Update reminders in Redis Sorted Set
                    try:
                        from datetime import datetime, timedelta
                        from app.services.whatsapp.reminder_repository import ReminderRepository

                        reminder_repo = ReminderRepository(db_pool=db.pool)
                        # Remove existing reminders for this appointment
                        await reminder_repo.remove_from_queue([f"{appointment_id}:24h", f"{appointment_id}:4h"])

                        if row_dict["status"] == "scheduled":
                            appt_dt = datetime.combine(row_dict["appointment_date"], row_dict["appointment_time"])
                            now = datetime.now()

                            time_24h = appt_dt - timedelta(hours=24)
                            if time_24h > now:
                                await reminder_repo.enqueue_reminder(str(row_dict["id"]), "24h", time_24h.timestamp())

                            time_4h = appt_dt - timedelta(hours=4)
                            if time_4h > now:
                                await reminder_repo.enqueue_reminder(str(row_dict["id"]), "4h", time_4h.timestamp())
                    except Exception as err:
                        import logging
                        logging.getLogger("appointment_service").error(f"Failed to update reminders: {err}")

                return row_dict
            except Exception as e:
                if "unique" in str(e).lower():
                    raise ValueError("هذا الوقت محجوز بالفعل لدى الدكتور")
                raise e
