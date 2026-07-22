import asyncio
import sys
import os

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

from app.services.router import HybridToolRouter, RuleBasedRouter

TEST_QUERIES = [
    "هل عندي مريض اسمه علاء؟",
    "احجز موعد لعلي بكره الساعة 3",
    "إيه جدول مواعيد اليوم؟",
    "عرضلي إحصائيات العيادة والشهر ده",
    "عايز اكنسل موعد أحمد اللي بكره",
    "سجل زيارة لمريض: ضغط عالي وعلاجه امبولات",
    "أنهي مرضى في العيادة عندهم سكر؟",
    "تعديل رقم تليفون مريض اسمه محمود",
    "تكلمني عن الحالة المعقدة دي والتقارير"
]

async def run_tests():
    print("=" * 60)
    print("🧪 TESTING HYBRID TOOL ROUTER")
    print("=" * 60)

    for q in TEST_QUERIES:
        print(f"\nQUERY: '{q}'")
        rule_tools, is_confident = RuleBasedRouter.match_tools(q)
        print(f"  [Rule Match] Confident: {is_confident} | Tools: {rule_tools}")
        
        final_schemas = await HybridToolRouter.get_tools_for_query(q)
        final_names = [s['function']['name'] for s in final_schemas]
        print(f"  [Final Routed Schemas ({len(final_names)})]: {final_names}")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
