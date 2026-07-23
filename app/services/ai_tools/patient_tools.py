# app/services/ai_tools/patient_tools.py
import logging
import re
from uuid import UUID
from datetime import datetime, date

from typing import Any, Optional

logger = logging.getLogger(__name__)

def is_dummy_phone(phone: Optional[str]) -> bool:
    if not phone:
        return True
    p = phone.strip().lower()
    # Arabic/English text markers for unavailable
    text_markers = [
        "none", "null", "n/a", "unknown",
        "غير متوفر", "غير معروف", "لا يوجد", "بدون رقم", "مش متوفر"
    ]
    if p in text_markers:
        return True
    # Extract only digits
    digits = re.sub(r"[^\d]", "", p)
    if len(digits) < 6:
        return True
    # All same digit (e.g. 0000000000, 1111111111)
    if len(set(digits)) <= 1:
        return True
    # Known dummy patterns (exact digit match)
    dummy_numbers = {"0000000000", "00000000", "123456789", "12345678", "01000000000"}
    if digits in dummy_numbers:
        return True
    return False

async def tool_search_my_patients(fn_args: dict, owner_id: str, conn) -> dict:
    q = fn_args.get("query", "").strip()
    # Remove spaces from query for a normalized comparison
    # This handles cases like "عبد الرحمن" vs "عبدالرحمن"
    q_no_spaces = q.replace(" ", "")
    patients = await conn.fetch(
        """
        SELECT id, name, phone, date_of_birth
        FROM patients
        WHERE doctor_id = $1
          AND (
            name ILIKE $2
            OR phone ILIKE $2
            OR REPLACE(name, ' ', '') ILIKE $3
          )
        LIMIT 10
        """,
        UUID(owner_id), f"%{q}%", f"%{q_no_spaces}%"
    )
    return {
        # phone is intentionally excluded — show only name.
        # Use get_patient_full_profile if contact details are needed.
        "patients": [
            {"id": str(p['id']), "name": p['name']}
            for p in patients
        ]
    }



def safe_uuid(val: Any) -> Optional[UUID]:
    if not val:
        return None
    try:
        return UUID(str(val))
    except ValueError:
        return None

async def tool_get_patient_visits(fn_args: dict, owner_id: str, conn) -> dict:
    pid = fn_args.get("patient_id")
    if not pid:
        return {"status": "error", "message": "الـ patient_id مطلوب للحصول على الزيارات."}

    pid_uuid = safe_uuid(pid)
    if not pid_uuid:
        return {"status": "error", "message": f"معرف المريض (patient_id) غير صالح: '{pid}'. يجب أن يكون بصيغة UUID. يرجى البحث عن المريض أولاً للحصول على الـ UUID الحقيقي."}

    try:
        visits = await conn.fetch(
            """
            SELECT visit_date, diagnosis, notes, description
            FROM patient_visits
            WHERE patient_id = $1 AND doctor_id = $2
            ORDER BY visit_date DESC LIMIT 5
            """,
            pid_uuid, UUID(owner_id)
        )
        return {
            "visits": [
                {"date": str(v['visit_date']), "description": v['description'], "diagnosis": v['diagnosis']}
                for v in visits
            ]
        }
    except Exception as e:
        logger.exception(f"Error in get_patient_visits: {e}")
        return {"status": "error", "message": f"حدث خطأ أثناء استرجاع الزيارات: {str(e)}"}

async def tool_add_new_patient(fn_args: dict, owner_id: str, conn) -> dict:
    p_name = fn_args.get("name")
    p_phone = fn_args.get("phone")
    p_dob = fn_args.get("date_of_birth")
    p_gender = fn_args.get("gender")

    if not p_name:
        return {"status": "error", "message": "اسم المريض مطلوب."}

    # Explicit "unavailable" markers the AI sends AFTER user confirms no phone
    ALLOWED_UNAVAILABLE = {"غير متوفر", "غير معروف", "لا يوجد", "بدون رقم", "مش متوفر"}

    phone_str = (str(p_phone).strip() if p_phone else "")

    if not phone_str or phone_str.lower() in ["none", "null", "n/a", "unknown", ""]:
        # Phone was NOT provided at all → reject and force AI to ask user
        return {
            "status": "error",
            "message": "رقم الهاتف غير موجود. يجب عليك سؤال الطبيب أولاً: 'ما هو رقم هاتف المريض؟' — إذا أكد الطبيب عدم توفر الرقم، أعد الاستدعاء مع phone='غير متوفر'."
        }

    if is_dummy_phone(phone_str) and phone_str not in ALLOWED_UNAVAILABLE:
        # Phone looks fake (e.g. 0000000000) but is NOT an explicit unavailable marker
        return {
            "status": "error",
            "message": "رقم الهاتف المُرسل يبدو وهمياً أو غير صالح. يرجى سؤال الطبيب عن الرقم الحقيقي، أو إذا أكد عدم توفره أرسل phone='غير متوفر'."
        }

    # At this point phone_str is either a real number or an explicit unavailable marker
    p_phone = phone_str

    try:
        from datetime import datetime
        d_obj = None
        if p_dob:
            try:
                d_obj = datetime.strptime(p_dob, "%Y-%m-%d").date()
            except ValueError:
                pass

        row = await conn.fetchrow(
            """
            INSERT INTO patients (id, doctor_id, name, phone, date_of_birth, gender, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING id
            """,
            UUID(owner_id), p_name, p_phone, d_obj, p_gender
        )
        return {
            "status": "success",
            "message": f"تمت إضافة المريض {p_name} بنجاح في سجلات العيادة.",
            "patient_id": str(row['id'])
        }
    except Exception as e:
        logger.exception(f"Error in add_new_patient: {e}")
        return {"status": "error", "message": f"حدث خطأ أثناء إضافة المريض: {str(e)}"}

