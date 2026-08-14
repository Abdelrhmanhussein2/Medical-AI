# app/services/ai_tools/admin_tools.py
import logging
from uuid import UUID
from typing import Dict, Any
from datetime import datetime, date
from decimal import Decimal

logger = logging.getLogger("admin_tools")


async def tool_get_system_stats(fn_args: dict, owner_id: str, conn) -> dict:
    """Fetches total counts for doctors, patients, appointments, and active subscriptions."""
    try:
        total_doctors = await conn.fetchval("SELECT COUNT(*) FROM doctors")
        total_patients = await conn.fetchval("SELECT COUNT(*) FROM patients")
        total_appointments = await conn.fetchval("SELECT COUNT(*) FROM appointments")
        active_subs = await conn.fetchval(
            "SELECT COUNT(*) FROM subscriptions WHERE status = 'active' AND end_date > now()"
        )
        return {
            "status": "success",
            "data": {
                "total_doctors": total_doctors,
                "total_patients": total_patients,
                "total_appointments": total_appointments,
                "active_subscriptions": active_subs
            }
        }
    except Exception as e:
        logger.error(f"Error in tool_get_system_stats: {e}")
        return {"status": "error", "message": f"Failed to fetch system stats: {str(e)}"}


async def tool_get_doctor_performance(fn_args: dict, owner_id: str, conn) -> dict:
    """Fetches performance metrics for a specific doctor by name."""
    doctor_name = fn_args.get("doctor_name")
    if not doctor_name:
        return {"status": "error", "message": "اسم الطبيب (doctor_name) مطلوب."}
    try:
        doctor_row = await conn.fetchrow(
            "SELECT id, name, specialization, is_active FROM doctors WHERE name ILIKE $1 LIMIT 1",
            f"%{doctor_name}%"
        )
        if not doctor_row:
            return {"status": "error", "message": f"لم يتم العثور على طبيب بالاسم: '{doctor_name}'"}

        doc_id = doctor_row["id"]
        appt_count = await conn.fetchval("SELECT COUNT(*) FROM appointments WHERE doctor_id = $1", doc_id)
        completed_appt = await conn.fetchval(
            "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND status = 'completed'", doc_id
        )
        patient_count = await conn.fetchval("SELECT COUNT(*) FROM patients WHERE doctor_id = $1", doc_id)
        session_count = await conn.fetchval("SELECT COUNT(*) FROM call_sessions WHERE doctor_id = $1", doc_id)

        return {
            "status": "success",
            "data": {
                "doctor_id": str(doc_id),
                "name": doctor_row["name"],
                "specialization": doctor_row["specialization"],
                "is_active": doctor_row["is_active"],
                "total_appointments": appt_count,
                "completed_appointments": completed_appt,
                "total_patients": patient_count,
                "completed_ai_sessions": session_count
            }
        }
    except Exception as e:
        logger.error(f"Error in tool_get_doctor_performance: {e}")
        return {"status": "error", "message": f"Failed to fetch doctor stats: {str(e)}"}


async def tool_get_revenue_report(fn_args: dict, owner_id: str, conn) -> dict:
    """Fetches total revenue from active subscriptions."""
    try:
        monthly_recurring_rev = await conn.fetchval(
            """
            SELECT COALESCE(SUM(b.price), 0)
            FROM subscriptions s
            JOIN subscription_bundles b ON s.bundle_id = b.id
            WHERE s.status = 'active' AND s.end_date > now()
            """
        )
        return {
            "status": "success",
            "data": {"monthly_recurring_revenue_usd": float(monthly_recurring_rev)}
        }
    except Exception as e:
        logger.error(f"Error in tool_get_revenue_report: {e}")
        return {"status": "error", "message": f"Failed to fetch revenue report: {str(e)}"}


async def tool_send_report_to_admin(fn_args: dict, owner_id: str, conn) -> dict:
    """Sends a report to the admin's WhatsApp number."""
    report_text = fn_args.get("report_text")
    if not report_text:
        return {"status": "error", "message": "نص التقرير (report_text) مطلوب."}
    try:
        admin_row = await conn.fetchrow("SELECT phone FROM admins WHERE id = $1", UUID(owner_id))
        if not admin_row or not admin_row["phone"]:
            return {"status": "error", "message": "رقم هاتف الأدمن غير مسجل في حسابه."}
        admin_phone = admin_row["phone"]
        from app.services.whatsapp_service import WhatsAppService
        wa_service = WhatsAppService()
        success = await wa_service.send_message(admin_phone, report_text)
        if success:
            return {"status": "success", "message": f"تم إرسال التقرير على واتساب الأدمن: {admin_phone}."}
        else:
            return {"status": "error", "message": "فشل إرسال رسالة الواتساب عبر Evolution API."}
    except Exception as e:
        logger.error(f"Error in tool_send_report_to_admin: {e}")
        return {"status": "error", "message": f"Failed to send WhatsApp report: {str(e)}"}


