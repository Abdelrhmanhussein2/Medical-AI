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
        # Step 1: Attempt Rule-Based Routing
        rule_tools, is_confident = RuleBasedRouter.match_tools(user_query)

        if is_confident and rule_tools:
            logger.info(f"[HYBRID ROUTER] Matched via RuleBasedRouter: {rule_tools}")
            return rule_tools

        # Step 2: Fallback to Lightweight LLM Router
        logger.info(f"[HYBRID ROUTER] Low confidence rule match. Invoking LLMRouter...")
        llm_tools = await LLMRouter.route_query(user_query)

        if llm_tools:
            # Combine any partial rule matches with LLM tools if applicable
            combined = list(set(rule_tools + llm_tools))
            logger.info(f"[HYBRID ROUTER] Matched via LLMRouter: {combined}")
            return combined

        # Fallback if both return empty
        logger.warning("[HYBRID ROUTER] Both routers returned empty. Using default fallback.")
        return ["search_my_patients"]

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
