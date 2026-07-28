import os
import aiofiles
from fastapi import UploadFile
from typing import Optional
from uuid import UUID
from app.core.database import db
from app.core.security import get_password_hash
from app.schemes.doctor_schema import DoctorCreate

UPLOAD_DIR = "app/uploads/certificates"

class DoctorService:
    def __init__(self):
        # Ensure upload directory exists
        os.makedirs(UPLOAD_DIR, exist_ok=True)

    async def save_certificate(self, file: UploadFile, email: str) -> str:
        """
        Saves the uploaded certificate locally and returns the path/URL.
        In a real app, this might upload to S3.
        """
        file_ext = os.path.splitext(file.filename)[1]
        safe_filename = f"{email.replace('@', '_').replace('.', '_')}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)
            
        return f"/uploads/certificates/{safe_filename}"

    async def register_doctor(self, doctor_data: DoctorCreate, certificate_url: str) -> Optional[dict]:
        """
        Register a new doctor with 'approved' status.
        """
        hashed_password = get_password_hash(doctor_data.password)
        
        async with db.pool.acquire() as connection:
            # Check if email exists
            existing_doctor = await connection.fetchrow("SELECT id FROM doctors WHERE email = $1", doctor_data.email)
            if existing_doctor:
                raise ValueError("Email already registered")

            if doctor_data.department_id:
                # Convert string department_id to UUID if needed
                from uuid import UUID
                dept_uuid = UUID(doctor_data.department_id) if isinstance(doctor_data.department_id, str) else doctor_data.department_id
                dept_active = await connection.fetchval(
                    "SELECT is_active FROM departments WHERE id = $1", 
                    dept_uuid
                )
                if dept_active is False:
                    raise ValueError("القسم المطلوب معطل حالياً من قبل الإدارة.")
                
            query = """
            INSERT INTO doctors (
                name, email, phone, password_hash, specialization, department_id,
                certificate_url, profile_image_url, calendar_provider, calendar_id, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
            ) RETURNING *
            """
            
            row = await connection.fetchrow(
                query,
                doctor_data.name,
                doctor_data.email,
                doctor_data.phone,
                hashed_password,
                doctor_data.specialization,
                doctor_data.department_id,
                certificate_url,
                doctor_data.profile_image_url,
                doctor_data.calendar_provider,
                doctor_data.calendar_id,
                doctor_data.status if doctor_data.status else 'pending'
            )
            return dict(row) if row else None

    async def get_doctor_by_id(self, doctor_id: UUID) -> Optional[dict]:
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow("SELECT * FROM doctors WHERE id = $1", doctor_id)
            return dict(row) if row else None

    async def update_doctor(self, doctor_id: UUID, name: str, email: str, specialization: str) -> Optional[dict]:
        async with db.pool.acquire() as connection:
            # Check if email is taken by someone else
            existing = await connection.fetchrow(
                "SELECT id FROM doctors WHERE email = $1 AND id != $2", 
                email, doctor_id
            )
            if existing:
                raise ValueError("Email already in use by another account")
                
            query = """
            UPDATE doctors 
            SET name = $1, email = $2, specialization = $3, updated_at = now() 
            WHERE id = $4 
            RETURNING *
            """
            row = await connection.fetchrow(query, name, email, specialization, doctor_id)
            return dict(row) if row else None

    async def delete_doctor(self, doctor_id: UUID):
        async with db.pool.acquire() as connection:
            # Delete doctor's appointments, sessions, and subscriptions to ensure foreign key integrity
            await connection.execute("DELETE FROM appointments WHERE doctor_id = $1", doctor_id)
            await connection.execute("DELETE FROM sessions WHERE doctor_id = $1", doctor_id)
            await connection.execute("DELETE FROM subscriptions WHERE doctor_id = $1", doctor_id)
            await connection.execute("DELETE FROM doctors WHERE id = $1", doctor_id)

doctor_service = DoctorService()
