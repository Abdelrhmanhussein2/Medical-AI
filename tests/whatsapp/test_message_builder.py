from app.services.whatsapp.message_builder import (
    build_followup_message,
    build_mild_response,
    build_severe_patient_reply,
    build_doctor_alert,
    build_6m_reminder,
    build_fine_response
)

def test_build_followup_message():
    msg = build_followup_message("محمد", "أحمد")
    assert "محمد" in msg
    assert "أحمد" in msg
    assert "الزيارة" in msg or "الأمس" in msg

def test_build_mild_response():
    msg = build_mild_response("خد بندول كل ٨ ساعات")
    assert "خد بندول كل ٨ ساعات" in msg
    assert "شفاك الله" in msg

def test_build_severe_patient_reply():
    msg = build_severe_patient_reply()
    assert "نأسف جداً لشعورك بالألم" in msg
    assert "تنبيهاً عاجلاً للطبيب" in msg

def test_build_doctor_alert():
    msg = build_doctor_alert("سعيد", "96650000000", "2026-07-29", "مغص حاد")
    assert "سعيد" in msg
    assert "96650000000" in msg
    assert "2026-07-29" in msg
    assert "مغص حاد" in msg
    assert "ألم شديد" in msg

def test_build_6m_reminder():
    msg = build_6m_reminder("عمر")
    assert "عمر" in msg
    assert "6 أشهر" in msg
    assert "الفحوصات الدورية" in msg

def test_build_fine_response():
    msg = build_fine_response()
    assert "سعداء جداً" in msg
    assert "الصحة والعافية" in msg


def test_build_appointment_reminder_24h():
    from app.services.whatsapp.message_builder import build_appointment_reminder_24h
    msg = build_appointment_reminder_24h("محمد", "علي", "2026-08-02", "14:00")
    assert "محمد" in msg
    assert "علي" in msg
    assert "2026-08-02" in msg
    assert "14:00" in msg
    assert "تذكير بموعدك" in msg or "تذكيرك بموعدك" in msg


def test_build_appointment_reminder_4h():
    from app.services.whatsapp.message_builder import build_appointment_reminder_4h
    msg = build_appointment_reminder_4h("سارة", "خالد", "18:30")
    assert "سارة" in msg
    assert "خالد" in msg
    assert "18:30" in msg
    assert "4 ساعات" in msg

