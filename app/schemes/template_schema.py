from uuid import UUID
from datetime import datetime
from typing import List, Dict
from pydantic import BaseModel, Field

class TemplateField(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    fields: List[TemplateField] = Field(..., max_length=10)

class TemplateResponse(BaseModel):
    id: UUID
    doctor_id: UUID
    name: str
    fields: List[TemplateField]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PatientFillCreate(BaseModel):
    patient_id: UUID
    template_id: UUID
    filled_data: Dict[str, str]  # Key = field label, Value = text entered by doctor

class PatientFillResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    template_id: UUID = None
    template_name: str
    filled_data: Dict[str, str]
    filled_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
