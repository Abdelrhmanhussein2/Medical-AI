from app.core.database import db
from app.schemes.patient_schema import PatientCreate

class PatientService:
    @staticmethod
    async def create_patient(patient_data: PatientCreate):
        query = """
            INSERT INTO patients (name, phone, email, national_id, date_of_birth, gender)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, phone, email, national_id, date_of_birth, gender, created_at, updated_at
        """
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(
                query,
                patient_data.name,
                patient_data.phone,
                patient_data.email,
                patient_data.national_id,
                patient_data.date_of_birth,
                patient_data.gender
            )
            return dict(row) if row else None

    @staticmethod
    async def get_patient(patient_id: str):
        query = "SELECT * FROM patients WHERE id = $1"
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(query, patient_id)
            return dict(row) if row else None
