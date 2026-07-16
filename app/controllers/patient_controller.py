from fastapi import APIRouter, HTTPException, status, Query
from app.schemes.patient_schema import PatientCreate, PatientResponse
from app.services.patient_service import PatientService
from uuid import UUID
from typing import List, Optional

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("/", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(patient: PatientCreate):
    new_patient = await PatientService.create_patient(patient)
    if not new_patient:
        raise HTTPException(status_code=400, detail="Could not create patient")
    return new_patient

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: UUID):
    patient = await PatientService.get_patient(str(patient_id))
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.get("/", response_model=List[PatientResponse])
async def search_patients(
    q: Optional[str] = Query(None, description="ابحث بالاسم أو رقم التليفون")
):
    """
    البحث عن مريض بالاسم أو رقم التليفون.
    مثال: GET /api/v1/patients/?q=أحمد
    مثال: GET /api/v1/patients/?q=0101234
    """
    results = await PatientService.search_patients(q)
    return results
