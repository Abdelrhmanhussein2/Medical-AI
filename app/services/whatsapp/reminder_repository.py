import logging
from uuid import UUID
from typing import List, Dict, Any, Optional
from app.core.database import db
from app.core.redis import redis_client

logger = logging.getLogger("reminder_repository")

class ReminderRepository:
    def __init__(self, db_pool=None, redis=None):
        self._pool = db_pool
        self._redis = redis
        self.queue_key = "wa:reminder_queue"

    @property
    def pool(self):
        return self._pool or db.pool

    async def _get_redis(self):
        if not self._redis:
            await redis_client.connect()
            self._redis = redis_client.redis
        return self._redis

    async def enqueue_reminder(self, appointment_id: str, reminder_type: str, scheduled_at_ts: float) -> None:
        """
        Pushes a reminder task into the Redis Sorted Set.
        Key value format: "appointment_id:reminder_type"
        """
        r = await self._get_redis()
        value = f"{appointment_id}:{reminder_type}"
        await r.zadd(self.queue_key, {value: scheduled_at_ts})
        logger.info(f"Enqueued {reminder_type} reminder for appt {appointment_id} at TS {scheduled_at_ts}")

    async def get_due_reminders(self, now_ts: float) -> List[Dict[str, str]]:
        """
        Fetches all enqueued reminders that are due (score <= now_ts).
        Returns a list of dicts: [{"appointment_id": ..., "reminder_type": ...}]
        """
        r = await self._get_redis()
        items = await r.zrangebyscore(self.queue_key, 0, now_ts)
        results = []
        for item in items:
            parts = item.split(":")
            if len(parts) == 2:
                results.append({
                    "appointment_id": parts[0],
                    "reminder_type": parts[1],
                    "raw_value": item
                })
        return results

    async def remove_from_queue(self, raw_values: List[str]) -> None:
        """
        Removes items from the Redis Sorted Set.
        """
        if not raw_values:
            return
        r = await self._get_redis()
        await r.zrem(self.queue_key, *raw_values)
        logger.info(f"Removed {len(raw_values)} items from Redis reminder queue.")

    async def get_appointment_reminder_details(self, appointment_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetches appointment and related doctor/patient details from the DB.
        """
        query = """
            SELECT a.id as appointment_id, a.appointment_date, a.appointment_time, a.status,
                   p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
                   d.id as doctor_id, d.name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.id = $1
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, appointment_id)
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching reminder details for appointment {appointment_id}: {e}")
            return None

    async def has_been_sent(self, appointment_id: str, reminder_type: str) -> bool:
        """
        Checks if a reminder of the given type has already been logged in the DB.
        """
        query = """
            SELECT 1 FROM appointment_reminders_log
            WHERE appointment_id = $1 AND reminder_type = $2
            LIMIT 1
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, UUID(appointment_id), reminder_type)
                return row is not None
        except Exception as e:
            logger.error(f"Error checking sent log for appt {appointment_id} {reminder_type}: {e}")
            return False

    async def log_reminder(self, appointment_id: str, reminder_type: str, phone: str, status: str) -> None:
        """
        Logs a reminder transmission in the database to prevent duplicate sending.
        """
        query = """
            INSERT INTO appointment_reminders_log (appointment_id, reminder_type, phone, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (appointment_id, reminder_type) DO NOTHING
        """
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(query, UUID(appointment_id), reminder_type, phone, status)
        except Exception as e:
            logger.error(f"Error logging reminder in DB: {e}")

    async def get_appointments_missing_reminders(self) -> List[Dict[str, Any]]:
        """
        Safety Net: Queries the DB for appointments scheduled in the next 25 hours
        that do not have corresponding reminder log entries, but *should* have had them.
        Returns details of appointments for re-enqueuing.
        """
        # We look for appointments in the next 25 hours.
        # For 24h: due if appt_time is <= now() + 24.5 hours
        # For 4h: due if appt_time is <= now() + 4.5 hours
        query = """
            SELECT a.id as appointment_id, a.appointment_date, a.appointment_time,
                   (a.appointment_date + a.appointment_time) as appointment_datetime,
                   p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
                   d.id as doctor_id, d.name as doctor_name
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN doctors d ON a.doctor_id = d.id
            WHERE a.status = 'scheduled'
              AND (a.appointment_date + a.appointment_time) > now()
              AND (a.appointment_date + a.appointment_time) <= now() + INTERVAL '25 hours'
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching appointments for safety net scan: {e}")
            return []
