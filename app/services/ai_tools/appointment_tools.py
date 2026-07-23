# app/services/ai_tools/appointment_tools.py
import logging
from uuid import UUID
from datetime import datetime, date, timedelta

from typing import Any, Optional

logger = logging.getLogger(__name__)

async def tool_get_my_appointments(fn_args: dict, owner_id: str, conn) -> dict:
    date_from_str = str(fn_args.get("date_from") or "")
    date_to_str = str(fn_args.get("date_to") or "")
    try:
        from datetime import datetime
        date_from_obj = datetime.strptime(date_from_str, "%Y-%m-%d").date()
        date_to_obj = datetime.strptime(date_to_str, "%Y-%m-%d").date()
    except ValueError:
        from datetime import date, timedelta
        date_from_obj = date.today()
        date_to_obj = date.today() + timedelta(days=7)

    appts = await conn.fetch(
        """
        SELECT a.appointment_date, a.appointment_time, a.status, a.description,
               p.name as patient_name
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.doctor_id = $1
          AND a.appointment_date BETWEEN $2 AND $3
        ORDER BY a.appointment_date, a.appointment_time
        LIMIT 20
        """,
        UUID(owner_id), date_from_obj, date_to_obj
    )
    return {
        "appointments": [
            {"date": str(a['appointment_date']), "time": str(a['appointment_time']), "patient": a['patient_name'], "status": a['status']}
            for a in appts
        ]
    }

def safe_uuid(val: Any) -> Optional[UUID]:
    if not val:
        return None
    try:
        return UUID(str(val))
    except ValueError:
        return None

