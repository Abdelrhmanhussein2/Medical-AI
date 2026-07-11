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
        Register a new doctor with 'pending' status.
        """
        hashed_password = get_password_hash(doctor_data.password)
        
        async with db.pool.acquire() as connection:
            # Check if email exists
            existing_doctor = await connection.fetchrow("SELECT id FROM doctors WHERE email = $1", doctor_data.email)
            if existing_doctor:
                raise ValueError("Email already registered")
                
            query = """
            INSERT INTO doctors (
                name, email, phone, password_hash, specialization, 
                certificate_url, profile_image_url, calendar_provider, calendar_id, status
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending'
            ) RETURNING *
            """
            
            row = await connection.fetchrow(
                query,
                doctor_data.name,
                doctor_data.email,
                doctor_data.phone,
                hashed_password,
                doctor_data.specialization,
                certificate_url,
                doctor_data.profile_image_url,
                doctor_data.calendar_provider,
                doctor_data.calendar_id
            )
            return dict(row) if row else None

    async def get_doctor_by_id(self, doctor_id: UUID) -> Optional[dict]:
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow("SELECT * FROM doctors WHERE id = $1", doctor_id)
            return dict(row) if row else None

doctor_service = DoctorService()
