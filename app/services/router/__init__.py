# app/services/router/__init__.py
from app.services.router.smart_router import SmartRouter          # ← primary router
from app.services.router.tool_registry import ToolRegistry

# ── Archived (kept for reference, no longer used in production) ──────────────
from app.services.router.hybrid_router import HybridToolRouter    # DEPRECATED
from app.services.router.rule_router import RuleBasedRouter        # DEPRECATED
from app.services.router.llm_router import LLMRouter               # DEPRECATED

__all__ = [
    "SmartRouter",          # use this
    "ToolRegistry",
    # archived
    "HybridToolRouter",
    "RuleBasedRouter",
    "LLMRouter",
]
