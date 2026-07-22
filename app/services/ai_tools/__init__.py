# app/services/ai_tools/__init__.py
import logging
from typing import Dict, Any, List
from app.services.ai_tools.schemas import get_tool_definitions
from app.services.ai_tools import patient_tools, appointment_tools, report_tools

logger = logging.getLogger(__name__)

class ToolExecutor:
    TOOL_MAP = {
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
    }

    async def dispatch(self, fn_name: str, fn_args: dict, owner_id: str, conn) -> dict:
        if fn_name not in self.TOOL_MAP:
            logger.warning(f"Attempted to execute disallowed tool: {fn_name}")
            return {"status": "error", "message": f"أداة غير معروفة أو غير مسموح بها: {fn_name}"}
        try:
            return await self.TOOL_MAP[fn_name](fn_args, owner_id, conn)
        except Exception as e:
            logger.exception(f"Exception during tool dispatch {fn_name}: {e}")
            return {"status": "error", "message": f"حدث خطأ داخلي: {str(e)}"}

__all__ = ["get_tool_definitions", "ToolExecutor"]
