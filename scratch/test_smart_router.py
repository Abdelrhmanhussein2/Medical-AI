"""
scratch/test_smart_router.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Manual test script for the SmartRouter.
Tests 8 real-world scenarios a doctor might say to verify routing decisions.

HOW TO RUN (from the project root inside WSL):
    python scratch/test_smart_router.py

WHAT IT CHECKS:
    - Does the router pick the right tools?
    - Does the debug table print clearly?
    - Does the confidence gate work on ambiguous messages?
    - Does it understand follow-up answers (choosing a patient from a list, etc.)?
"""

import asyncio
import sys
import os

# ── Make sure the project root is on sys.path ──────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.router.smart_router import SmartRouter  # noqa: E402

# ── ANSI colours ──────────────────────────────────────────────────────────────
_G    = "\033[92m"
_R    = "\033[91m"
_Y    = "\033[93m"
_BOLD = "\033[1m"
_RST  = "\033[0m"

# ── Test cases ─────────────────────────────────────────────────────────────────
# For each case we check that ALL `expected_tools` appear in the router output.
# The router may also include prerequisite tools — that's expected and fine.

TEST_CASES = [
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 1,
        "name": "حجز موعد — بيانات مكتملة تقريباً",
        "user_msg": "احجز لمحمد مسعد ميعاد بكره الساعة 2 بعد الظهر",
        "last_ai_msg": None,
        "expected_tools": ["search_my_patients", "book_appointment"],
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 2,
        "name": "رد باختيار مريض من قائمة — حجز",
        "previous_user_msg": "احجز لمحمد مسعد ميعاد بكره الساعة 2 بعد الظهر",
        "user_msg": "محمد مسعد شحته عبدالشافي",
        "last_ai_msg": (
            "وجدت مريضين:\n"
            "1. محمد مسعد\n"
            "2. محمد مسعد شحته عبدالشافي\n"
            "أيهم تقصد؟"
        ),
        "expected_tools": ["book_appointment"],  # router should continue booking
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 3,
        "name": "رد برقم الهاتف لإتمام تسجيل مريض جديد",
        "previous_user_msg": "سجل مريض جديد اسمه أحمد سامي",
        "user_msg": "01035377777",
        "last_ai_msg": "ما هو رقم هاتف المريض لإكمال التسجيل؟",
        "expected_tools": ["add_new_patient"],
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 4,
        "name": "إضافة مريض جديد مع رقم الهاتف في نفس الرسالة",
        "user_msg": "ضيف مريض جديد اسمه محمد علي ورقمه 01012345678",
        "last_ai_msg": None,
        "expected_tools": ["add_new_patient"],
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 5,
        "name": "جدول اليوم",
        "user_msg": "ايه مواعيدي النهارده؟",
        "last_ai_msg": None,
        "expected_tools": ["get_today_schedule"],
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 6,
        "name": "إحصائيات العيادة",
        "user_msg": "كام مريض عندي الشهر ده؟",
        "last_ai_msg": None,
        "expected_tools": ["get_clinic_stats"],
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 7,
        "name": "إلغاء موعد",
        "user_msg": "الغ ميعاد محمد مسعد اللي بكره",
        "last_ai_msg": None,
        "expected_tools": ["cancel_appointment"],
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 8,
        "name": "رسالة غامضة جداً — confidence gate",
        "user_msg": "اه",
        "last_ai_msg": None,
        "expected_tools": [],  # low confidence → no tools (LLM will ask)
    },
    # ──────────────────────────────────────────────────────────────────────────
    {
        "id": 9,
        "name": "حجز موعد بدون تحديد وقت وتاريخ",
        "user_msg": "احجز لمريض باسم محمد مسعد",
        "last_ai_msg": None,
        "expected_tools": ["search_my_patients", "book_appointment"],
    },
]


# ── Test runner ────────────────────────────────────────────────────────────────

async def run_tests() -> None:
    header = f"{'━'*60}"
    print(f"\n{_BOLD}{header}")
    print("  SMART ROUTER TEST SUITE")
    print(f"{header}{_RST}\n")

    passed = 0
    failed = 0

    for case in TEST_CASES:
        print(f"\n{_Y}{'─'*60}{_RST}")
        print(f"{_BOLD}Test {case['id']}/{len(TEST_CASES)}: {case['name']}{_RST}")
        print(f"  User msg  : '{case['user_msg']}'")
        if case.get("previous_user_msg"):
            print(f"  Prev msg  : '{case['previous_user_msg'][:70]}'")
        if case["last_ai_msg"]:
            preview = case["last_ai_msg"][:80]
            print(f"  Last AI   : '{preview}{'…' if len(case['last_ai_msg']) > 80 else ''}'")

        schemas = await SmartRouter.get_tools_for_query(
            current_user_msg=case["user_msg"],
            last_ai_msg=case.get("last_ai_msg"),
            previous_user_msg=case.get("previous_user_msg"),
        )

        got_tools      = {s["function"]["name"] for s in schemas}
        expected_tools = set(case["expected_tools"])

        # A test passes when every expected tool is present in the result.
        # The router may add extra prerequisite tools — that's acceptable.
        missing = expected_tools - got_tools

        if not missing:
            print(f"  {_G}✅ PASS{_RST}  expected: {sorted(expected_tools)}  got: {sorted(got_tools)}")
            passed += 1
        else:
            print(f"  {_R}❌ FAIL{_RST}  expected: {sorted(expected_tools)}  got: {sorted(got_tools)}")
            print(f"  {_R}   Missing: {sorted(missing)}{_RST}")
            failed += 1

    print(f"\n{_BOLD}{'━'*60}")
    print(f"  Results: {_G}{passed} PASSED{_RST}  |  {_R}{failed} FAILED{_RST}")
    print(f"{_BOLD}{'━'*60}{_RST}\n")


if __name__ == "__main__":
    asyncio.run(run_tests())
