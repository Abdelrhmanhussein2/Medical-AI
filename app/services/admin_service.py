from typing import List, Optional
from uuid import UUID
from app.core.database import db

class AdminService:
    @staticmethod
    async def get_pending_doctors() -> List[dict]:
        async with db.pool.acquire() as connection:
            rows = await connection.fetch("SELECT * FROM doctors WHERE status = 'pending'")
            return [dict(row) for row in rows]

    @staticmethod
    async def review_doctor(doctor_id: UUID, admin_id: UUID, status: str, rejection_reason: Optional[str] = None) -> Optional[dict]:
        """
        Approve or reject a doctor. Status should be 'approved' or 'rejected'.
        """
        if status not in ['approved', 'rejected']:
            raise ValueError("Status must be either 'approved' or 'rejected'")

        async with db.pool.acquire() as connection:
            query = """
            UPDATE doctors
            SET status = $1::doctor_status, approved_by = $2, approved_at = now(), rejection_reason = $3
            WHERE id = $4
            RETURNING *
            """
            row = await connection.fetchrow(query, status, admin_id, rejection_reason, doctor_id)
            return dict(row) if row else None

admin_service = AdminService()
