import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

pattern1 = r"\b(ضيف|أضف|اضف|تسجيل مريض|مريض جديد|إضافة مريض|سجل|سجله|تسجيل)\b"
text = "سجله ماشي"

print("Pattern 1:", bool(re.search(pattern1, text)))

pattern2 = r"(ضيف|أضف|اضف|تسجيل|مريض جديد|إضافة مريض|سجل|سجله)"
print("Pattern 2:", bool(re.search(pattern2, text)))
