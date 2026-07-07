from fastapi import APIRouter, HTTPException, status
from app.schemes.patient_schema import PatientCreate, PatientResponse
from app.services.patient_service import PatientService
from uuid import UUID

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
