# app/services/router/keyword_rules.py
import re
from typing import List, Dict, Any

KEYWORD_RULES: List[Dict[str, Any]] = [
    # --- 1. Today's Schedule ---
    {
        "intent": "TODAY_SCHEDULE",
        "regex": r"\b(اليوم|النهاردة|النهارده|جدول اليوم|مواعيد اليوم|today)\b",
        "keywords": ["النهاردة", "النهارده", "اليوم", "جدول اليوم", "مواعيد اليوم", "today"],
        "tools": ["get_today_schedule", "get_my_appointments"],
        "priority": 10
    },

    # --- 2. Clinic Stats & Reports ---
    {
        "intent": "CLINIC_STATS",
        "regex": r"\b(إحصائيات|احصائيات|تقرير|تقارير|أرباح|شهري|تقرير شهري|stats|report)\b",
        "keywords": ["إحصائيات", "احصائيات", "تقرير", "تقارير", "أرباح", "شهري", "stats"],
        "tools": ["get_clinic_stats", "get_monthly_report"],
        "priority": 10
    },

    # --- 3. Booking Appointments ---
    {
        "intent": "BOOK_APPOINTMENT",
        "regex": r"\b(احجز|حجز|حجز موعد|موعد جديد|ميعاد جديد|book)\b",
        "keywords": ["احجز", "حجز", "احجزلي", "حجز موعد", "book"],
        "tools": ["book_appointment", "search_my_patients"],
        "priority": 10
    },

    # --- 4. Cancel Appointment ---
    {
        "intent": "CANCEL_APPOINTMENT",
        "regex": r"\b(الغ|إلغاء|الغي|الغاء|كنسل|اكنسل|cancel)\b",
        "keywords": ["الغ", "إلغاء", "الغي", "الغاء", "كنسل", "اكنسل", "cancel"],
        "tools": ["cancel_appointment", "get_my_appointments"],
        "priority": 10
    },

    # --- 5. Reschedule Appointment ---
    {
        "intent": "RESCHEDULE_APPOINTMENT",
        "regex": r"\b(أجل|تأجيل|غير موعد|غير ميعاد|تغيير موعد|reschedule)\b",
        "keywords": ["أجل", "تأجيل", "غير موعد", "تغيير موعد", "reschedule"],
        "tools": ["reschedule_appointment", "get_my_appointments"],
        "priority": 10
    },

    # --- 6. Update Appointment Status (Completed/No-Show) ---
    {
        "intent": "UPDATE_STATUS",
        "regex": r"\b(حضر|ماجاش|ما جاش|مأجاش|لم يحضر|no_show|completed|حالة الموعد)\b",
        "keywords": ["حضر", "ماجاش", "لم يحضر", "no_show", "completed"],
        "tools": ["update_appointment_status", "get_my_appointments"],
        "priority": 10
    },

    # --- 7. Patient Search ---
    {
        "intent": "PATIENT_SEARCH",
        "regex": r"\b(مريض|مرضى|اسمه|اسم|تليفون|رقم|بحث عن مريض|عندنا مريض|هل يوجد مريض)\b",
        "keywords": ["مريض", "مرضى", "اسمه", "اسم", "تليفون", "رقم", "بحث"],
        "tools": ["search_my_patients"],
        "priority": 8
    },

    # --- 8. Patient Profile & History ---
    {
        "intent": "PATIENT_READ",
        "regex": r"\b(زيارات|زيارة سابقة|تاريخ مرضي|ملف المريض|سجل الزيارات|الملف الكامل)\b",
        "keywords": ["زيارات", "زيارة سابقة", "تاريخ مرضي", "ملف المريض", "سجل الزيارات"],
        "tools": ["get_patient_visits", "get_patient_full_profile", "search_my_patients"],
        "priority": 9
    },

    # --- 9. Add Patient ---
    {
        "intent": "ADD_PATIENT",
        "regex": r"\b(ضيف|أضف|اضف|تسجيل مريض|مريض جديد|إضافة مريض)\b",
        "keywords": ["ضيف", "أضف", "اضف", "تسجيل مريض", "مريض جديد"],
        "tools": ["add_new_patient"],
        "priority": 10
    },

    # --- 10. Delete Patient ---
    {
        "intent": "DELETE_PATIENT",
        "regex": r"\b(احذف|امسح|حذف مريض|مسح مريض)\b",
        "keywords": ["احذف", "امسح", "حذف مريض"],
        "tools": ["delete_patient", "search_my_patients"],
        "priority": 10
    },

    # --- 11. Update Patient Info ---
    {
        "intent": "UPDATE_PATIENT",
        "regex": r"\b(عدل|تعديل|تغيير تليفون|تحديث بيانات)\b",
        "keywords": ["عدل", "تعديل", "تغيير تليفون", "تحديث بيانات"],
        "tools": ["update_patient_info", "search_my_patients"],
        "priority": 10
    },

    # --- 12. Add Visit Record ---
    {
        "intent": "VISIT_RECORD",
        "regex": r"\b(سجل زيارة|اكتب زيارة|دون زيارة|دوّن|ملاحظات الزيارة)\b",
        "keywords": ["سجل زيارة", "اكتب زيارة", "دون زيارة", "ملاحظات الزيارة"],
        "tools": ["add_visit_record", "search_my_patients"],
        "priority": 10
    },

    # --- 13. Search Visits by Diagnosis ---
    {
        "intent": "DIAGNOSIS_SEARCH",
        "regex": r"\b(ضغط|سكر|اتشخصوا|عنده|عندهم|بحث بالتشخيص|تشخيص)\b",
        "keywords": ["ضغط", "سكر", "اتشخصوا", "عنده", "عندهم", "تشخيص"],
        "tools": ["search_visits_by_diagnosis", "search_my_patients"],
        "priority": 9
    }
]
