import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

def preprocess_query(q: str) -> str:
    q_clean = q.lower().strip()
    normalized_q = q_clean.replace("ى", "ي").replace("ة", "ه").replace("أ", "ا").replace("إ", "ا")
    
    temp = normalized_q
    stop_words = ["مين", "عرض", "البحث عن", "بحث عن", "قائمة", "سجل", "كل", "اللي عندي", "عندي", "بتوعي", "المسجلين", "الموجودين", "يا ترى", "هل فيه", "هل يوجد"]
    for stop_word in stop_words:
        temp = temp.replace(stop_word, "").strip()
        
    if temp in ["", "مرضى", "مرضي", "مريض", "المرضى", "المرضي", "المرضا", "مرضاي", "مرضايا", "مرضائي", "مرضائى"]:
        return ""
    return q

tests = [
    "مين المرضي اللي عندي",
    "المرضى بتوعي",
    "عرض المرضى",
    "عايز مريض اسمه احمد",
    "ابحث عن مريض اسمه علي ياسين",
    "هل فيه مريض مسجل باسم محمود",
    "مرضاي",
    "المرضى"
]

for t in tests:
    print(f"INPUT: '{t}' -> PROCESSED: '{preprocess_query(t)}'")
