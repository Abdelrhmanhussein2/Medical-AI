import sys, re, os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.getcwd())

from app.services.ai_tools.patient_tools import is_dummy_phone

ALLOWED_UNAVAILABLE = {"غير متوفر", "غير معروف", "لا يوجد", "بدون رقم", "مش متوفر"}

test_cases = [
    (None,           "No phone at all"),
    ("",             "Empty string"),
    ("غير متوفر",    "Explicit unavailable (should PASS)"),
    ("0000000000",   "Dummy number (should REJECT)"),
    ("01012345678",  "Real number (should PASS)"),
    ("مش متوفر",     "Colloquial unavailable (should PASS)"),
    ("01234567890",  "Real number 2 (should PASS)"),
    ("123456789",    "Sequential dummy (should REJECT)"),
    ("+201551234567","International format (should PASS)"),
]

for phone, desc in test_cases:
    phone_str = (str(phone).strip() if phone else "")
    
    if not phone_str or phone_str.lower() in ["none", "null", "n/a", "unknown", ""]:
        result = "❌ REJECT (no phone → ask user)"
    elif is_dummy_phone(phone_str) and phone_str not in ALLOWED_UNAVAILABLE:
        result = "❌ REJECT (dummy phone)"
    else:
        result = "✅ ACCEPT"
    
    print(f"  {desc:45s} → {result}")
