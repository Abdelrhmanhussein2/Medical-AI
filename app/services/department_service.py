from typing import List, Optional
from uuid import UUID
from app.core.database import db

class DepartmentService:
    @staticmethod
    async def get_department_dashboard_stats(department_id: UUID) -> dict:
        """
        Get dashboard stats for a specific department.
        """
        from datetime import datetime, timezone
        
        async with db.pool.acquire() as connection:
            total_doctors = await connection.fetchval(
                "SELECT COUNT(*) FROM doctors WHERE department_id = $1", department_id
            )
            
            active_licenses = await connection.fetchval(
                "SELECT COUNT(*) FROM doctors WHERE department_id = $1 AND status = 'approved'", department_id
            )

            monthly_consults = await connection.fetchval(
                """
                SELECT COUNT(a.id) 
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE d.department_id = $1 
                  AND a.appointment_date >= CURRENT_DATE - INTERVAL '30 days'
                """, department_id
            )

            trends_query = """
                SELECT 
                    COUNT(a.id) FILTER (WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '7 days') as w4,
                    COUNT(a.id) FILTER (WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '14 days' AND a.appointment_date < CURRENT_DATE - INTERVAL '7 days') as w3,
                    COUNT(a.id) FILTER (WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '21 days' AND a.appointment_date < CURRENT_DATE - INTERVAL '14 days') as w2,
                    COUNT(a.id) FILTER (WHERE a.appointment_date >= CURRENT_DATE - INTERVAL '28 days' AND a.appointment_date < CURRENT_DATE - INTERVAL '21 days') as w1
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                WHERE d.department_id = $1
            """
            trends_record = await connection.fetchrow(trends_query, department_id)
            if trends_record:
                consultation_trends = [
                    trends_record["w1"] or 0,
                    trends_record["w2"] or 0,
                    trends_record["w3"] or 0,
                    trends_record["w4"] or 0
                ]
            else:
                consultation_trends = [0, 0, 0, 0]

            # Real AI adoption rate: % of dept doctors who used AI sessions vs total dept doctors
            doctors_with_sessions = await connection.fetchval(
                """
                SELECT COUNT(DISTINCT s.doctor_id)
                FROM sessions s
                JOIN doctors d ON s.doctor_id = d.id
                WHERE d.department_id = $1
                  AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
                """, department_id
            )
            ai_adoption_rate = 0
            if total_doctors and total_doctors > 0:
                ai_adoption_rate = round((doctors_with_sessions / total_doctors) * 100)

            # Per-doctor real ai_adoption: sessions this month vs total appointments
            top_doctors_records = await connection.fetch(
                """
                SELECT d.id, d.name, d.status,
                    COUNT(DISTINCT a.id) as patients_count,
                    COUNT(DISTINCT s.id) as session_count
                FROM doctors d
                LEFT JOIN appointments a ON d.id = a.doctor_id
                LEFT JOIN sessions s ON d.id = s.doctor_id 
                    AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
                WHERE d.department_id = $1
                GROUP BY d.id, d.name, d.status
                ORDER BY session_count DESC, patients_count DESC
                LIMIT 5
                """, department_id
            )
            top_performing_doctors = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "patients_count": row["patients_count"],
                    "ai_adoption": min(100, round((row["session_count"] / row["patients_count"]) * 100)) if row["patients_count"] > 0 else 0,
                    "status": row["status"]
                } for row in top_doctors_records
            ]

            # Also replace monthly_consults to use sessions count (AI clinical sessions)
            monthly_consults = await connection.fetchval(
                """
                SELECT COUNT(s.id) 
                FROM sessions s
                JOIN doctors d ON s.doctor_id = d.id
                WHERE d.department_id = $1 
                  AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
                """, department_id
            ) or 0

            # Department activity from recent AI sessions
            activity_records = await connection.fetch(
                """
                SELECT s.id, d.name as doctor_name, p.name as patient_name, s.created_at
                FROM sessions s
                JOIN doctors d ON s.doctor_id = d.id
                LEFT JOIN patients p ON s.patient_id = p.id
                WHERE d.department_id = $1
                ORDER BY s.created_at DESC
                LIMIT 5
                """, department_id
            )

            department_activity = []
            now = datetime.now(timezone.utc)
            for row in activity_records:
                created = row["created_at"]
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                diff = now - created
                if diff.days > 0:
                    time_ago = f"{diff.days} days ago"
                else:
                    hours = diff.seconds // 3600
                    if hours > 0:
                        time_ago = f"{hours} hours ago"
                    else:
                        mins = diff.seconds // 60
                        time_ago = f"{mins} mins ago"
                patient_str = row["patient_name"] if row["patient_name"] else "مريض"
                department_activity.append({
                    "id": str(row["id"]),
                    "message": f"Dr. {row['doctor_name']} أجرى جلسة ذكاء اصطناعي مع {patient_str}",
                    "time_ago": time_ago
                })

            return {
                "total_doctors": total_doctors,
                "active_licenses": active_licenses,
                "ai_adoption_rate": ai_adoption_rate,
                "monthly_consults": monthly_consults,
                "consultation_trends": consultation_trends,
                "top_performing_doctors": top_performing_doctors,
                "expiring_doctors": [],
                "department_activity": department_activity
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
