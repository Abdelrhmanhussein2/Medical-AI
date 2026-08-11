# app/services/router/tool_registry.py
import logging
from typing import List, Dict, Any, Optional
from app.services.ai_tools.schemas import get_tool_definitions

logger = logging.getLogger(__name__)

# Prerequisite mappings: If Tool A is selected, Tool B should also be included as a helper dependency
# e.g., To book an appointment, the AI usually needs search_my_patients first if patient_id is not known.
PREREQUISITE_MAP: Dict[str, List[str]] = {
    "book_appointment": ["search_my_patients"],
    "cancel_appointment": ["get_my_appointments"],
    "reschedule_appointment": ["get_my_appointments", "search_my_patients"],
    "get_patient_visits": ["search_my_patients"],
    "get_patient_full_profile": ["search_my_patients"],
    "update_patient_info": ["search_my_patients"],
    "delete_patient": ["search_my_patients"],
    "add_visit_record": ["search_my_patients"],
    "send_appointment_welcome_message": ["search_my_patients"],
}

ROUTER_SHORT_DESCS: Dict[str, str] = {
    "search_my_patients": "البحث عن مريض بالاسم أو الهاتف للحصول على بياناته أو معرفة الـ ID الخاص به.",
    "get_patient_visits": "عرض قائمة الزيارات السابقة والتشخيصات والروشتات الطبية لمريض معين باستخدام الـ ID.",
    "get_my_appointments": "استعراض مواعيد العيادة وجدول العمل الخاص بالطبيب خلال فترة زمنية محددة.",
    "get_clinic_stats": "عرض أرقام وإحصائيات عامة ومالية وسريعة عن أداء العيادة والمرضى والمواعيد.",
    "book_appointment": "حجز موعد جديد لمريض مسجل بالفعل في العيادة بتاريخ ووقت محددين.",
    "add_new_patient": "تسجيل وإضافة مريض جديد بقاعدة البيانات بالاسم والهاتف (أو بدون هاتف إذا لم يتوفر).",
    "delete_patient": "حذف مريض نهائياً من سجلات العيادة باستخدام معرف المريض (ID).",
    "cancel_appointment": "إلغاء موعد محجوز مسبقاً لمريض في العيادة بشكل نهائي.",
    "reschedule_appointment": "تعديل وقت أو تاريخ موعد محجوز بالفعل لمريض بالعيادة.",
    "update_appointment_status": "تحديث حالة حضور المريض للموعد (مثل: حضر completed أو لم يحضر no_show).",
    "add_visit_record": "تسجيل كشف أو زيارة جديدة للمريض وكتابة التشخيص والعلاج والعلامات الحيوية.",
    "search_visits_by_diagnosis": "البحث عن الحالات والزيارات السابقة لجميع المرضى بناءً على تشخيص معين (مثل الضغط أو السكر).",
    "update_patient_info": "تعديل البيانات الشخصية لمريض مسجل بالفعل مثل الاسم أو الهاتف.",
    "get_patient_full_profile": "عرض الملف الطبي والشخصي الكامل والتفصيلي للمريض يشمل بياناته وزياراته ومواعيده.",
    "get_today_schedule": "عرض قائمة وجدول مواعيد اليوم الحالي وحالة الحضور لكل مريض.",
    "get_monthly_report": "إصدار تقرير تفصيلي شهري عن إحصائيات وأرباح وأداء العيادة.",
    "send_appointment_welcome_message": "إرسال رسالة ترحيبية وتأكيد حجز وموعد للمريض على رقم واتسابه الخاص.",
    "send_report_to_doctor_whatsapp": "إرسال تقرير إحصائي أو مالي تفصيلي مباشرة إلى واتساب الطبيب الخاص."
}

class ToolRegistry:
    """
    Central registry for managing available tools, their schemas, 
    and prerequisite tool dependencies.
    """

    @classmethod
    def get_all_schemas(cls) -> List[Dict[str, Any]]:
        """Returns full JSON schemas for all registered tools."""
        return get_tool_definitions()

    @classmethod
    def get_schemas_by_names(cls, tool_names: List[str]) -> List[Dict[str, Any]]:
        """
        Returns JSON schemas for specified tool names, automatically resolving
        and including any prerequisite tools required by them.
        """
        if not tool_names:
            return []

        # Expand tool_names with prerequisites
        expanded_names: set[str] = set()
        for name in tool_names:
            expanded_names.add(name)
            if name in PREREQUISITE_MAP:
                for prereq in PREREQUISITE_MAP[name]:
                    expanded_names.add(prereq)

        all_tools = cls.get_all_schemas()
        selected_schemas = [
            t for t in all_tools
            if t.get("function", {}).get("name") in expanded_names
        ]

        # Safety fallback: if filtering yielded nothing, return all tools
        return selected_schemas if selected_schemas else all_tools

    @classmethod
    def get_llm_router_prompt_summary(cls) -> str:
        """
        Generates an ultra-compact list of tool names and single-line descriptions
        for the lightweight LLM router prompt (~50-80 tokens total).
        """
        lines = []
        for name, desc in ROUTER_SHORT_DESCS.items():
            lines.append(f"- {name}: {desc}")
        return "\n".join(lines)
