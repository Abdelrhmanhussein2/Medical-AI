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
            return cls.get_all_schemas()

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
        for the lightweight LLM router prompt (~150 tokens total).
        """
        all_tools = cls.get_all_schemas()
        lines = []
        for t in all_tools:
            fn = t.get("function", {})
            name = fn.get("name", "")
            desc = fn.get("description", "")
            lines.append(f"- {name}: {desc}")
        return "\n".join(lines)
