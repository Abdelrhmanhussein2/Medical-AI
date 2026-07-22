# app/services/ai_tools/schemas.py
from typing import List, Dict, Any

def get_tool_definitions() -> List[Dict[str, Any]]:
    """
    Returns the list of JSON schemas defining all tools available to the AI.
    """
    return [
        {
            "type": "function",
            "function": {
                "name": "search_my_patients",
                "description": "ابحث عن مريض أو أكثر في قاعدة بيانات العيادة بالاسم أو رقم الهاتف.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "اسم المريض أو جزء منه أو رقم هاتفه للبحث"
                        }
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_patient_visits",
                "description": "استرجع زيارات المريض السابقة والتشخيصات (يتطلب رقم المريض)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "الرقم التعريفي (UUID) للمريض"
                        }
                    },
                    "required": ["patient_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_my_appointments",
                "description": "احصل على جدول المواعيد الخاص بك في فترة محددة",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date_from": {
                            "type": "string",
                            "description": "تاريخ البداية (YYYY-MM-DD)"
                        },
                        "date_to": {
                            "type": "string",
                            "description": "تاريخ النهاية (YYYY-MM-DD)"
                        }
                    },
                    "required": ["date_from", "date_to"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_clinic_stats",
                "description": "احصل على إحصائيات عامة للعيادة (عدد المرضى، الزيارات، الدخل، إلخ)",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "book_appointment",
                "description": "حجز موعد لمريض في العيادة. يجب الحصول على patient_id أولاً باستخدام search_my_patients.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "الرقم التعريفي (UUID) للمريض المراد الحجز له"
                        },
                        "appointment_date": {
                            "type": "string",
                            "description": "تاريخ الموعد (YYYY-MM-DD)"
                        },
                        "appointment_time": {
                            "type": "string",
                            "description": "وقت الموعد (HH:MM)"
                        },
                        "description": {
                            "type": "string",
                            "description": "سبب الزيارة أو تفاصيل إضافية (اختياري)"
                        }
                    },
                    "required": ["patient_id", "appointment_date", "appointment_time"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "add_new_patient",
                "description": "إضافة مريض جديد إلى قاعدة بيانات العيادة.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "اسم المريض بالكامل"
                        },
                        "phone": {
                            "type": "string",
                            "description": "رقم هاتف المريض"
                        },
                        "date_of_birth": {
                            "type": "string",
                            "description": "تاريخ الميلاد (YYYY-MM-DD) (اختياري)"
                        },
                        "gender": {
                            "type": "string",
                            "description": "الجنس: ذكر أو أنثى (اختياري)"
                        }
                    },
                    "required": ["name", "phone"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "delete_patient",
                "description": "حذف مريض من قاعدة بيانات العيادة نهائياً. يجب البحث عن المريض أولاً باستخدام search_my_patients للحصول على الـ patient_id.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "معرف المريض (UUID) المراد حذفه"
                        }
                    },
                    "required": ["patient_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "cancel_appointment",
                "description": "إلغاء موعد محجوز. ابحث أولاً عن المواعيد باستخدام get_my_appointments.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "معرف الموعد (UUID) المراد إلغاؤه"
                        }
                    },
                    "required": ["appointment_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "reschedule_appointment",
                "description": "تغيير تاريخ أو وقت موعد محجوز. يجب تحديد الموعد القديم والتاريخ/الوقت الجديد.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "معرف الموعد (UUID) المراد تعديله"
                        },
                        "new_date": {
                            "type": "string",
                            "description": "التاريخ الجديد بصيغة YYYY-MM-DD"
                        },
                        "new_time": {
                            "type": "string",
                            "description": "الوقت الجديد بصيغة HH:MM (24 ساعة)"
                        }
                    },
                    "required": ["appointment_id", "new_date", "new_time"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "update_appointment_status",
                "description": "تحديث حالة موعد (مثل: completed بعد الزيارة، أو no_show إذا لم يحضر المريض).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "معرف الموعد (UUID)"
                        },
                        "new_status": {
                            "type": "string",
                            "enum": ["confirmed", "completed", "no_show"],
                            "description": "الحالة الجديدة: confirmed (مؤكد)، completed (مكتمل)، no_show (لم يحضر)"
                        }
                    },
                    "required": ["appointment_id", "new_status"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "add_visit_record",
                "description": "تسجيل زيارة جديدة لمريض مع التشخيص والملاحظات.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "معرف المريض (UUID)"
                        },
                        "diagnosis": {
                            "type": "string",
                            "description": "التشخيص"
                        },
                        "description": {
                            "type": "string",
                            "description": "وصف الحالة"
                        },
                        "notes": {
                            "type": "string",
                            "description": "ملاحظات إضافية (اختياري)"
                        },
                        "visit_date": {
                            "type": "string",
                            "description": "تاريخ الزيارة (YYYY-MM-DD). إذا لم يُحدد، يستخدم تاريخ اليوم."
                        }
                    },
                    "required": ["patient_id", "diagnosis"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_visits_by_diagnosis",
                "description": "بحث في سجلات الزيارات بناءً على التشخيص أو وصف الحالة (مثلاً: البحث عن كل المرضى اللي عندهم ضغط عالي).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "كلمة البحث في التشخيص أو الوصف"
                        }
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "update_patient_info",
                "description": "تعديل بيانات مريض موجود (مثل تغيير رقم الهاتف أو الاسم). ابحث عن المريض أولاً للحصول على الـ patient_id.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "معرف المريض (UUID)"
                        },
                        "name": {
                            "type": "string",
                            "description": "الاسم الجديد (اختياري)"
                        },
                        "phone": {
                            "type": "string",
                            "description": "رقم الهاتف الجديد (اختياري)"
                        },
                        "email": {
                            "type": "string",
                            "description": "البريد الإلكتروني (اختياري)"
                        },
                        "date_of_birth": {
                            "type": "string",
                            "description": "تاريخ الميلاد الجديد YYYY-MM-DD (اختياري)"
                        },
                        "gender": {
                            "type": "string",
                            "description": "الجنس: ذكر أو أنثى (اختياري)"
                        }
                    },
                    "required": ["patient_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_patient_full_profile",
                "description": "عرض الملف الكامل للمريض: بياناته الشخصية + آخر زياراته + مواعيده القادمة.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "معرف المريض (UUID)"
                        }
                    },
                    "required": ["patient_id"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_today_schedule",
                "description": "عرض جدول مواعيد اليوم بالتفصيل مرتبة بالوقت.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_monthly_report",
                "description": "تقرير شهري شامل: عدد المرضى الجدد، المواعيد، الإلغاءات، الزيارات المكتملة، ونسبة عدم الحضور.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "month": {
                            "type": "integer",
                            "description": "رقم الشهر (1-12). إذا لم يُحدد يستخدم الشهر الحالي."
                        },
                        "year": {
                            "type": "integer",
                            "description": "السنة. إذا لم تُحدد تستخدم السنة الحالية."
                        }
                    }
                }
            }
        }
    ]
