import logging
from uuid import UUID
from typing import List, Optional, Dict, Any
from app.core.database import db

logger = logging.getLogger("whatsapp_repository")

class WhatsAppRepository:
    def __init__(self, db_pool=None):
        """
        Database repository for WhatsApp logs and patient/doctor queries.
        
        Args:
            db_pool: asyncpg Pool instance (optional, defaults to core db.pool).
        """
        self._pool = db_pool

    @property
    def pool(self):
        return self._pool or db.pool

    async def get_visits_due_followup_24h(self) -> List[Dict[str, Any]]:
        """
        Retrieves visits created between 24 and 48 hours ago that do not
        have a corresponding 'followup_24h' log in whatsapp_message_log.
        """
        query = """
            SELECT v.id as visit_id, v.created_at, v.notes,
                   p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
                   d.id as doctor_id, d.name as doctor_name
            FROM visits v
            JOIN patients p ON v.patient_id = p.id
            JOIN doctors d ON v.doctor_id = d.id
            LEFT JOIN whatsapp_message_log wml ON wml.visit_id = v.id AND wml.msg_type = 'followup_24h'
            WHERE v.created_at <= now() - INTERVAL '24 hours'
              AND v.created_at > now() - INTERVAL '48 hours'
              AND wml.id IS NULL
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching visits due for 24h followup: {e}")
            return []

    async def get_patients_due_reminder_6m(self) -> List[Dict[str, Any]]:
        """
        Retrieves patients whose first visit was created between 180 and 181 days ago
        and who have not received a 'reminder_6m' WhatsApp message.
        """
        query = """
            WITH first_visits AS (
                SELECT patient_id, MIN(created_at) as first_visit_at
                FROM visits
                GROUP BY patient_id
            )
            SELECT fv.patient_id, p.name as patient_name, p.phone as patient_phone, fv.first_visit_at
            FROM first_visits fv
            JOIN patients p ON fv.patient_id = p.id
            LEFT JOIN whatsapp_message_log wml ON wml.patient_id = p.id AND wml.msg_type = 'reminder_6m'
            WHERE fv.first_visit_at <= now() - INTERVAL '180 days'
              AND fv.first_visit_at > now() - INTERVAL '181 days'
              AND wml.id IS NULL
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query)
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching patients due for 6m reminder: {e}")
            return []

    async def log_message(
        self,
        patient_id: Optional[UUID],
        doctor_id: Optional[UUID],
        visit_id: Optional[UUID],
        msg_type: str,
        phone: str,
        content: str,
        status: str = "sent"
    ) -> None:
        """
        Logs an outbound WhatsApp message in the database.
        """
        query = """
            INSERT INTO whatsapp_message_log (
                patient_id, doctor_id, visit_id, msg_type, phone, content, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        try:
            async with self.pool.acquire() as conn:
                await conn.execute(
                    query,
                    patient_id,
                    doctor_id,
                    visit_id,
                    msg_type,
                    phone,
                    content,
                    status
                )
        except Exception as e:
            logger.error(f"Error logging WhatsApp message: {e}")

    async def get_patient_by_phone(self, phone: str) -> Optional[Dict[str, Any]]:
        """
        Finds a patient by phone number. Compares the last 9 digits
        to handle country code variations (e.g. +9665..., 05..., 5...).
        """
        # Extract only digits
        digits = "".join(filter(str.isdigit, phone))
        if len(digits) < 9:
            return None
            
        last_9_digits = digits[-9:]
        
        query = """
            SELECT p.id as patient_id, p.name as patient_name, p.phone as patient_phone,
                   d.id as doctor_id, d.name as doctor_name, d.phone as doctor_phone
            FROM patients p
            LEFT JOIN doctors d ON p.doctor_id = d.id
            WHERE RIGHT(REGEXP_REPLACE(p.phone, '\D', 'g'), 9) = $1
            LIMIT 1
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, last_9_digits)
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching patient by phone {phone}: {e}")
            return None

    async def get_doctor_phone(self, doctor_id: UUID) -> Optional[str]:
        """
        Retrieves a doctor's phone number by their ID.
        """
        query = "SELECT phone FROM doctors WHERE id = $1"
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, doctor_id)
                return row["phone"] if row else None
        except Exception as e:
            logger.error(f"Error fetching doctor phone for {doctor_id}: {e}")
            return None

    async def get_last_visit_for_patient(self, patient_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Gets the most recent visit details for a patient.
        """
        query = """
            SELECT id as visit_id, notes, created_at
            FROM visits
            WHERE patient_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        """
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, patient_id)
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching last visit for patient {patient_id}: {e}")
            return None

    async def get_visit(self, visit_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a visit details by its ID.
        """
        query = "SELECT id as visit_id, notes, description, created_at, visit_date FROM visits WHERE id = $1"
        try:
            async with self.pool.acquire() as conn:
                row = await conn.fetchrow(query, UUID(visit_id))
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching visit {visit_id}: {e}")
            return None

    async def get_recent_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Gets the most recent message logs.
        """
        query = """
            SELECT wml.*, p.name as patient_name, d.name as doctor_name
            FROM whatsapp_message_log wml
            LEFT JOIN patients p ON wml.patient_id = p.id
            LEFT JOIN doctors d ON wml.doctor_id = d.id
            ORDER BY wml.created_at DESC
            LIMIT $1
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(query, limit)
                return [dict(r) for r in rows]
        except Exception as e:
            logger.error(f"Error fetching recent logs: {e}")
            return []
