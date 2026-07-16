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
            departments_rows = await connection.fetch(
                """
                SELECT 
                    d.*,
                    (SELECT b.name FROM subscriptions s JOIN subscription_bundles b ON s.bundle_id = b.id WHERE s.department_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1) as subscription_plan,
                    (SELECT s.end_date FROM subscriptions s WHERE s.department_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1) as subscription_expiry
                FROM departments d
                """
            )
            departments_stats = []
            
            for dept in departments_rows:
                dept_dict = dict(dept)
                # Serialize id
                dept_dict["id"] = str(dept_dict["id"])
                # Explicitly ensure is_active is a python bool
                dept_dict["is_active"] = bool(dept_dict.get("is_active", True))
                # Serialize created/updated timestamps
                if dept_dict.get("created_at"):
                    dept_dict["created_at"] = dept_dict["created_at"].isoformat()
                if dept_dict.get("updated_at"):
                    dept_dict["updated_at"] = dept_dict["updated_at"].isoformat()
                if dept_dict.get("subscription_expiry"):
                    dept_dict["subscription_expiry"] = dept_dict["subscription_expiry"].strftime("%Y-%m-%d")
                else:
                    dept_dict["subscription_expiry"] = None
                
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
        Get a list of all doctors with their active subscription plan details.
        """
        async with db.pool.acquire() as connection:
            query = """
            SELECT 
                d.*,
                COALESCE(
                    (SELECT b.name FROM subscriptions s JOIN subscription_bundles b ON s.bundle_id = b.id WHERE s.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1),
                    (SELECT b.name FROM subscription_doctors sd JOIN subscriptions s ON sd.subscription_id = s.id JOIN subscription_bundles b ON s.bundle_id = b.id WHERE sd.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1)
                ) as subscription_plan,
                COALESCE(
                    (SELECT s.end_date FROM subscriptions s WHERE s.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1),
                    (SELECT s.end_date FROM subscription_doctors sd JOIN subscriptions s ON sd.subscription_id = s.id WHERE sd.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1)
                ) as subscription_expiry
            FROM doctors d
            ORDER BY d.created_at DESC
            """
            rows = await connection.fetch(query)
            result = []
            for row in rows:
                item = dict(row)
                # Serialize UUIDs and datetimes
                item["id"] = str(item["id"])
                if item.get("department_id"):
                    item["department_id"] = str(item["department_id"])
                if item.get("approved_by"):
                    item["approved_by"] = str(item["approved_by"])
                if item.get("created_at"):
                    item["created_at"] = item["created_at"].isoformat()
                if item.get("updated_at"):
                    item["updated_at"] = item["updated_at"].isoformat()
                if item.get("approved_at"):
                    item["approved_at"] = item["approved_at"].isoformat()
                
                # Format subscription_expiry as YYYY-MM-DD
                if item.get("subscription_expiry"):
                    item["subscription_expiry"] = item["subscription_expiry"].strftime("%Y-%m-%d")
                else:
                    item["subscription_expiry"] = None
                result.append(item)
            return result

    @staticmethod
    async def get_all_subscriptions() -> List[dict]:
        """
        Get a list of all active/expired subscriptions in the system.
        """
        from app.services.subscription_service import subscription_service
        return await subscription_service.get_all_subscriptions()

    @staticmethod
    async def toggle_doctor_status(doctor_id: UUID) -> dict:
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(
                "UPDATE doctors SET is_active = NOT is_active, updated_at = now() WHERE id = $1 RETURNING id, name, is_active",
                doctor_id
            )
            if not row:
                raise ValueError("الطبيب غير موجود.")
            return dict(row)

    @staticmethod
    async def toggle_department_status(department_id: UUID) -> dict:
        async with db.pool.acquire() as connection:
            row = await connection.fetchrow(
                "UPDATE departments SET is_active = NOT is_active, updated_at = now() WHERE id = $1 RETURNING id, name, is_active",
                department_id
            )
            if not row:
                raise ValueError("القسم غير موجود.")
            return dict(row)

    @staticmethod
    async def delete_doctor(doctor_id: UUID) -> bool:
        async with db.pool.acquire() as connection:
            result = await connection.execute("DELETE FROM doctors WHERE id = $1", doctor_id)
            return "DELETE 1" in result or "1" in result

    @staticmethod
    async def delete_department(department_id: UUID) -> bool:
        async with db.pool.acquire() as connection:
            result = await connection.execute("DELETE FROM departments WHERE id = $1", department_id)
            return "DELETE 1" in result or "1" in result

admin_service = AdminService()
