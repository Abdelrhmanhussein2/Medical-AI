# app/services/router/rule_router.py
# ⚠️  DEPRECATED — Archived for reference only.
# This file is no longer used in production.
# Use SmartRouter (app/services/router/smart_router.py) instead.
# ─────────────────────────────────────────────────────────────────────────────
import re
import logging
from typing import List, Tuple, Set
from app.services.router.keyword_rules import KEYWORD_RULES
from app.services.router.tool_registry import ToolRegistry

logger = logging.getLogger(__name__)

class RuleBasedRouter:
    """
    Fast, zero-token Python engine for matching user queries against 
    keyword rules and regex patterns.
    """

    @classmethod
    def match_tools(cls, query: str) -> Tuple[List[str], bool]:
        """
        Evaluates the user query against defined rules.

        Returns:
            Tuple[List[str], bool]: 
                - List of matched tool names (deduplicated)
                - is_confident (True if match is strong and unambiguous, False otherwise)
        """
        q_clean = query.strip().lower()
        if not q_clean:
            return [], False

        matched_tools: Set[str] = set()
        highest_score = 0
        total_hits = 0

        for rule in sorted(KEYWORD_RULES, key=lambda x: x.get("priority", 0), reverse=True):
            score = 0
            # 1. Regex Match (High weight)
            if "regex" in rule and re.search(rule["regex"], q_clean, re.IGNORECASE):
                score += 3

            # 2. Keyword / Synonym Exact Hits
            for kw in rule.get("keywords", []):
                if kw in q_clean:
                    score += 2

            if score > 0:
                total_hits += 1
                highest_score = max(highest_score, score)
                for tool in rule.get("tools", []):
                    matched_tools.add(tool)

        tool_list = list(matched_tools)

        # Confidence criteria:
        # If score is strong (>= 2) and tool count is concise (<= 4 tools), consider it confident.
        is_confident = (highest_score >= 2 and 0 < len(tool_list) <= 4)

        if is_confident:
            logger.info(f"[RULE ROUTER] High Confidence Match (Score: {highest_score}): {tool_list}")
        else:
            logger.info(f"[RULE ROUTER] Low Confidence or Ambiguous (Score: {highest_score}, Tools: {tool_list}) -> Fallback needed.")

        return tool_list, is_confident
