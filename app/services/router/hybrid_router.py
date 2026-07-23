# app/services/router/hybrid_router.py
import logging
from typing import List, Dict, Any
from app.services.router.rule_router import RuleBasedRouter
from app.services.router.llm_router import LLMRouter
from app.services.router.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

class HybridToolRouter:
    """
    Hybrid Router combining Rule-Based keyword matching (zero-token) 
    with a Lightweight LLM Router fallback (~100 tokens).

    Reduces total tool tokens passed to the main LLM by 70-80%.
    """

    @classmethod
    async def select_tool_names(cls, user_query: str) -> List[str]:
        """
        Determines the list of tool names needed for a given user query.
        """
        rule_tools, is_confident = RuleBasedRouter.match_tools(user_query)
        selected = []
        if is_confident and rule_tools:
            logger.info(f"[HYBRID ROUTER] Matched via RuleBasedRouter: {rule_tools}")
            selected = list(rule_tools)
        else:
            logger.info(f"[HYBRID ROUTER] Low confidence rule match. Invoking LLMRouter...")
            llm_tools = await LLMRouter.route_query(user_query)
            if llm_tools:
                selected = list(set(rule_tools + llm_tools))
                logger.info(f"[HYBRID ROUTER] Matched via LLMRouter: {selected}")
            else:
                logger.warning("[HYBRID ROUTER] Both routers returned empty. Using default fallback.")
                selected = ["search_my_patients"]

        # Check if query contains a phone number (6 or more digits, supporting Arabic/Eastern numerals)
        import re
        digits = re.findall(r"[0-9\u0660-\u0669\u06f0-\u06f9]", user_query)
        has_phone = len(digits) >= 6

        if has_phone:
            # If a phone number is present in the query/context, automatically route phone-related tools
            for t in ["search_my_patients", "add_new_patient", "update_patient_info"]:
                if t not in selected:
                    selected.append(t)

        # GATING: If 'add_new_patient' is selected but phone is missing and no skip confirmation is present,
        # remove it so the LLM is forced to ask for the phone number.
        if "add_new_patient" in selected:
            # Check if query has skip confirmation keywords
            unavailable_keywords = [
                "مش معايا", "معيش", "مش متوفر", "معرفش", "من غير", "بدون رقم", "بدون هاتف", 
                "غير متوفر", "لا يوجد", "لا املك", "سجله وخلاص", "سجل وخلاص", "معيش رقم"
            ]
            has_confirmation = any(kw in user_query for kw in unavailable_keywords)
            
            if not has_phone and not has_confirmation:
                logger.info("[HYBRID ROUTER] Removing all tools because patient registration is pending phone number input.")
                selected = []

        return selected

    @classmethod
    async def get_tools_for_query(cls, user_query: str) -> List[Dict[str, Any]]:
        """
        Returns JSON tool schemas (with prerequisites auto-resolved) 
        ready to pass to the main LLM request.
        """
        selected_names = await cls.select_tool_names(user_query)
        schemas = ToolRegistry.get_schemas_by_names(selected_names)
        
        logger.info(f"[HYBRID ROUTER] Final Selected Schemas ({len(schemas)} tools): "
                    f"{[s.get('function', {}).get('name') for s in schemas]}")
        return schemas
