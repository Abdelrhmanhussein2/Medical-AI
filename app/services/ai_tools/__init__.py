# app/services/ai_tools/__init__.py
import logging
from typing import Dict, Any, List, Optional
from app.services.ai_tools.schemas import get_tool_definitions
from app.services.ai_tools import patient_tools, appointment_tools, report_tools, admin_tools

logger = logging.getLogger(__name__)

# ─── Strict Role-Based Tool Allowlists ───────────────────────────────────────
# Doctor agents can ONLY execute tools in DOCTOR_TOOL_NAMES.
# Admin tools are completely blocked from doctor agents at the dispatcher level
# regardless of what the LLM requests.
DOCTOR_TOOL_NAMES = {
    "search_my_patients",
    "get_patient_visits",
    "add_new_patient",
    "delete_patient",
    "update_patient_info",
    "get_patient_full_profile",
    "get_my_appointments",
    "book_appointment",
    "cancel_appointment",
    "reschedule_appointment",
    "update_appointment_status",
    "get_today_schedule",
    "get_clinic_stats",
    "add_visit_record",
    "search_visits_by_diagnosis",
    "get_monthly_report",
    "send_appointment_welcome_message",
    "send_report_to_doctor_whatsapp",
}

ADMIN_TOOL_NAMES = {
    "get_system_stats",
    "get_doctor_performance",
    "get_revenue_report",
    "send_report_to_admin",
    "query_database_readonly",
}

class ToolExecutor:
    # Full tool map — access is gated per role in dispatch()
    TOOL_MAP = {
        # Doctor tools
        "search_my_patients":        patient_tools.tool_search_my_patients,
        "get_patient_visits":        patient_tools.tool_get_patient_visits,
        "add_new_patient":           patient_tools.tool_add_new_patient,
        "delete_patient":            patient_tools.tool_delete_patient,
        "update_patient_info":       patient_tools.tool_update_patient_info,
        "get_patient_full_profile":  patient_tools.tool_get_patient_full_profile,
        "get_my_appointments":       appointment_tools.tool_get_my_appointments,
        "book_appointment":          appointment_tools.tool_book_appointment,
        "cancel_appointment":        appointment_tools.tool_cancel_appointment,
        "reschedule_appointment":    appointment_tools.tool_reschedule_appointment,
        "update_appointment_status": appointment_tools.tool_update_appointment_status,
        "get_today_schedule":        appointment_tools.tool_get_today_schedule,
        "get_clinic_stats":          report_tools.tool_get_clinic_stats,
        "add_visit_record":          report_tools.tool_add_visit_record,
        "search_visits_by_diagnosis":report_tools.tool_search_visits_by_diagnosis,
        "get_monthly_report":        report_tools.tool_get_monthly_report,
        "send_appointment_welcome_message": appointment_tools.tool_send_appointment_welcome_message,
        "send_report_to_doctor_whatsapp": report_tools.tool_send_report_to_doctor_whatsapp,
        # Admin-only tools
        "get_system_stats":          admin_tools.tool_get_system_stats,
        "get_doctor_performance":    admin_tools.tool_get_doctor_performance,
        "get_revenue_report":        admin_tools.tool_get_revenue_report,
        "send_report_to_admin":      admin_tools.tool_send_report_to_admin,
        "query_database_readonly":   admin_tools.tool_query_database_readonly,
    }

    async def dispatch(
        self,
        fn_name: str,
        fn_args: dict,
        owner_id: str,
        conn,
        role: str = "doctor"
    ) -> dict:
        """
        Execute a tool for the given role.
        Doctors are strictly limited to DOCTOR_TOOL_NAMES.
        Admins have access to ADMIN_TOOL_NAMES in addition to all doctor tools.
        Any attempt to call an out-of-scope tool is rejected at this layer.
        """
        # Role-based allowlist enforcement
        if role == "doctor":
            if fn_name not in DOCTOR_TOOL_NAMES:
                logger.warning(
                    f"[SECURITY] Doctor {owner_id} attempted forbidden tool: '{fn_name}'. Blocked."
                )
                return {
                    "status": "error",
                    "message": "هذه العملية خارج نطاق صلاحياتك كطبيب. يمكنك فقط إدارة مرضاك ومواعيدك وسجلات العيادة الخاصة بك."
                }
        elif role == "admin":
            # Admins can use all tools
            pass
        else:
            logger.warning(f"[SECURITY] Unknown role '{role}' attempted to call tool '{fn_name}'. Blocked.")
            return {"status": "error", "message": "دور المستخدم غير معروف."}

        if fn_name not in self.TOOL_MAP:
            logger.warning(f"[SECURITY] Attempted to execute unregistered tool: '{fn_name}'")
            return {"status": "error", "message": f"أداة غير معروفة: {fn_name}"}

        try:
            return await self.TOOL_MAP[fn_name](fn_args, owner_id, conn)
        except Exception as e:
            logger.exception(f"Exception during tool dispatch {fn_name}: {e}")
            return {"status": "error", "message": f"حدث خطأ داخلي: {str(e)}"}

__all__ = ["get_tool_definitions", "ToolExecutor", "DOCTOR_TOOL_NAMES", "ADMIN_TOOL_NAMES"]
