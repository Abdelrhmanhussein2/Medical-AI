def build_followup_message(patient_name: str, doctor_name: str) -> str:
    return (
        f"السلام عليكم يا {patient_name}، نتواصل معك من عيادة الدكتور {doctor_name} للاطمئنان عليك بعد زيارتك بالأمس. 🌸\n"
        "كيف تشعر اليوم؟ هل أنت بخير؟"
    )

def build_mild_response(doctor_notes: str) -> str:
    notes_section = f"\n📝 تعليمات الطبيب:\n{doctor_notes}" if doctor_notes else ""
    return (
        f"شفاك الله وعافاك. {notes_section}\n\n"
        "يرجى اتباع التعليمات ومراجعتنا فوراً إذا زاد التعب أو لم تشعر بتحسن."
    )

def build_severe_patient_reply() -> str:
    return (
        "سلامتك ألف سلامة، نأسف جداً لشعورك بالألم. 💔\n"
        "لقد أرسلنا تنبيهاً عاجلاً للطبيب للتواصل معك فوراً ومتابعة حالتك."
    )

def build_doctor_alert(patient_name: str, phone: str, visit_date: str, summary: str = None) -> str:
    summary_section = f"\n📝 ملخص حالة المريض:\n{summary}" if summary else ""
    return (
        "⚠️ *تنبيه عاجل من SBR AI*:\n"
        f"المريض: *{patient_name}*\n"
        f"رقم الجوال: {phone}\n"
        f"تاريخ الزيارة: {visit_date}\n"
        f"{summary_section}\n"
        "المريض يشعر بألم شديد وتعب شديد جداً بعد الزيارة. يرجى التواصل معه فوراً لمتابعة حالته."
    )

def build_6m_reminder(patient_name: str) -> str:
    return (
        f"مرحباً يا {patient_name}، نتمنى أن تكون بصحة جيدة. 🌸\n"
        "نود تذكيرك بأنه قد مضى 6 أشهر على زيارتك الأولى لنا. حان موعد الفحوصات الدورية نصف السنوية للاطمئنان على صحتك وطمأنتنا عليك.\n\n"
        "دمت بصحة وعافية."
    )

def build_fine_response() -> str:
    return "الحمد لله! سعداء جداً بسماع ذلك وعودتك للمسار الصحيح. 💚 نتمنى لك دائماً دوام الصحة والعافية."


def build_appointment_reminder_24h(patient_name: str, doctor_name: str, appt_date: str, appt_time: str) -> str:
    return (
        f"مرحباً يا {patient_name}، نود تذكيرك بموعدك غداً مع الدكتور {doctor_name} "
        f"بتاريخ {appt_date} في تمام الساعة {appt_time}. 🌸\n"
        "نتمنى لك دوام الصحة والعافية."
    )


def build_appointment_reminder_4h(patient_name: str, doctor_name: str, appt_time: str) -> str:
    return (
        f"تذكير بموعدك اليوم يا {patient_name}: موعدك مع الدكتور {doctor_name} "
        f"بعد 4 ساعات في تمام الساعة {appt_time}. 🌸\n"
        "بانتظارك عافاك الله."
    )

