from pydantic import BaseModel
from uuid import UUID
from datetime import date, datetime
from typing import Optional


class VisitCreate(BaseModel):
    patient_id: UUID
    doctor_id: UUID
    appointment_id: Optional[UUID] = None
    visit_date: Optional[date] = None  # defaults to today in DB
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None


class VisitResponse(BaseModel):
    id: UUID
    patient_id: UUID
    doctor_id: UUID
    appointment_id: Optional[UUID] = None
    visit_date: date
    description: Optional[str] = None
    diagnosis: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
