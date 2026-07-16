from fastapi import APIRouter, HTTPException, status, Query, Depends
from app.schemes.patient_schema import PatientCreate, PatientResponse
from app.services.patient_service import PatientService
from app.core.dependencies import get_current_user
from uuid import UUID
from typing import List, Optional

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient: PatientCreate,
    current_user: dict = Depends(get_current_user)
):
    doctor_id = str(current_user["id"]) if current_user.get("role") == "doctor" else None
    new_patient = await PatientService.create_patient(patient, doctor_id)
    if not new_patient:
        raise HTTPException(status_code=400, detail="Could not create patient")
    return new_patient

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    patient = await PatientService.get_patient(str(patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Check permissions if the user is a doctor
    if current_user.get("role") == "doctor" and patient.get("doctor_id"):
        if str(patient["doctor_id"]) != str(current_user["id"]):
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية لعرض بيانات هذا المريض.")
            
    return patient


@router.get("/", response_model=List[PatientResponse])
async def search_patients(
    q: Optional[str] = Query(None, description="ابحث بالاسم أو رقم التليفون"),
    current_user: dict = Depends(get_current_user)
):
    """
    البحث عن مريض بالاسم أو رقم التليفون.
    مثال: GET /api/v1/patients/?q=أحمد
    مثال: GET /api/v1/patients/?q=0101234
    """
    doctor_id = str(current_user["id"]) if current_user.get("role") == "doctor" else None
    results = await PatientService.search_patients(q, doctor_id)
    return results

