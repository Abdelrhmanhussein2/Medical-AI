from typing import List, Optional
from uuid import UUID
from app.core.database import db

class DepartmentService:
    @staticmethod
    async def get_department_dashboard_stats(department_id: UUID) -> dict:
        """
        Get dashboard stats for a specific department.
        Returns total doctors, total appointments, and best doctor.
        """
        async with db.pool.acquire() as connection:
            # Total doctors in department
            total_doctors = await connection.fetchval(
                "SELECT COUNT(*) FROM doctors WHERE department_id = $1", department_id
            )
            
            # Total appointments in department
            total_appointments = await connection.fetchval(
                """
                SELECT COUNT(a.id) 
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE d.department_id = $1
                """, department_id
            )

            # Best doctor by appointment count
            best_doctor_record = await connection.fetchrow(
                """
                SELECT d.name, COUNT(a.id) as appointment_count
                FROM doctors d
                LEFT JOIN appointments a ON d.id = a.doctor_id
                WHERE d.department_id = $1
                GROUP BY d.id, d.name
                ORDER BY appointment_count DESC
                LIMIT 1
                """, department_id
            )
            
            best_doctor_name = best_doctor_record["name"] if best_doctor_record and best_doctor_record["appointment_count"] > 0 else None

            return {
                "total_doctors": total_doctors,
                "total_appointments": total_appointments,
                "best_doctor": best_doctor_name
            }

    @staticmethod
    async def get_department_doctors(department_id: UUID) -> List[dict]:
        """
        Get a list of all doctors in the department.
        """
        async with db.pool.acquire() as connection:
            rows = await connection.fetch(
                "SELECT * FROM doctors WHERE department_id = $1 ORDER BY created_at DESC", 
                department_id
            )
            return [dict(row) for row in rows]
            
    @staticmethod
    async def create_department(dept_data) -> dict:
        """
        Create a new department with an account.
        """
        from app.core.security import get_password_hash
        import asyncpg
        
        hashed_password = get_password_hash(dept_data.password)
        try:
            async with db.pool.acquire() as connection:
                row = await connection.fetchrow(
                    """
                    INSERT INTO departments (name, email, password_hash) 
                    VALUES ($1, $2, $3) RETURNING *
                    """, 
                    dept_data.name, dept_data.email, hashed_password
                )
                return dict(row)
        except asyncpg.exceptions.UniqueViolationError:
            raise ValueError("Department name or email already registered")

department_service = DepartmentService()
