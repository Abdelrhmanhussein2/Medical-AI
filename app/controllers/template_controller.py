from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status, Form, File, UploadFile
from app.core.dependencies import require_role
from app.schemes.template_schema import (
    TemplateCreate,
    TemplateResponse,
    PatientFillCreate,
    PatientFillResponse,
    TemplateFillExtractRequest,
    TemplateField
)
from app.services.template_service import template_service

router = APIRouter(
    prefix="/templates",
    tags=["Templates"],
    dependencies=[Depends(require_role("doctor"))]
)

@router.post("/", response_model=TemplateResponse, status_code=status.HTTP_201_CREATED)
async def create_template(
    data: TemplateCreate,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Creates a new note template for the logged in doctor.
    Fields limit is enforced to a maximum of 10.
    """
    doctor_id = current_user["id"]
    fields_list = [f.model_dump() for f in data.fields]
    return await template_service.create_template(doctor_id, data.name, fields_list)

@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Lists all note templates belonging to the logged in doctor.
    """
    doctor_id = current_user["id"]
    return await template_service.list_templates(doctor_id)

@router.get("/ai-suggest", response_model=List[TemplateField])
async def ai_suggest_fields(
    name: str = Query(..., min_length=1),
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Suggests note template fields based on the template name using LLM.
    """
    return await template_service.generate_suggested_fields(name)

@router.post("/ai-extract", response_model=List[TemplateField])
async def ai_extract_fields(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Extracts clinical note template fields from text instructions or voice recording upload using LLM.
    """
    return await template_service.extract_fields_from_input(text, file)

@router.get("/registry/search", response_model=List[str])
async def search_field_registry(
    q: str = Query(..., min_length=1),
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Searches the global template field registry for autocomplete.
    """
    return await template_service.search_registry(q)

@router.post("/patients/fills", response_model=PatientFillResponse)
async def save_patient_fill(
    data: PatientFillCreate,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Creates or updates (upserts) the template filled values for a specific patient.
    Checks doctor ownership of both template and patient.
    """
    doctor_id = current_user["id"]
    return await template_service.save_patient_fill(
        doctor_id=doctor_id,
        patient_id=data.patient_id,
        template_id=data.template_id,
        filled_data=data.filled_data
    )

@router.get("/patients/{patient_id}/fills", response_model=List[PatientFillResponse])
async def get_patient_fills(
    patient_id: UUID,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Retrieves all note templates filled for a specific patient.
    """
    doctor_id = current_user["id"]
    return await template_service.get_patient_fills(patient_id, doctor_id)

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Retrieves a single note template by ID. Ownership is verified.
    """
    doctor_id = current_user["id"]
    return await template_service.get_template(template_id, doctor_id)

@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Deletes a template. Ownership is verified.
    """
    doctor_id = current_user["id"]
    await template_service.delete_template(template_id, doctor_id)

@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    data: TemplateCreate,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Updates an existing note template (name and fields list).
    """
    doctor_id = current_user["id"]
    fields_list = [f.model_dump() for f in data.fields]
    return await template_service.update_template(template_id, doctor_id, data.name, fields_list)

@router.post("/patients/fills/ai-extract", response_model=dict)
async def ai_extract_patient_fill(
    data: TemplateFillExtractRequest,
    current_user: dict = Depends(require_role("doctor"))
):
    """
    Extracts clinical note values for template fields from the session transcript.
    """
    doctor_id = current_user["id"]
    return await template_service.extract_patient_fill_values(doctor_id, data.template_id, data.transcript)
