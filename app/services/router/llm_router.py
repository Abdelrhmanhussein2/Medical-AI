# app/services/router/llm_router.py
# ⚠️  DEPRECATED — Archived for reference only.
# This file is no longer used in production.
# Use SmartRouter (app/services/router/smart_router.py) instead.
# ─────────────────────────────────────────────────────────────────────────────

import os
import re
import json
import logging
from typing import List
from groq import AsyncGroq
from app.core.config import settings
from app.services.router.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

# Ultra-fast lightweight router model
LIGHTWEIGHT_ROUTER_MODEL = "llama-3.1-8b-instant"

SYSTEM_ROUTER_PROMPT = """You are an intent router for a medical clinic AI assistant.
Your task is to analyze the user message and choose ONLY the relevant tool names required to serve the request.

Available Tools:
{tool_summary}

CRITICAL RULES:
1. Return ONLY a valid JSON array of tool names, e.g. ["search_my_patients"] or ["get_today_schedule"].
2. Do not write any explanations, notes, or markdown formatting (no ```json).
3. Choose at most 2 or 3 tools.
"""

class LLMRouter:
    """
    Lightweight, ultra-fast LLM fallback router for ambiguous user queries.
    Uses ~100-150 tokens per call.
    """

    @classmethod
    async def route_query(cls, user_query: str) -> List[str]:
        api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            logger.warning("[LLM ROUTER] Groq API key missing. Falling back to default search tool.")
            return ["search_my_patients"]

        tool_summary = ToolRegistry.get_llm_router_prompt_summary()
        sys_prompt = SYSTEM_ROUTER_PROMPT.format(tool_summary=tool_summary)

        try:
            client = AsyncGroq(api_key=api_key.strip())
            response = await client.chat.completions.create(
                model=LIGHTWEIGHT_ROUTER_MODEL,
                messages=[
                    {"role": "system", "content": sys_prompt},
                    {"role": "user", "content": user_query}
                ],
                temperature=0.0,
                max_tokens=60
            )

            raw_text = (response.choices[0].message.content or "").strip()
            logger.info(f"[LLM ROUTER] Raw router output: {raw_text}")

            # Clean JSON brackets
            clean_text = raw_text.replace("```json", "").replace("```", "").strip()

            # Attempt JSON parse
            try:
                selected_tools = json.loads(clean_text)
                if isinstance(selected_tools, list) and all(isinstance(t, str) for t in selected_tools):
                    logger.info(f"[LLM ROUTER] Successfully routed to: {selected_tools}")
                    return selected_tools
            except json.JSONDecodeError:
                # Regex fallback for json array extraction
                match = re.search(r'\[.*?\]', clean_text, re.DOTALL)
                if match:
                    extracted = json.loads(match.group(0))
                    if isinstance(extracted, list):
                        return [str(item) for item in extracted]

            logger.warning(f"[LLM ROUTER] Failed to parse router JSON: '{raw_text}'")
            return ["search_my_patients"]

        except Exception as e:
            logger.exception(f"[LLM ROUTER] Exception during routing: {e}")
            return ["search_my_patients"]
