from fastapi import APIRouter, HTTPException, status, Depends
from uuid import UUID
from app.core.dependencies import get_current_user

from app.schemes.visit_schema import VisitCreate, VisitResponse
from app.services.visit_service import VisitService

router = APIRouter(prefix="/visits", tags=["Visits"])


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_visit(data: VisitCreate):
    """
    إنشاء سجل زيارة جديد لمريض (السامري الطبي).
    يشمل: وصف الحالة، التشخيص، الملاحظات.
    """
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
async def get_visit(visit_id: UUID):
    """
    جلب تفاصيل زيارة واحدة بالكامل.
    """
    visit = await VisitService.get_visit(str(visit_id))
    if not visit:
        raise HTTPException(status_code=404, detail="الزيارة غير موجودة")
    return visit
