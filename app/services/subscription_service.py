from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Optional
from app.core.database import db

class SubscriptionService:
    @staticmethod
    async def get_bundles(target_type: Optional[str] = None) -> List[dict]:
        """
        Get all active subscription bundles. Optionally filter by target_type.
        """
        async with db.pool.acquire() as connection:
            if target_type:
                rows = await connection.fetch(
                    "SELECT * FROM subscription_bundles WHERE is_active = true AND target_type = $1 ORDER BY price ASC",
                    target_type
                )
            else:
                rows = await connection.fetch(
                    "SELECT * FROM subscription_bundles WHERE is_active = true ORDER BY price ASC"
                )
            return [dict(row) for row in rows]

    @staticmethod
    async def get_active_subscription(owner_id: UUID, is_department: bool) -> Optional[dict]:
        """
        Get the current active subscription details for a department or independent doctor.
        """
        async with db.pool.acquire() as connection:
            if is_department:
                query = """
                SELECT s.*, b.name as bundle_name,
                       (SELECT COUNT(*) FROM subscription_doctors WHERE subscription_id = s.id) as seats_used
                FROM subscriptions s
                JOIN subscription_bundles b ON s.bundle_id = b.id
                WHERE s.department_id = $1
                  AND s.status = 'active'
                  AND s.end_date > now()
                LIMIT 1
                """
            else:
                query = """
                SELECT s.*, b.name as bundle_name,
                       (SELECT COUNT(*) FROM subscription_doctors WHERE subscription_id = s.id) as seats_used,
                       (s.department_id IS NOT NULL) as managed_by_org
                FROM subscriptions s
                JOIN subscription_bundles b ON s.bundle_id = b.id
                WHERE (
                    s.doctor_id = $1 
                    OR 
                    EXISTS (SELECT 1 FROM subscription_doctors sd WHERE sd.subscription_id = s.id AND sd.doctor_id = $1)
                )
                  AND s.status = 'active'
                  AND s.end_date > now()
                ORDER BY s.department_id NULLS FIRST
                LIMIT 1
                """
            row = await connection.fetchrow(query, owner_id)
            return dict(row) if row else None

    @staticmethod
    async def create_subscription(owner_id: UUID, is_department: bool, bundle_id: UUID) -> dict:
        """
        Subscribe a department or doctor to a bundle. Deactivates existing active subscriptions.
        """
        async with db.pool.acquire() as connection:
            # 1. Fetch bundle details
            bundle = await connection.fetchrow("SELECT * FROM subscription_bundles WHERE id = $1 AND is_active = true", bundle_id)
            if not bundle:
                raise ValueError("الباقة المطلوبة غير متوفرة أو غير نشطة.")
            
            bundle_dict = dict(bundle)
            
            # Verify target type matches owner type
            expected_target = "department" if is_department else "doctor"
            if bundle_dict["target_type"] != expected_target:
                raise ValueError(f"هذه الباقة مخصصة للـ {bundle_dict['target_type']} فقط.")

            # 2. Deactivate previous active subscriptions
            if is_department:
                await connection.execute(
                    "UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE department_id = $1 AND status = 'active'",
                    owner_id
                )
            else:
                await connection.execute(
                    "UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE doctor_id = $1 AND status = 'active'",
                    owner_id
                )

            # 3. Create new subscription
            duration_days = bundle_dict["duration_days"]
            total_seats = bundle_dict["max_doctors"] # Will be None for doctors
            
            insert_query = """
            INSERT INTO subscriptions (department_id, doctor_id, bundle_id, end_date, total_seats, status)
            VALUES ($1, $2, $3, now() + $4 * INTERVAL '1 day', $5, 'active')
            RETURNING *
            """
            
            dept_id = owner_id if is_department else None
            doc_id = None if is_department else owner_id
            
            new_sub = await connection.fetchrow(insert_query, dept_id, doc_id, bundle_id, duration_days, total_seats)
            
            if not is_department:
                await connection.execute(
                    "UPDATE doctors SET status = 'approved', updated_at = now() WHERE id = $1",
                    owner_id
                )

            return dict(new_sub)

    @staticmethod
    async def renew_subscription(subscription_id: UUID, owner_id: UUID, is_department: bool, is_admin: bool = False) -> dict:
        """
        Renew an existing subscription.
        """
        async with db.pool.acquire() as connection:
            # Fetch the subscription and its bundle
            sub = await connection.fetchrow(
                """
                SELECT s.*, b.duration_days, b.name as bundle_name
                FROM subscriptions s
                JOIN subscription_bundles b ON s.bundle_id = b.id
                WHERE s.id = $1
                """, 
                subscription_id
            )
            if not sub:
                raise ValueError("الاشتراك غير موجود.")
            
            sub_dict = dict(sub)
            
            # Verify ownership unless admin
            if not is_admin:
                owner_field = "department_id" if is_department else "doctor_id"
                if sub_dict[owner_field] != owner_id:
                    raise ValueError("لا تملك صلاحية تجديد هذا الاشتراك.")

            duration_days = sub_dict["duration_days"]
            
            # Update end_date (extend from current end_date if active, or from now() if expired)
            update_query = """
            UPDATE subscriptions
            SET end_date = GREATEST(end_date, now()) + $1 * INTERVAL '1 day',
                status = 'active',
                updated_at = now()
            WHERE id = $2
            RETURNING *
            """
            updated_sub = await connection.fetchrow(update_query, duration_days, subscription_id)
            updated_sub_dict = dict(updated_sub)
            
            if not is_department:
                doc_id = sub_dict.get("doctor_id") or owner_id
                await connection.execute(
                    "UPDATE doctors SET status = 'approved', updated_at = now() WHERE id = $1",
                    doc_id
                )
                
            return updated_sub_dict

    @staticmethod
    async def assign_doctor_to_seat(subscription_id: UUID, department_id: UUID, doctor_id: UUID) -> dict:
        """
        Assign a department's doctor to a subscription seat.
        """
        async with db.pool.acquire() as connection:
            # 1. Fetch and validate subscription
            sub = await connection.fetchrow(
                """
                SELECT s.*, b.name as bundle_name
                FROM subscriptions s
                JOIN subscription_bundles b ON s.bundle_id = b.id
                WHERE s.id = $1 AND s.department_id = $2
                """, 
                subscription_id, department_id
            )
            if not sub:
                raise ValueError("الاشتراك غير موجود أو لا ينتمي لهذا القسم.")
            
            sub_dict = dict(sub)
            if sub_dict["status"] != "active" or sub_dict["end_date"] < datetime.now(sub_dict["end_date"].tzinfo):
                raise ValueError("الاشتراك غير نشط أو منتهي الصلاحية.")

            # 2. Verify doctor belongs to this department
            doc = await connection.fetchrow(
                "SELECT id, name FROM doctors WHERE id = $1 AND department_id = $2",
                doctor_id, department_id
            )
            if not doc:
                raise ValueError("الطبيب المطلوب غير مسجل في هذا القسم.")

            # 3. Check if doctor is already assigned to this subscription
            existing = await connection.fetchval(
                "SELECT id FROM subscription_doctors WHERE subscription_id = $1 AND doctor_id = $2",
                subscription_id, doctor_id
            )
            if existing:
                raise ValueError("الطبيب مفعّل بالفعل ومسجل في هذا الاشتراك.")

            # 4. Check seat capacity
            seats_used = await connection.fetchval(
                "SELECT COUNT(*) FROM subscription_doctors WHERE subscription_id = $1",
                subscription_id
            )
            if sub_dict["total_seats"] is not None and seats_used >= sub_dict["total_seats"]:
                raise ValueError(f"تم استهلاك جميع المقاعد المتاحة في هذا الاشتراك ({sub_dict['total_seats']} مقاعد).")

            # 5. Insert seat mapping
            row = await connection.fetchrow(
                """
                INSERT INTO subscription_doctors (subscription_id, doctor_id)
                VALUES ($1, $2)
                RETURNING *
                """,
                subscription_id, doctor_id
            )
            
            await connection.execute(
                "UPDATE doctors SET status = 'approved', updated_at = now() WHERE id = $1",
                doctor_id
            )
            
            return dict(row)

    @staticmethod
    async def remove_doctor_from_seat(subscription_id: UUID, department_id: UUID, doctor_id: UUID) -> bool:
        """
        Remove a doctor from a subscription seat.
        """
        async with db.pool.acquire() as connection:
            # Validate subscription
            sub_exists = await connection.fetchval(
                "SELECT id FROM subscriptions WHERE id = $1 AND department_id = $2",
                subscription_id, department_id
            )
            if not sub_exists:
                raise ValueError("الاشتراك غير موجود أو لا ينتمي لهذا القسم.")

            # Delete assignment
            result = await connection.execute(
                "DELETE FROM subscription_doctors WHERE subscription_id = $1 AND doctor_id = $2",
                subscription_id, doctor_id
            )
            
            return "DELETE 1" in result or "1" in result

    @staticmethod
    async def is_doctor_active(doctor_id: UUID) -> bool:
        """
        Check if a doctor has any active subscription (either individual or through their department's subscription seat).
        """
        async with db.pool.acquire() as connection:
            query = """
            SELECT EXISTS (
                -- 1. Individual active subscription
                SELECT 1 FROM subscriptions
                WHERE doctor_id = $1 AND status = 'active' AND end_date > now()
                UNION
                -- 2. Assigned department subscription seat
                SELECT 1 FROM subscription_doctors sd
                JOIN subscriptions s ON sd.subscription_id = s.id
                WHERE sd.doctor_id = $1 AND s.status = 'active' AND s.end_date > now()
            ) as is_active
            """
            return await connection.fetchval(query, doctor_id)

    @staticmethod
    async def get_all_subscriptions(department_id: Optional[UUID] = None) -> List[dict]:
        """
        Get all active/expired subscriptions in the system. Optionally filtered by department_id.
        """
        async with db.pool.acquire() as connection:
            query = """
            SELECT 
                s.id,
                COALESCE(d.name, doc.name) as entity_name,
                CASE WHEN s.department_id IS NOT NULL THEN 'org' ELSE 'doctor' END as entity_type,
                b.name as plan_name,
                b.price as monthly_cost,
                s.end_date,
                s.status,
                EXTRACT(DAY FROM s.end_date - now())::INT as days_remaining,
                'paid'::TEXT as payment_status
            FROM subscriptions s
            JOIN subscription_bundles b ON s.bundle_id = b.id
            LEFT JOIN departments d ON s.department_id = d.id
            LEFT JOIN doctors doc ON s.doctor_id = doc.id
            WHERE 1=1
            """
            params = []
            if department_id:
                query += " AND (s.department_id = $1 OR doc.department_id = $1)"
                params.append(department_id)
                
            query += " ORDER BY s.created_at DESC"
            rows = await connection.fetch(query, *params)
            
            result = []
            for row in rows:
                item = dict(row)
                if item.get("end_date"):
                    item["expiry_date"] = item["end_date"].strftime("%Y-%m-%d")
                    del item["end_date"]
                else:
                    item["expiry_date"] = "N/A"
                
                item["id"] = str(item["id"])
                item["monthly_cost"] = float(item["monthly_cost"])
                result.append(item)
            return result

subscription_service = SubscriptionService()
