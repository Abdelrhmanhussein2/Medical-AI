# app/services/ai_tools/report_tools.py
import logging
from uuid import UUID
from datetime import datetime, date

from typing import Any, Optional

logger = logging.getLogger(__name__)

async def tool_get_clinic_stats(fn_args: dict, owner_id: str, conn) -> dict:
    stats = await conn.fetchrow(
        """
        SELECT 
          (SELECT COUNT(DISTINCT p.id) FROM patients p LEFT JOIN appointments a ON p.id = a.patient_id WHERE p.doctor_id = $1 OR a.doctor_id = $1) as total_patients_all_time,
          (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1) as total_appointments_all_time,
          (SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND date_trunc('month', appointment_date) = date_trunc('month', CURRENT_DATE)) as appointments_this_month,
          (SELECT COUNT(*) FROM visits WHERE doctor_id = $1 AND date_trunc('month', visit_date) = date_trunc('month', CURRENT_DATE)) as completed_visits_this_month
        """,
        UUID(owner_id)
    )
    if not stats:
        return {
            "إجمالي المرضى": 0,
            "إجمالي المواعيد": 0,
            "مواعيد هذا الشهر": 0,
            "الزيارات المكتملة هذا الشهر": 0
        }
    return {
        "إجمالي المرضى": stats["total_patients_all_time"] or 0,
        "إجمالي المواعيد": stats["total_appointments_all_time"] or 0,
        "مواعيد هذا الشهر": stats["appointments_this_month"] or 0,
        "الزيارات المكتملة هذا الشهر": stats["completed_visits_this_month"] or 0
    }

def safe_uuid(val: Any) -> Optional[UUID]:
    if not val:
        return None
    try:
        return UUID(str(val))
    except ValueError:
        return None

async def tool_add_visit_record(fn_args: dict, owner_id: str, conn) -> dict:
    v_pid = fn_args.get("patient_id")
    v_diag = fn_args.get("diagnosis")
    v_desc = fn_args.get("description", "")
    v_notes = fn_args.get("notes", "")
    v_date_str = fn_args.get("visit_date")

    if not (v_pid and v_diag):
        return {"status": "error", "message": "معرف المريض والتشخيص مطلوبان."}

    pid_uuid = safe_uuid(v_pid)
    if not pid_uuid:
        return {"status": "error", "message": f"معرف المريض غير صالح: '{v_pid}'. يجب أن يكون بصيغة UUID. يرجى البحث عن المريض أولاً للحصول على الـ UUID الحقيقي."}

    try:
        # Security: Verify patient belongs to the doctor
        patient_check = await conn.fetchval(
            "SELECT id FROM patients WHERE id = $1 AND doctor_id = $2",
            pid_uuid, UUID(owner_id)
        )
        if not patient_check:
            return {"status": "error", "message": "المريض غير موجود في عيادتك أو ليس لديك صلاحية لتسجيل زيارة له."}

        from datetime import datetime, date
        v_date = date.today()
        if v_date_str:
            try:
                v_date = datetime.strptime(v_date_str, "%Y-%m-%d").date()
            except ValueError:
                pass
        await conn.execute(
            """
            INSERT INTO visits (id, patient_id, doctor_id, visit_date, description, diagnosis, notes, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            pid_uuid, UUID(owner_id), v_date, v_desc, v_diag, v_notes
        )
        return {"status": "success", "message": f"تم تسجيل الزيارة بنجاح بتاريخ {v_date}. التشخيص: {v_diag}"}
    except Exception as e:
        logger.exception(f"Error in add_visit_record: {e}")
        return {"status": "error", "message": f"حدث خطأ أثناء تسجيل الزيارة: {str(e)}"}

async def tool_search_visits_by_diagnosis(fn_args: dict, owner_id: str, conn) -> dict:
    sq = fn_args.get("query", "")
    if not sq:
        return {"status": "error", "message": "كلمة البحث مطلوبة."}

    try:
        search_results = await conn.fetch(
            """
            SELECT v.visit_date, v.diagnosis, v.description, v.notes, p.name as patient_name
            FROM visits v
            JOIN patients p ON p.id = v.patient_id
            WHERE v.doctor_id = $1 AND (
                v.diagnosis ILIKE $2 OR v.description ILIKE $2 OR v.notes ILIKE $2
            )
            ORDER BY v.visit_date DESC
            LIMIT 10
            """,
            UUID(owner_id), f"%{sq}%"
        )
        return {
            "results": [
                {
                    "patient_name": r['patient_name'],
                    "visit_date": str(r['visit_date']),
                    "diagnosis": r['diagnosis'],
                    "description": r['description'],
                    "notes": r['notes']
                }
                for r in search_results
            ]
        }
    except Exception as e:
        logger.exception(f"Error in search_visits_by_diagnosis: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}

async def tool_get_monthly_report(fn_args: dict, owner_id: str, conn) -> dict:
    try:
        from datetime import date
        m = fn_args.get("month") or date.today().month
        y = fn_args.get("year") or date.today().year
        start_date = date(y, m, 1)
        if m == 12:
            end_date = date(y + 1, 1, 1)
        else:
            end_date = date(y, m + 1, 1)

        new_patients = await conn.fetchval(
            "SELECT COUNT(*) FROM patients WHERE doctor_id = $1 AND created_at >= $2 AND created_at < $3",
            UUID(owner_id), start_date, end_date
        )
        total_appts = await conn.fetchval(
            "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3",
            UUID(owner_id), start_date, end_date
        )
        completed = await conn.fetchval(
            "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3 AND status = 'completed'",
            UUID(owner_id), start_date, end_date
        )
        cancelled = await conn.fetchval(
            "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3 AND status = 'cancelled'",
            UUID(owner_id), start_date, end_date
        )
        no_show = await conn.fetchval(
            "SELECT COUNT(*) FROM appointments WHERE doctor_id = $1 AND appointment_date >= $2 AND appointment_date < $3 AND status = 'no_show'",
            UUID(owner_id), start_date, end_date
        )
        total_visits = await conn.fetchval(
            "SELECT COUNT(*) FROM visits WHERE doctor_id = $1 AND visit_date >= $2 AND visit_date < $3",
            UUID(owner_id), start_date, end_date
        )

        month_name_ar = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"]
        total_appts = total_appts or 0
        no_show = no_show or 0

        return {
            "month": month_name_ar[m - 1],
            "year": y,
            "new_patients": new_patients or 0,
            "total_appointments": total_appts,
            "completed_appointments": completed or 0,
            "cancelled_appointments": cancelled or 0,
            "no_show": no_show,
            "total_visits": total_visits or 0,
            "no_show_rate": f"{round((no_show / total_appts * 100) if total_appts > 0 else 0, 1)}%"
        }
    except Exception as e:
        logger.exception(f"Error in get_monthly_report: {e}")
        return {"status": "error", "message": f"حدث خطأ: {str(e)}"}
