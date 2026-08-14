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
                "description": "ابحث عن مريض أو أكثر في سجلات العيادة بالاسم أو رقم الهاتف.",
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
                            "description": "الرقم التعريفي (UUID) للمريض المراد الحجز له. يجب الحصول عليه من نتائج أداة search_my_patients أو add_new_patient أولاً. يمنع منعاً باتاً تخمين هذا المعرف أو تمرير قيم وهمية مثل '1' أو 'uuid'!"
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
                "description": "إضافة مريض جديد إلى سجلات العيادة.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "اسم المريض بالكامل"
                        },
                        "phone": {
                            "type": "string",
                            "description": "رقم هاتف المريض المكون من أرقام فقط (مثال: 0501234567). لا تحزر هذا الرقم ولا ترسل 'غير متوفر' من عندك أبداً؛ إذا لم يذكره الطبيب صراحة في الرسالة، توقف وسله عن الرقم أولاً، وفقط إذا أكد لك عدم توفر الرقم أرسل 'غير متوفر'."
                        },
                        "date_of_birth": {
                            "type": "string",
                            "description": "تاريخ الميلاد (YYYY-MM-DD) (اختياري)"
                        },
                        "gender": {
                            "type": "string",
                            "description": "الجنس: ذكر أو أنثى (اختياري)"
                        },
                        "diseases": {
                            "type": "string",
                            "description": "الأمراض المزمنة للمريض إن وجدت (مثل: الضغط، السكر، إلخ) (اختياري)"
                        },
                        "habits": {
                            "type": "string",
                            "description": "العادات اليومية وأسلوب الحياة للمريض إن وجد (مثل: تدخين، رياضة، إلخ) (اختياري)"
                        },
<<<<<<< HEAD
                        "force_create": {
                            "type": "boolean",
                            "description": "اجعلها true لتخطي فحص تشابه الأسماء وإضافة مريض جديد فوراً إذا أكد الطبيب أنه مريض جديد مختلف."
=======
                        "force": {
                            "type": "boolean",
                            "description": "تمرير true لتجاوز تحذير تشابه الأسماء وإضافة المريض قسرياً حتى لو وجد مريض مشابه بالاسم (استخدمه فقط عندما يؤكد الطبيب أن المريض مختلف تماماً)."
>>>>>>> be1d812223e1c183c9290ce6f061e1d304e02f28
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
                "description": "حذف مريض من سجلات العيادة نهائياً. يجب البحث عن المريض أولاً باستخدام search_my_patients للحصول على الـ patient_id.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "معرف المريض (UUID) الحقيقي المستخرج من نتائج البحث (يمنع التخمين تماماً!)"
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
                            "description": "معرف المريض (UUID) الحقيقي المستخرج من نتائج البحث (يمنع التخمين تماماً!)"
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
                            "description": "معرف المريض (UUID) الحقيقي المستخرج من نتائج البحث (يمنع التخمين تماماً!)"
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
                        },
                        "diseases": {
                            "type": "string",
                            "description": "الأمراض المزمنة للمريض (اختياري)"
                        },
                        "habits": {
                            "type": "string",
                            "description": "العادات والأسلوب الشخصي للمريض كالتدخين ونمط الحياة (اختياري)"
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
                            "description": "معرف المريض (UUID) الحقيقي المستخرج من نتائج البحث (يمنع التخمين تماماً!)"
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
        },
        {
            "type": "function",
            "function": {
                "name": "send_appointment_welcome_message",
                "description": "أرسل رسالة ترحيبية وتأكيد حجز موعد للمريض عبر الواتساب. يجب تحديد رقم المريض (patient_id) والتاريخ والوقت.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_id": {
                            "type": "string",
                            "description": "الرقم التعريفي (UUID) للمريض المراد إرسال الرسالة الترحيبية له."
                        },
                        "appointment_date": {
                            "type": "string",
                            "description": "تاريخ الموعد المحجوز (YYYY-MM-DD)"
                        },
                        "appointment_time": {
                            "type": "string",
                            "description": "وقت الموعد المحجوز (HH:MM)"
                        }
                    },
                    "required": ["patient_id", "appointment_date", "appointment_time"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "send_report_to_doctor_whatsapp",
                "description": "أرسل تقريراً أو إحصائيات معينة أو ملخص الحالات مباشرة إلى رقم هاتف الطبيب المسجل عبر الواتساب. استخدمها عندما يطلب الطبيب إرسال شيء له على الواتساب.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "report_text": {
                            "type": "string",
                            "description": "نص التقرير أو ملخص الحالات التي سيتم إرسالها على الواتساب للطبيب."
                        }
                    },
                    "required": ["report_text"]
                }
            }
        }
    ]


def get_admin_tool_definitions() -> List[Dict[str, Any]]:
    """
    Returns the list of JSON schemas defining all tools available to the Admin AI.
    """
    return [
        {
            "type": "function",
            "function": {
                "name": "get_system_stats",
                "description": "استرجع إحصائيات عامة للنظام (إجمالي عدد الأطباء، المرضى، المواعيد، الاشتراكات الفعالة).",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_doctor_performance",
                "description": "استرجع إحصائيات الأداء لطبيب معين (عدد مواعيده، الزيارات المكتملة، وعدد مرضاه) بالبحث عن اسمه.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "doctor_name": {
                            "type": "string",
                            "description": "اسم الطبيب للبحث عنه وجلب إحصائياته"
                        }
                    },
                    "required": ["doctor_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_revenue_report",
                "description": "استرجع ملخص إيرادات الاشتراكات النشطة.",
                "parameters": {
                    "type": "object",
                    "properties": {}
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "send_report_to_admin",
                "description": "أرسل تقريراً أو إحصائيات معينة مباشرة إلى رقم هاتف الأدمن المسجل عبر الواتساب.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "report_text": {
                            "type": "string",
                            "description": "نص التقرير أو الإحصائيات التي سيتم إرسالها على الواتساب."
                        }
                    },
                    "required": ["report_text"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "query_database_readonly",
                "description": "نفذ استعلام SQL من نوع SELECT لقراءة أي بيانات أو إحصائيات دقيقة مباشرة من قاعدة البيانات. يمنع تعديل أو حذف البيانات.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "sql_query": {
                            "type": "string",
                            "description": "استعلام SQL المراد تنفيذه (مثال: SELECT * FROM doctors LIMIT 5). يجب أن يبدأ بـ SELECT."
                        }
                    },
                    "required": ["sql_query"]
                }
            }
        }
    ]

