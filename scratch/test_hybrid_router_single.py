import asyncio
import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

from app.services.router.hybrid_router import HybridToolRouter
from app.services.router.rule_router import RuleBasedRouter

async def test():
    query = "سجله ماشي"
    print(f"\nQUERY: '{query}'")
    rule_tools, is_confident = RuleBasedRouter.match_tools(query)
    print(f"  [Rule Match] Confident: {is_confident} | Tools: {rule_tools}")
    
    final_schemas = await HybridToolRouter.get_tools_for_query(query)
    final_names = [s['function']['name'] for s in final_schemas]
    print(f"  [Final Routed Schemas ({len(final_names)})]: {final_names}")

if __name__ == "__main__":
    asyncio.run(test())