async def tool_query_database_readonly(fn_args: dict, owner_id: str, conn) -> dict:
    """Executes a read-only SELECT SQL query on the database."""
    sql_query = fn_args.get("sql_query")
    if not sql_query:
        return {"status": "error", "message": "الاستعلام SQL (sql_query) مطلوب."}

    query_stripped = sql_query.strip().lower()
    if not query_stripped.startswith("select"):
        return {"status": "error", "message": "غير مسموح إلا باستعلامات القراءة فقط (SELECT)."}

    forbidden = ["insert", "update", "delete", "drop", "alter", "truncate", "create", "grant", "revoke"]
    for keyword in forbidden:
        if keyword in query_stripped:
            return {"status": "error", "message": f"غير مسموح باستخدام ({keyword}) في الاستعلام."}
    try:
        rows = await conn.fetch(sql_query)
        data = []
        for r in rows:
            row_dict = {}
            for k, v in r.items():
                if isinstance(v, (datetime, date)):
                    row_dict[k] = v.isoformat()
                elif isinstance(v, Decimal):
                    row_dict[k] = float(v)
                elif isinstance(v, UUID):
                    row_dict[k] = str(v)
                else:
                    row_dict[k] = v
            data.append(row_dict)
        return {"status": "success", "row_count": len(data), "data": data[:100]}
    except Exception as e:
        logger.error(f"Error in tool_query_database_readonly: {e}")
        return {"status": "error", "message": f"Failed to execute SQL query: {str(e)}"}


async def tool_list_all_doctors(fn_args: dict, owner_id: str, conn) -> dict:
    """Returns a list of all doctors with their status, subscription, and department."""
    try:
        limit = min(int(fn_args.get("limit", 20)), 100)
        offset = int(fn_args.get("offset", 0))
        filter_status = fn_args.get("status_filter")  # 'active', 'inactive', 'pending'

        base_query = """
            SELECT
                d.id, d.name, d.email, d.specialization,
                d.is_active, d.status AS approval_status,
                dept.name AS department_name,
                s.status AS subscription_status,
                b.name AS bundle_name,
                s.end_date AS subscription_end
            FROM doctors d
            LEFT JOIN departments dept ON d.department_id = dept.id
            LEFT JOIN subscriptions s ON s.doctor_id = d.id AND s.status = 'active' AND s.end_date > now()
            LEFT JOIN subscription_bundles b ON s.bundle_id = b.id
        """
        conditions = []
        if filter_status == "active":
            conditions.append("d.is_active = TRUE AND d.status = 'approved'")
        elif filter_status == "inactive":
            conditions.append("d.is_active = FALSE")
        elif filter_status == "pending":
            conditions.append("d.status = 'pending'")

        if conditions:
            base_query += " WHERE " + " AND ".join(conditions)
        base_query += " ORDER BY d.name LIMIT $1 OFFSET $2"

        rows = await conn.fetch(base_query, limit, offset)
        doctors = []
        for r in rows:
            doctors.append({
                "id": str(r["id"]),
                "name": r["name"],
                "email": r["email"],
                "specialization": r["specialization"],
                "is_active": r["is_active"],
                "approval_status": r["approval_status"],
                "department": r["department_name"] or "مستقل",
                "subscription": r["bundle_name"] or "لا يوجد",
                "subscription_status": r["subscription_status"] or "غير مشترك",
                "subscription_end": r["subscription_end"].isoformat() if r["subscription_end"] else None
            })

        total = await conn.fetchval("SELECT COUNT(*) FROM doctors")
        return {"status": "success", "total_doctors": total, "returned": len(doctors), "doctors": doctors}
    except Exception as e:
        logger.error(f"Error in tool_list_all_doctors: {e}")
        return {"status": "error", "message": f"Failed to list doctors: {str(e)}"}


