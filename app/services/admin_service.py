from typing import List, Optional
from uuid import UUID
from app.core.database import db

class AdminService:
    @staticmethod
    async def get_dashboard_stats() -> dict:
        """
        Get statistics for the admin dashboard.
        """
        async with db.pool.acquire() as connection:
            total_doctors = await connection.fetchval("SELECT COUNT(*) FROM doctors")
            total_patients = await connection.fetchval("SELECT COUNT(*) FROM patients")
            total_appointments = await connection.fetchval("SELECT COUNT(*) FROM appointments")
            
            # Get departments stats
            departments_rows = await connection.fetch("SELECT * FROM departments")
            departments_stats = []
            
            for dept in departments_rows:
                dept_dict = dict(dept)
                
                # Fetch stats for this department
                dept_doctors = await connection.fetchval(
                    "SELECT COUNT(*) FROM doctors WHERE department_id = $1", dept["id"]
                )
                
                dept_appointments = await connection.fetchval(
                    """
                    SELECT COUNT(a.id) 
                    FROM appointments a
                    JOIN doctors d ON a.doctor_id = d.id
                    WHERE d.department_id = $1
                    """, dept["id"]
                )

                best_doctor_record = await connection.fetchrow(
                    """
                    SELECT d.name, COUNT(a.id) as appointment_count
                    FROM doctors d
                    LEFT JOIN appointments a ON d.id = a.doctor_id
                    WHERE d.department_id = $1
                    GROUP BY d.id, d.name
                    ORDER BY appointment_count DESC
                    LIMIT 1
                    """, dept["id"]
                )
                
                best_doctor_name = best_doctor_record["name"] if best_doctor_record and best_doctor_record["appointment_count"] > 0 else None
                
                # Fetch doctors list for this department
                doctors_rows = await connection.fetch(
                    "SELECT * FROM doctors WHERE department_id = $1 ORDER BY created_at DESC", dept["id"]
                )
                dept_doctors_list = [dict(r) for r in doctors_rows]
                
                departments_stats.append({
                    "department": dept_dict,
                    "stats": {
                        "total_doctors": dept_doctors,
                        "total_appointments": dept_appointments,
                        "best_doctor": best_doctor_name
                    },
                    "doctors": dept_doctors_list
                })

            return {
                "total_doctors": total_doctors,
                "total_patients": total_patients,
                "total_appointments": total_appointments,
                "departments_breakdown": departments_stats
            }

    @staticmethod
    async def get_all_doctors() -> List[dict]:
        """
        Get a list of all doctors.
        """
        async with db.pool.acquire() as connection:
            rows = await connection.fetch("SELECT * FROM doctors ORDER BY created_at DESC")
            return [dict(row) for row in rows]

admin_service = AdminService()
