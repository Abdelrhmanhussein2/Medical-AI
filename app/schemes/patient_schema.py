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

class PatientCreate(PatientBase):
    pass

class PatientResponse(PatientBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