async def tool_delete_patient(fn_args: dict, owner_id: str, conn) -> dict:
    del_pid = fn_args.get("patient_id")
    if not del_pid:
        return {"status": "error", "message": "معرف المريض مطلوب للحذف."}

    pid_uuid = safe_uuid(del_pid)
    if not pid_uuid:
        return {"status": "error", "message": f"معرف المريض غير صالح: '{del_pid}'. يجب أن يكون بصيغة UUID."}

    try:
        # Delete related data first
        await conn.execute(
            "DELETE FROM appointments WHERE patient_id = $1 AND doctor_id = $2",
            pid_uuid, UUID(owner_id)
        )
        await conn.execute(
            "DELETE FROM patient_visits WHERE patient_id = $1 AND doctor_id = $2",
            pid_uuid, UUID(owner_id)
        )
        del_result = await conn.execute(
            "DELETE FROM patients WHERE id = $1 AND doctor_id = $2",
            pid_uuid, UUID(owner_id)
        )
        if "DELETE 1" in del_result:
            return {"status": "success", "message": "تم حذف المريض ومواعيده وزياراته بنجاح من سجلات العيادة."}
        else:
            return {"status": "error", "message": "لم يتم العثور على المريض أو ليس لديك صلاحية حذفه."}
    except Exception as e:
        logger.exception(f"Error in delete_patient: {e}")
        return {"status": "error", "message": f"حدث خطأ أثناء حذف المريض: {str(e)}"}

async def tool_update_patient_info(fn_args: dict, owner_id: str, conn) -> dict:
    up_pid = fn_args.get("patient_id")
    if not up_pid:
        return {"status": "error", "message": "معرف المريض مطلوب."}

    pid_uuid = safe_uuid(up_pid)
    if not pid_uuid:
        return {"status": "error", "message": f"معرف المريض غير صالح: '{up_pid}'. يجب أن يكون بصيغة UUID."}

    try:
        updates = []
        params = [pid_uuid, UUID(owner_id)]
        param_idx = 3
        for field in ["name", "phone", "email", "gender"]:
            val = fn_args.get(field)
            if val:
                updates.append(f"{field} = ${param_idx}")
                params.append(val)
                param_idx += 1
        dob_val = fn_args.get("date_of_birth")
        if dob_val:
            from datetime import datetime
            try:
                dob_obj = datetime.strptime(dob_val, "%Y-%m-%d").date()
                updates.append(f"date_of_birth = ${param_idx}")
                params.append(dob_obj)
                param_idx += 1
            except ValueError:
                pass
        if updates:
            query = f"UPDATE patients SET {', '.join(updates)} WHERE id = $1 AND doctor_id = $2"
            res = await conn.execute(query, *params)
            if "UPDATE 1" in res:
                return {"status": "success", "message": "تم تحديث بيانات المريض بنجاح."}
            else:
                return {"status": "error", "message": "لم يتم العثور على المريض."}
        else:
            return {"status": "error", "message": "لم يتم تحديد أي بيانات للتعديل."}
    except Exception as e:
        logger.exception(f"Error in update_patient_info: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}

async def tool_get_patient_full_profile(fn_args: dict, owner_id: str, conn) -> dict:
    fp_pid = fn_args.get("patient_id")
    if not fp_pid:
        return {"status": "error", "message": "معرف المريض مطلوب."}

    pid_uuid = safe_uuid(fp_pid)
    if not pid_uuid:
        return {"status": "error", "message": f"معرف المريض غير صالح: '{fp_pid}'. يجب أن يكون بصيغة UUID."}

    try:
        patient = await conn.fetchrow(
            "SELECT id, name, phone, email, date_of_birth, gender, created_at FROM patients WHERE id = $1 AND doctor_id = $2",
            pid_uuid, UUID(owner_id)
        )
        if patient:
            recent_visits = await conn.fetch(
                "SELECT visit_date, diagnosis, description, notes FROM visits WHERE patient_id = $1 AND doctor_id = $2 ORDER BY visit_date DESC LIMIT 5",
                pid_uuid, UUID(owner_id)
            )
            upcoming_appts = await conn.fetch(
                "SELECT appointment_date, appointment_time, status, description FROM appointments WHERE patient_id = $1 AND doctor_id = $2 AND appointment_date >= CURRENT_DATE AND status != 'cancelled' ORDER BY appointment_date, appointment_time LIMIT 5",
                pid_uuid, UUID(owner_id)
            )
            return {
                "patient": {
                    "name": patient['name'],
                    "phone": patient['phone'],
                    "email": patient['email'],
                    "date_of_birth": str(patient['date_of_birth']) if patient['date_of_birth'] else None,
                    "gender": patient['gender'],
                    "registered_at": str(patient['created_at'].date())
                },
                "recent_visits": [
                    {"date": str(v['visit_date']), "diagnosis": v['diagnosis'], "description": v['description']}
                    for v in recent_visits
                ],
                "upcoming_appointments": [
                    {"date": str(a['appointment_date']), "time": str(a['appointment_time']), "status": a['status'], "description": a['description']}
                    for a in upcoming_appts
                ]
            }
        else:
            return {"status": "error", "message": "لم يتم العثور على المريض."}
    except Exception as e:
        logger.exception(f"Error in get_patient_full_profile: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}