async def tool_toggle_doctor_status(fn_args: dict, owner_id: str, conn) -> dict:
    """Activates or deactivates a doctor account. Requires explicit action confirmation."""
    doctor_id = fn_args.get("doctor_id")
    doctor_email = fn_args.get("doctor_email")
    action = fn_args.get("action")  # "activate" or "deactivate"

    if action not in ("activate", "deactivate"):
        return {"status": "error", "message": "الإجراء (action) يجب أن يكون 'activate' أو 'deactivate'."}
    if not doctor_id and not doctor_email:
        return {"status": "error", "message": "يجب تحديد doctor_id أو doctor_email."}

    try:
        if doctor_id:
            try:
                doc_uuid = UUID(str(doctor_id))
            except ValueError:
                return {"status": "error", "message": f"معرف الطبيب غير صالح: '{doctor_id}'"}
            row = await conn.fetchrow("SELECT id, name, is_active FROM doctors WHERE id = $1", doc_uuid)
        else:
            row = await conn.fetchrow("SELECT id, name, is_active FROM doctors WHERE email = $1", doctor_email)

        if not row:
            return {"status": "error", "message": "لم يتم العثور على هذا الطبيب."}

        new_status = (action == "activate")
        if row["is_active"] == new_status:
            state_text = "مفعّلاً" if new_status else "معطّلاً"
            return {"status": "info", "message": f"حساب الدكتور {row['name']} هو بالفعل {state_text}."}

        await conn.execute("UPDATE doctors SET is_active = $1 WHERE id = $2", new_status, row["id"])
        action_text = "تفعيل" if action == "activate" else "تعطيل"
        logger.info(f"[ADMIN TOOL] Admin {owner_id} performed '{action}' on doctor {row['id']} ({row['name']})")
        return {
            "status": "success",
            "message": f"تم {action_text} حساب الدكتور **{row['name']}** بنجاح.",
            "doctor_id": str(row["id"]),
            "new_status": "active" if new_status else "inactive"
        }
    except Exception as e:
        logger.error(f"Error in tool_toggle_doctor_status: {e}")
        return {"status": "error", "message": f"Failed to toggle doctor status: {str(e)}"}


async def tool_get_subscription_overview(fn_args: dict, owner_id: str, conn) -> dict:
    """Returns a detailed revenue breakdown grouped by subscription bundle."""
    try:
        rows = await conn.fetch(
            """
            SELECT
                b.name AS bundle_name, b.target_type, b.price,
                COUNT(s.id) AS subscriber_count,
                COALESCE(SUM(b.price), 0) AS total_revenue
            FROM subscriptions s
            JOIN subscription_bundles b ON s.bundle_id = b.id
            WHERE s.status = 'active' AND s.end_date > now()
            GROUP BY b.id, b.name, b.target_type, b.price
            ORDER BY total_revenue DESC
            """
        )
        bundles = []
        grand_total = 0.0
        for r in rows:
            bundles.append({
                "bundle_name": r["bundle_name"],
                "target_type": r["target_type"],
                "price_per_unit_usd": float(r["price"]),
                "active_subscribers": r["subscriber_count"],
                "total_revenue_usd": float(r["total_revenue"])
            })
            grand_total += float(r["total_revenue"])
        return {"status": "success", "grand_total_revenue_usd": grand_total, "bundles": bundles}
    except Exception as e:
        logger.error(f"Error in tool_get_subscription_overview: {e}")
        return {"status": "error", "message": f"Failed to fetch subscription overview: {str(e)}"}


async def tool_list_support_tickets(fn_args: dict, owner_id: str, conn) -> dict:
    """Returns a list of support tickets, optionally filtered by status."""
    try:
        filter_status = fn_args.get("status_filter")
        limit = min(int(fn_args.get("limit", 20)), 50)

        base_query = """
            SELECT t.id, t.subject, t.message, t.status, t.created_at,
                   d.name AS doctor_name, d.email AS doctor_email
            FROM support_tickets t
            LEFT JOIN doctors d ON t.doctor_id = d.id
        """
        params = []
        if filter_status:
            base_query += " WHERE t.status = $1"
            params.append(filter_status)
        base_query += f" ORDER BY t.created_at DESC LIMIT ${len(params)+1}"
        params.append(limit)

        rows = await conn.fetch(base_query, *params)
        tickets = []
        for r in rows:
            msg = r["message"] or ""
            tickets.append({
                "id": str(r["id"]),
                "subject": r["subject"],
                "message": msg[:200] + "..." if len(msg) > 200 else msg,
                "status": r["status"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                "doctor_name": r["doctor_name"],
                "doctor_email": r["doctor_email"]
            })

        count_query = "SELECT COUNT(*) FROM support_tickets"
        count_params = []
        if filter_status:
            count_query += " WHERE status = $1"
            count_params.append(filter_status)
        total = await conn.fetchval(count_query, *count_params)

        return {"status": "success", "total_tickets": total, "returned": len(tickets), "tickets": tickets}
    except Exception as e:
        logger.error(f"Error in tool_list_support_tickets: {e}")
        return {"status": "error", "message": f"Failed to fetch support tickets: {str(e)}"}
