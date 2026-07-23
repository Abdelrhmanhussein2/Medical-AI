# app/services/router/smart_router.py
"""
Smart Agentic Tool Router
─────────────────────────
Replaces the keyword-based HybridToolRouter with a pure LLM-powered intent
analysis step using llama-3.1-8b-instant.

For every incoming message, the router:
  1. Builds a clean routing context (current message + last AI message only)
  2. Calls the lightweight LLM to understand the doctor's intent
  3. Gets back a structured JSON with:
       - intent name
       - selected tools (from whitelist)
       - missing required fields
       - whether patient_id is needed
       - confidence score (0.0 – 1.0)
       - one-sentence Arabic reasoning
  4. Validates tool names against the registry whitelist (security guard)
  5. Auto-resolves prerequisite tools (e.g., search_my_patients for book_appointment)
  6. Prints a rich debug table to the server console
  7. Returns final tool schemas ready for the main LLM

Design Goals:
  - Scalability  : add a new tool → update ROUTER_SHORT_DESCS only, no keyword lists
  - Maintainability: single source of truth (ToolRegistry)
  - Security     : strict whitelist validation, no unknown tools allowed through
  - Debuggability: every routing decision is logged in a structured, readable format
"""

from __future__ import annotations

import os
import re
import json
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from groq import AsyncGroq

from app.core.config import settings
from app.services.router.tool_registry import PREREQUISITE_MAP, ROUTER_SHORT_DESCS, ToolRegistry

logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────

ROUTER_MODEL = "llama-3.1-8b-instant"

# If LLM confidence is below this threshold, we return NO tools and let the
# main LLM ask for clarification instead of guessing.
CONFIDENCE_THRESHOLD = 0.50

# Hard cap on the number of tools passed to the main LLM.
MAX_TOOLS = 4

# ─── ANSI colours (console debug output) ─────────────────────────────────────
_G    = "\033[92m"   # green
_Y    = "\033[93m"   # yellow
_C    = "\033[96m"   # cyan
_R    = "\033[91m"   # red
_BOLD = "\033[1m"
_RST  = "\033[0m"    # reset


def _dbg(msg: str) -> None:
    """Prints a prefixed, coloured debug line to stdout."""
    print(f"{_C}[SMART ROUTER]{_RST} {msg}", flush=True)


# ─── Router Prompt ────────────────────────────────────────────────────────────

_ROUTER_SYSTEM_PROMPT_TEMPLATE = """\
أنت محلل نوايا دقيق لمنظومة إدارة عيادة طبية.
مهمتك تحليل رسالة الطبيب وتحديد الأدوات المطلوبة لخدمة طلبه.

الأدوات المتاحة:
{tool_manifest}

━━ قواعد صارمة ━━
1. أعد ONLY valid JSON object — بدون أي markdown أو ```:
{{
  "intent": "اسم النية بالإنجليزية (مثل BOOK_APPOINTMENT)",
  "tools": ["tool_name_1", "tool_name_2"],
  "missing_required": ["وصف عربي لأي مدخل إجباري ناقص"],
  "needs_patient_id": true,
  "confidence": 0.9,
  "reasoning": "جملة واحدة بالعربية توضح لماذا اخترت هذه الأدوات"
}}
2. tools: يجب أن تكون فقط من القائمة أعلاه — لا تخترع أسماء.
3. tools: لا تتجاوز {max_tools} أدوات.
4. missing_required: اذكر فقط المدخلات الإجبارية الناقصة. إذا لا شيء ناقص أعد [].
5. needs_patient_id: true إذا الأداة تحتاج patient_id ولم يُذكر في السياق.

━━ قواعد التمييز بين النوايا المتشابهة ━━
- "الغ / الغي / إلغاء / كنسل" → cancel_appointment (إلغاء نهائي)
- "أجل / تأجيل / غير الموعد / تغيير الموعد" → reschedule_appointment (تغيير الوقت)
- "كام / كم عدد / إحصائيات / أرباح / تقرير / شهري" → get_clinic_stats أو get_monthly_report (ليس search_my_patients)
- "سجل مواعيدي / جدول مواعيدي / هات مواعيدي" → get_my_appointments أو get_today_schedule (فهذا استعراض للمواعيد وليس حجز book_appointment)
- إذا سأل المساعد "هل تريد تسجيله كمريض جديد؟" وأجاب الطبيب بالموافقة (اه / نعم / سجل / ضيفه) → النية هي ADD_NEW_PATIENT والأداة هي add_new_patient فقط (ولا تضف book_appointment أو search_my_patients لأننا نحتاج تسجيله أولاً)
- إذا أجاب الطبيب برقم هاتف وكان المساعد يسأل عنه لإكمال التسجيل → add_new_patient
- إذا قال الطبيب "ضيفه / سجله / اضفه" مع "احجزله / بكره / الساعة" في نفس الرسالة → [add_new_patient, book_appointment] معاً
- إذا اختار الطبيب مريضاً من قائمة (كتب اسماً بعد سؤال المساعد): تابع الطلب الأصلي الذي كان يريده
  (إذا كان يريد حجز موعد → book_appointment + search_my_patients)
  (إذا كان يريد تسجيل → add_new_patient)
- "اه / نعم / تمام / صح" دون سياق → confidence 0.3 و tools: []

━━ تعليمات الردود المتعددة ━━
إذا وُجد "الطلب الأصلي للطبيب" في السياق، فهو يمثل النية الأساسية التي يجب العودة إليها
عند اختيار الأدوات في الردود اللاحقة.
"""


