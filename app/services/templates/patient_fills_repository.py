import json
import logging
from uuid import UUID
from typing import List, Dict, Any, Optional
from app.core.database import db

logger = logging.getLogger("patient_fills_repository")

class PatientFillsRepository:
    def __init__(self, db_pool=None):
        self._pool = db_pool

    @property
    def pool(self):
        return self._pool or db.pool

    async def upsert_fill(
        self,
        patient_id: UUID,
        doctor_id: UUID,
        template_id: UUID,
        template_name: str,
        filled_data: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Creates or updates a template fill record for a patient.
        Conflicts on (patient_id, template_id) and updates filled_data.
        """
        query = """
            INSERT INTO patient_template_fills (patient_id, doctor_id, template_id, template_name, filled_data)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (patient_id, template_id)
            DO UPDATE SET filled_data = $5, template_name = $4, updated_at = now()
            RETURNING *
        """
        filled_data_json = json.dumps(filled_data)
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, patient_id, doctor_id, template_id, template_name, filled_data_json)
            if row:
                item = dict(row)
                if isinstance(item.get("filled_data"), str):
                    item["filled_data"] = json.loads(item["filled_data"])
                return item
            return {}

    async def get_patient_fills(self, patient_id: UUID, doctor_id: UUID) -> List[Dict[str, Any]]:
        """
        Retrieves all templates filled for a specific patient.
        """
        query = """
            SELECT * FROM patient_template_fills
            WHERE patient_id = $1 AND doctor_id = $2
            ORDER BY updated_at DESC
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, patient_id, doctor_id)
            result = []
            for r in rows:
                item = dict(r)
                if isinstance(item.get("filled_data"), str):
                    item["filled_data"] = json.loads(item["filled_data"])
                result.append(item)
            return result

    async def get_fill(self, fill_id: UUID, doctor_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Gets a single fill by ID, checking doctor ownership.
        """
        query = """
            SELECT * FROM patient_template_fills
            WHERE id = $1 AND doctor_id = $2
        """
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, fill_id, doctor_id)
            if row:
                item = dict(row)
                if isinstance(item.get("filled_data"), str):
                    item["filled_data"] = json.loads(item["filled_data"])
                return item
            return None