async def tool_book_appointment(fn_args: dict, owner_id: str, conn) -> dict:
    pid = fn_args.get("patient_id")
    appt_date = fn_args.get("appointment_date")
    appt_time = fn_args.get("appointment_time")
    desc = fn_args.get("description", "")

    if not (pid and appt_date and appt_time):
        return {"status": "error", "message": "بيانات الحجز غير مكتملة. تأكد من تحديد المريض والتاريخ والوقت."}

    pid_uuid = safe_uuid(pid)
    if not pid_uuid:
        return {"status": "error", "message": f"معرف المريض (patient_id) غير صالح: '{pid}'. يجب أن يكون بصيغة UUID حقيقية. يرجى البحث عن المريض أولاً للحصول على معرفه الحقيقي."}

    try:
        # Security: Verify patient belongs to the doctor
        patient_check = await conn.fetchval(
            "SELECT id FROM patients WHERE id = $1 AND doctor_id = $2",
            pid_uuid, UUID(owner_id)
        )
        if not patient_check:
            return {"status": "error", "message": "المريض غير موجود في عيادتك أو ليس لديك صلاحية للحجز له."}

        from datetime import datetime
        d_obj = datetime.strptime(appt_date, "%Y-%m-%d").date()
        t_obj = datetime.strptime(appt_time, "%H:%M").time()

        await conn.execute(
            """
            INSERT INTO appointments (id, doctor_id, patient_id, appointment_date, appointment_time, description, status, duration_minutes, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'scheduled', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            UUID(owner_id), pid_uuid, d_obj, t_obj, desc
        )
        return {"status": "success", "message": "تم حجز الموعد بنجاح."}
    except Exception as e:
        if "unique constraint" in str(e).lower() or "uniqueviolationerror" in e.__class__.__name__.lower():
            return {"status": "error", "message": "هذا الموعد محجوز مسبقاً لمريض آخر في هذا اليوم والوقت. يرجى اختيار موعد آخر."}
        logger.exception(f"Error in book_appointment: {e}")
        return {"status": "error", "message": f"حدث خطأ أثناء الحجز: {str(e)}"}

async def tool_cancel_appointment(fn_args: dict, owner_id: str, conn) -> dict:
    appt_id = fn_args.get("appointment_id")
    if not appt_id:
        return {"status": "error", "message": "معرف الموعد مطلوب."}

    appt_uuid = safe_uuid(appt_id)
    if not appt_uuid:
        return {"status": "error", "message": f"معرف الموعد غير صالح: '{appt_id}'. يجب أن يكون بصيغة UUID."}

    try:
        res = await conn.execute(
            "UPDATE appointments SET status = 'cancelled' WHERE id = $1 AND doctor_id = $2 AND status != 'cancelled'",
            appt_uuid, UUID(owner_id)
        )
        if "UPDATE 1" in res:
            return {"status": "success", "message": "تم إلغاء الموعد بنجاح."}
        else:
            return {"status": "error", "message": "لم يتم العثور على الموعد أو أنه ملغي بالفعل."}
    except Exception as e:
        logger.exception(f"Error in cancel_appointment: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}

async def tool_reschedule_appointment(fn_args: dict, owner_id: str, conn) -> dict:
    appt_id = fn_args.get("appointment_id")
    new_date_str = fn_args.get("new_date")
    new_time_str = fn_args.get("new_time")
    if not (appt_id and new_date_str and new_time_str):
        return {"status": "error", "message": "معرف الموعد والتاريخ والوقت الجديد مطلوبون."}

    appt_uuid = safe_uuid(appt_id)
    if not appt_uuid:
        return {"status": "error", "message": f"معرف الموعد غير صالح: '{appt_id}'. يجب أن يكون بصيغة UUID."}

    try:
        from datetime import datetime
        new_d = datetime.strptime(new_date_str, "%Y-%m-%d").date()
        new_t = datetime.strptime(new_time_str, "%H:%M").time()
        res = await conn.execute(
            "UPDATE appointments SET appointment_date = $1, appointment_time = $2, status = 'scheduled' WHERE id = $3 AND doctor_id = $4",
            new_d, new_t, appt_uuid, UUID(owner_id)
        )
        if "UPDATE 1" in res:
            return {"status": "success", "message": f"تم تغيير الموعد بنجاح إلى {new_date_str} الساعة {new_time_str}."}
        else:
            return {"status": "error", "message": "لم يتم العثور على الموعد."}
    except Exception as e:
        if "unique constraint" in str(e).lower() or "uniqueviolationerror" in e.__class__.__name__.lower():
            return {"status": "error", "message": "هذا الموعد الجديد محجوز مسبقاً لمريض آخر في هذا اليوم والوقت. يرجى اختيار موعد آخر."}
        logger.exception(f"Error in reschedule_appointment: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}

async def tool_update_appointment_status(fn_args: dict, owner_id: str, conn) -> dict:
    appt_id = fn_args.get("appointment_id")
    new_status = fn_args.get("new_status")
    if not (appt_id and new_status):
        return {"status": "error", "message": "معرف الموعد والحالة الجديدة مطلوبان."}

    appt_uuid = safe_uuid(appt_id)
    if not appt_uuid:
        return {"status": "error", "message": f"معرف الموعد غير صالح: '{appt_id}'. يجب أن يكون بصيغة UUID."}

    try:
        res = await conn.execute(
            "UPDATE appointments SET status = $1 WHERE id = $2 AND doctor_id = $3",
            new_status, appt_uuid, UUID(owner_id)
        )
        status_map = {"confirmed": "مؤكد", "completed": "مكتمل", "no_show": "لم يحضر"}
        if "UPDATE 1" in res:
            return {"status": "success", "message": f"تم تحديث حالة الموعد إلى: {status_map.get(new_status, new_status)}."}
        else:
            return {"status": "error", "message": "لم يتم العثور على الموعد."}
    except Exception as e:
        logger.exception(f"Error in update_appointment_status: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}

async def tool_get_today_schedule(fn_args: dict, owner_id: str, conn) -> dict:
    try:
        from datetime import date
        today = date.today()
        today_appts = await conn.fetch(
            """
            SELECT a.id, a.appointment_time, a.status, a.description, p.name as patient_name, p.phone as patient_phone
            FROM appointments a
            JOIN patients p ON p.id = a.patient_id
            WHERE a.doctor_id = $1 AND a.appointment_date = $2
            ORDER BY a.appointment_time
            """,
            UUID(owner_id), today
        )
        return {
            "date": str(today),
            "total": len(today_appts),
            "appointments": [
                {
                    "id": str(a['id']),
                    "time": str(a['appointment_time']),
                    "patient_name": a['patient_name'],
                    "patient_phone": a['patient_phone'],
                    "status": a['status'],
                    "description": a['description']
                }
                for a in today_appts
            ]
        }
    except Exception as e:
        logger.exception(f"Error in get_today_schedule: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}
