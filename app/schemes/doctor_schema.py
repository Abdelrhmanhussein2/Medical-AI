from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional
from enum import Enum

class DoctorStatus(str, Enum):
    pending = 'pending'
    approved = 'approved'
    rejected = 'rejected'

class DoctorBase(BaseModel):
    name: str
    email: EmailStr
    phone: str
    specialization: str
    department_id: Optional[UUID] = None
    certificate_url: Optional[str] = None
    profile_image_url: Optional[str] = None
    calendar_provider: Optional[str] = None
    calendar_id: Optional[str] = None
    is_active: bool = True

class DoctorCreate(DoctorBase):
    password: str
    status: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[str] = None

class DoctorResponse(DoctorBase):
    id: UUID
    status: DoctorStatus
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[str] = None
    subscription_activated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
