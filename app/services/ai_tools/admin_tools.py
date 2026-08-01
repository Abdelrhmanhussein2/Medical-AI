import logging
from uuid import UUID
from typing import Dict, Any

logger = logging.getLogger("admin_tools")

async def tool_get_system_stats(fn_args: dict, owner_id: str, conn) -> dict:
    """
    Fetches total counts for doctors, patients, appointments, and active subscriptions.
    """
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
    """
    Fetches performance metrics for a specific doctor by name.
    """
    doctor_name = fn_args.get("doctor_name")
    if not doctor_name:
        return {"status": "error", "message": "اسم الطبيب (doctor_name) مطلوب."}

    try:
        # Search doctor
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
    """
    Fetches revenue and pricing details of active subscriptions.
    """
    try:
        # Sum of active subscription bundle prices
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
            "data": {
                "monthly_recurring_revenue_usd": float(monthly_recurring_rev)
            }
        }
    except Exception as e:
        logger.error(f"Error in tool_get_revenue_report: {e}")
        return {"status": "error", "message": f"Failed to fetch revenue report: {str(e)}"}


async def tool_send_report_to_admin(fn_args: dict, owner_id: str, conn) -> dict:
    """
    Sends the compiled report text to the admin's phone via WhatsApp.
    """
    report_text = fn_args.get("report_text")
    if not report_text:
        return {"status": "error", "message": "نص التقرير (report_text) مطلوب."}

    try:
        # Get admin phone
        admin_row = await conn.fetchrow("SELECT phone FROM admins WHERE id = $1", UUID(owner_id))
        if not admin_row or not admin_row["phone"]:
            return {
                "status": "error",
                "message": "لم نتمكن من إرسال الواتساب لأن رقم هاتف الأدمن غير مسجل في حسابه."
            }

        admin_phone = admin_row["phone"]

        from app.services.whatsapp_service import WhatsAppService
        wa_service = WhatsAppService()
        success = await wa_service.send_message(admin_phone, report_text)

        if success:
            return {
                "status": "success",
                "message": f"تم إرسال التقرير بنجاح على واتساب الأدمن رقم: {admin_phone}."
            }
        else:
            return {"status": "error", "message": "فشل إرسال رسالة الواتساب عبر Evolution API."}
    except Exception as e:
        logger.error(f"Error in tool_send_report_to_admin: {e}")
        return {"status": "error", "message": f"Failed to send WhatsApp report: {str(e)}"}
