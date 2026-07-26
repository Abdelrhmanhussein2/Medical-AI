from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import date, datetime
from typing import Optional

class PatientBase(BaseModel):
    name: str
    phone: str
    email: Optional[EmailStr] = None
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    doctor_id: Optional[UUID] = None
    file_id: Optional[str] = None
    diseases: Optional[str] = None
    habits: Optional[str] = None
    general_summary: Optional[str] = None

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    file_id: Optional[str] = None
    diseases: Optional[str] = None
    habits: Optional[str] = None
    general_summary: Optional[str] = None

class PatientResponse(PatientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
