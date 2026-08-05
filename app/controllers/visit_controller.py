from fastapi import APIRouter, HTTPException, status, Depends
from uuid import UUID
from app.core.dependencies import get_current_user

from app.schemes.visit_schema import VisitCreate, VisitResponse
from app.services.visit_service import VisitService

router = APIRouter(prefix="/visits", tags=["Visits"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_visit(data: VisitCreate, current_user: dict = Depends(get_current_user)):
    """
    إنشاء سجل زيارة جديد لمريض (السامري الطبي).
    يشمل: وصف الحالة، التشخيص، الملاحظات.
    """
    role = current_user.get("role")
    if role == "doctor" and str(current_user["id"]) != str(data.doctor_id):
        raise HTTPException(status_code=403, detail="لا يمكنك تسجيل زيارات لأطباء آخرين.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                data.doctor_id, UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الطبيب لا ينتمي لقسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    visit = await VisitService.create_visit(data)
    if not visit:
        raise HTTPException(status_code=400, detail="تعذر إنشاء سجل الزيارة")
    return visit


@router.get("/patient/{patient_id}")
async def get_patient_visits(
    patient_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    جلب كل التاريخ الطبي لمريض معين (كل زياراته مرتبة من الأحدث للأقدم).
    """
    doctor_id = str(current_user["id"]) if current_user.get("role") == "doctor" else None
    visits = await VisitService.get_patient_visits(str(patient_id), doctor_id)
    return visits


@router.get("/{visit_id}")
async def get_visit(visit_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    جلب تفاصيل زيارة واحدة بالكامل.
    """
    visit = await VisitService.get_visit(str(visit_id))
    if not visit:
        raise HTTPException(status_code=404, detail="الزيارة غير موجودة")
        
    role = current_user.get("role")
    if role == "doctor" and str(visit.get("doctor_id")) != str(current_user["id"]):
        raise HTTPException(status_code=403, detail="غير مصرح لك بعرض هذه الزيارة.")
    elif role == "department":
        from app.core.database import db
        async with db.pool.acquire() as conn:
            belongs = await conn.fetchval(
                "SELECT EXISTS(SELECT 1 FROM doctors WHERE id = $1 AND department_id = $2)", 
                UUID(str(visit["doctor_id"])), UUID(str(current_user["id"]))
            )
            if not belongs:
                raise HTTPException(status_code=403, detail="الزيارة لا تخص أطباء قسمك.")
    elif role not in ("admin", "doctor", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")

    return visit