# ─── Data Model ───────────────────────────────────────────────────────────────

@dataclass
class RouterDecision:
    """Structured output produced by the Smart Router LLM call."""
    intent: str = "UNKNOWN"
    tools: List[str] = field(default_factory=list)
    missing_required: List[str] = field(default_factory=list)
    needs_patient_id: bool = False
    confidence: float = 0.0
    reasoning: str = ""
    # Populated after validation & prerequisite expansion
    final_tools: List[str] = field(default_factory=list)
    # Raw LLM output (kept for debugging)
    raw_llm_output: str = ""


# ─── Smart Router ─────────────────────────────────────────────────────────────

class SmartRouter:
    """
    LLM-powered agentic tool router for the Medical AI platform.

    Public interface:
        tools = await SmartRouter.get_tools_for_query(
            current_user_msg="احجز لمحمد مسعد بكره الساعة 2",
            last_ai_msg="وجدت مريضين …  أيهم تقصد؟"
        )
    """

    # Cached manifest string (built once from ROUTER_SHORT_DESCS)
    _tool_manifest: Optional[str] = None
    # Cached valid tool name set (built once from ToolRegistry)
    _valid_tool_names: Optional[set] = None

    # ── Caches ────────────────────────────────────────────────────────────────

    @classmethod
    def _get_tool_manifest(cls) -> str:
        """Returns a compact formatted list of all available tools."""
        if cls._tool_manifest is None:
            lines = [f"- {name}: {desc}" for name, desc in ROUTER_SHORT_DESCS.items()]
            cls._tool_manifest = "\n".join(lines)
        return cls._tool_manifest

    @classmethod
    def _get_valid_tool_names(cls) -> set:
        """Returns the set of all registered tool names (whitelist)."""
        if cls._valid_tool_names is None:
            cls._valid_tool_names = {
                t["function"]["name"]
                for t in ToolRegistry.get_all_schemas()
            }
        return cls._valid_tool_names

    # ── Context Builder ────────────────────────────────────────────────────────

    @classmethod
    def _build_routing_context(
        cls,
        current_user_msg: str,
        last_ai_msg: Optional[str],
        previous_user_msg: Optional[str] = None,
    ) -> str:
        """
        Builds the routing context for the LLM.

        Includes three layers (from oldest to newest):
        1. previous_user_msg  — the original intent (e.g. "احجز لمحمد مسعد")
           This is critical for multi-turn flows so the router knows why the
           doctor is now sending a follow-up like a name or phone number.
        2. last_ai_msg        — what the assistant asked (trimmed to 300 chars)
        3. current_user_msg   — the doctor's actual current response

        We deliberately exclude the full history to avoid stale keywords from
        old messages polluting the current intent analysis.
        """
        parts: list[str] = []
        if previous_user_msg:
            parts.append(f"[الطلب الأصلي للطبيب]:\n{previous_user_msg.strip()[:200]}")
        if last_ai_msg:
            parts.append(f"[آخر رد من المساعد]:\n{last_ai_msg.strip()[:300]}")
        parts.append(f"[رسالة الطبيب الحالية]:\n{current_user_msg}")
        return "\n\n".join(parts)

    # ── LLM Call ──────────────────────────────────────────────────────────────

    @classmethod
    async def _call_router_llm(
        cls,
        routing_context: str,
        api_key: str,
    ) -> str:
        """Calls the lightweight router LLM and returns its raw text output."""
        system_prompt = _ROUTER_SYSTEM_PROMPT_TEMPLATE.format(
            tool_manifest=cls._get_tool_manifest(),
            max_tools=MAX_TOOLS,
        )
        client = AsyncGroq(api_key=api_key.strip())
        response = await client.chat.completions.create(
            model=ROUTER_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": routing_context},
            ],
            temperature=0.0,
            max_tokens=500,
        )
        return (response.choices[0].message.content or "").strip()

    # ── Response Parser ────────────────────────────────────────────────────────

    @classmethod
    def _parse_response(cls, raw_text: str) -> RouterDecision:
        """Parses the LLM JSON response into a RouterDecision dataclass."""
        decision = RouterDecision(raw_llm_output=raw_text)

        # Strip markdown code fences if present
        clean = re.sub(r"^```(?:json)?", "", raw_text.strip(), flags=re.MULTILINE).strip()
        clean = re.sub(r"```$", "", clean, flags=re.MULTILINE).strip()

        # Extract first JSON object
        match = re.search(r"\{.*\}", clean, re.DOTALL)
        if not match:
            logger.warning(f"[SMART ROUTER] No JSON object found in output: {raw_text[:200]}")
            return decision

        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError as exc:
            logger.warning(f"[SMART ROUTER] JSON parse error: {exc} | raw: {raw_text[:200]}")
            return decision

        decision.intent = str(data.get("intent", "UNKNOWN"))
        decision.tools = [str(t) for t in data.get("tools", []) if isinstance(t, str)]
        decision.missing_required = [str(m) for m in data.get("missing_required", []) if isinstance(m, str)]
        decision.needs_patient_id = bool(data.get("needs_patient_id", False))
        decision.reasoning = str(data.get("reasoning", ""))

        try:
            decision.confidence = max(0.0, min(1.0, float(data.get("confidence", 0.0))))
        except (TypeError, ValueError):
            decision.confidence = 0.0

        return decision

    # ── Security Guard + Prerequisite Resolver ────────────────────────────────

    @classmethod
    def _validate_and_expand(cls, raw_tools: List[str]) -> List[str]:
        """
        Security guard:
          - Rejects any tool name not in the registry whitelist.
        Prerequisite resolver:
          - Auto-adds prerequisite tools (e.g. search_my_patients for book_appointment).
        """
        whitelist = cls._get_valid_tool_names()

        # Step 1 — whitelist filter
        validated: List[str] = []
        for name in raw_tools:
            if name in whitelist:
                validated.append(name)
            else:
                _dbg(f"{_R}⚠️  SECURITY GUARD: rejected unknown tool '{name}'{_RST}")

        # Step 2 — add prerequisites (maintaining insertion order)
        expanded: List[str] = list(validated)
        seen = set(validated)
        for name in validated:
            for prereq in PREREQUISITE_MAP.get(name, []):
                if prereq not in seen:
                    expanded.append(prereq)
                    seen.add(prereq)

        return expanded[:MAX_TOOLS]

    # ── Debug Printer ─────────────────────────────────────────────────────────

    @classmethod
    def _print_debug(cls, decision: RouterDecision, final_tools: List[str]) -> None:
        """Prints a rich, structured debug table to the server console."""
        conf_color = _G if decision.confidence >= 0.8 else (_Y if decision.confidence >= 0.5 else _R)

        sep = f"{_C}{_BOLD}{'═' * 54}{_RST}"
        print(f"\n{sep}", flush=True)
        print(f"{_C}[SMART ROUTER]{_RST} 🧠 {_BOLD}INTENT   {_RST}: "
              f"{_Y}{decision.intent}{_RST}  "
              f"(conf: {conf_color}{decision.confidence:.2f}{_RST})", flush=True)

        tools_str = f"{_G}{' → '.join(final_tools)}{_RST}" if final_tools else f"{_Y}⛔ NONE — LLM will ask{_RST}"
        print(f"{_C}[SMART ROUTER]{_RST} 🔧 {_BOLD}TOOLS    {_RST}: {tools_str}", flush=True)

        for m in decision.missing_required:
            print(f"{_C}[SMART ROUTER]{_RST} ⚠️  {_BOLD}MISSING  {_RST}: {_Y}{m}{_RST}", flush=True)

        if decision.needs_patient_id:
            print(f"{_C}[SMART ROUTER]{_RST} 🔑 {_BOLD}PATIENT_ID{_RST}: required — search_my_patients will run first", flush=True)

        print(f"{_C}[SMART ROUTER]{_RST} 💬 {_BOLD}REASONING{_RST}: {decision.reasoning}", flush=True)
        print(f"{sep}\n", flush=True)

    # ── Public Entry Point ────────────────────────────────────────────────────

    @classmethod
    async def get_tools_for_query(
        cls,
        current_user_msg: str,
        last_ai_msg: Optional[str] = None,
        previous_user_msg: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Main entry point. Determines the set of tool schemas to pass to the
        main LLM for a given doctor message.

        Args:
            current_user_msg  : The doctor's latest message (required).
            last_ai_msg       : The last AI response (for follow-up context).
            previous_user_msg : The previous doctor message — critical for
                                multi-turn flows so the router knows the
                                original intent (e.g. booking) when the doctor
                                replies with just a name or phone number.

        Returns:
            A list of tool JSON schemas ready to be passed to the main LLM.
            Returns empty list when confidence is below threshold.
        """
        api_key = settings.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "")
        if not api_key:
            logger.warning("[SMART ROUTER] No GROQ_API_KEY — returning all tools as fallback.")
            return ToolRegistry.get_all_schemas()

        # ── Step 1: Build routing context ──────────────────────────────────
        routing_context = cls._build_routing_context(
            current_user_msg, last_ai_msg, previous_user_msg
        )
        preview = current_user_msg[:70] + "…" if len(current_user_msg) > 70 else current_user_msg
        _dbg(f"🚀 Routing: '{preview}'")
        if previous_user_msg:
            _dbg(f"📌 Original intent: '{previous_user_msg[:60]}{'…' if len(previous_user_msg) > 60 else ''}'")  

        # ── Step 2: LLM intent analysis ────────────────────────────────────
        try:
            raw_text = await cls._call_router_llm(routing_context, api_key)
        except Exception as exc:
            logger.exception(f"[SMART ROUTER] LLM call failed: {exc}")
            _dbg(f"{_R}❌ LLM call failed — falling back to all tools{_RST}")
            return ToolRegistry.get_all_schemas()

        # ── Step 3: Parse structured response ──────────────────────────────
        decision = cls._parse_response(raw_text)

        # ── Step 4: Security guard + prerequisite resolution ───────────────
        final_tools = cls._validate_and_expand(decision.tools)
        decision.final_tools = final_tools

        # ── Step 5: Print debug table ──────────────────────────────────────
        cls._print_debug(decision, final_tools)

        # ── Step 6: Confidence gate ────────────────────────────────────────
        if decision.confidence < CONFIDENCE_THRESHOLD:
            _dbg(
                f"{_Y}⚠️  Confidence {decision.confidence:.2f} < {CONFIDENCE_THRESHOLD} "
                f"→ returning NO tools (main LLM will ask for clarification){_RST}"
            )
            return []

        # ── Step 7: Return full schemas for selected tools ─────────────────
        schemas = ToolRegistry.get_schemas_by_names(final_tools)
        _dbg(f"✅ Final schemas delivered: {[s['function']['name'] for s in schemas]}")
        return schemas
