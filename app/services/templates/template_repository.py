import json
import logging
from uuid import UUID
from typing import List, Dict, Any, Optional
from app.core.database import db

logger = logging.getLogger("template_repository")

class TemplateRepository:
    def __init__(self, db_pool=None):
        self._pool = db_pool

    @property
    def pool(self):
        return self._pool or db.pool

    async def create(self, doctor_id: UUID, name: str, fields: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Creates a new template for a doctor in note_templates.
        """
        query = """
            INSERT INTO note_templates (doctor_id, name, fields)
            VALUES ($1, $2, $3)
            RETURNING *
        """
        # Serialize fields list of dicts to json
        fields_json = json.dumps(fields)
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, doctor_id, name, fields_json)
            if row:
                item = dict(row)
                if isinstance(item.get("fields"), str):
                    item["fields"] = json.loads(item["fields"])
                return item
            return {}

    async def list_by_doctor(self, doctor_id: UUID) -> List[Dict[str, Any]]:
        """
        Lists all templates created by a specific doctor.
        """
        query = "SELECT * FROM note_templates WHERE doctor_id = $1 ORDER BY created_at DESC"
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, doctor_id)
            result = []
            for r in rows:
                item = dict(r)
                # Parse fields JSON if it's string (asyncpg might auto-parse JSONB as list/dict)
                if isinstance(item.get("fields"), str):
                    item["fields"] = json.loads(item["fields"])
                result.append(item)
            return result

    async def get_by_id(self, template_id: UUID, doctor_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Gets a single template by ID, verifying ownership by doctor_id.
        """
        query = "SELECT * FROM note_templates WHERE id = $1 AND doctor_id = $2"
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, template_id, doctor_id)
            if row:
                item = dict(row)
                if isinstance(item.get("fields"), str):
                    item["fields"] = json.loads(item["fields"])
                return item
            return None

    async def delete(self, template_id: UUID, doctor_id: UUID) -> bool:
        """
        Deletes a template, verifying ownership.
        """
        query = "DELETE FROM note_templates WHERE id = $1 AND doctor_id = $2"
        async with self.pool.acquire() as conn:
            res = await conn.execute(query, template_id, doctor_id)
            return "DELETE 1" in res or "1" in res

    async def update(self, template_id: UUID, doctor_id: UUID, name: str, fields: List[Dict[str, str]]) -> Optional[Dict[str, Any]]:
        """
        Updates an existing template's name and fields, verifying ownership.
        """
        query = """
            UPDATE note_templates
            SET name = $1, fields = $2, updated_at = now()
            WHERE id = $3 AND doctor_id = $4
            RETURNING *
        """
        fields_json = json.dumps(fields)
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, name, fields_json, template_id, doctor_id)
            if row:
                item = dict(row)
                if isinstance(item.get("fields"), str):
                    item["fields"] = json.loads(item["fields"])
                return item
            return None

    async def search_field_registry(self, search_query: str, limit: int = 10) -> List[str]:
        """
        Returns autocomplete suggestions of field names from the registry.
        """
        query = """
            SELECT field_name FROM template_field_registry
            WHERE field_name ILIKE $1
            ORDER BY usage_count DESC, created_at DESC
            LIMIT $2
        """
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, f"%{search_query}%", limit)
            return [r["field_name"] for r in rows]

    async def upsert_registry_fields(self, field_names: List[str]) -> None:
        """
        Adds or increments the usage count of field names in the global registry.
        """
        if not field_names:
            return
        query = """
            INSERT INTO template_field_registry (field_name, usage_count)
            VALUES ($1, 1)
            ON CONFLICT (field_name)
            DO UPDATE SET usage_count = template_field_registry.usage_count + 1
        """
        async with self.pool.acquire() as conn:
            # Execute in batch/transaction
            async with conn.transaction():
                for name in field_names:
                    # Clean up spaces
                    clean_name = name.strip()
                    if clean_name:
                        await conn.execute(query, clean_name)
