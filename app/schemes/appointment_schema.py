from pydantic import BaseModel
from uuid import UUID
from datetime import date, time, datetime
from typing import Optional
from enum import Enum

class AppointmentStatus(str, Enum):
    scheduled = 'scheduled'
    confirmed = 'confirmed'
    completed = 'completed'
    cancelled = 'cancelled'
    no_show = 'no_show'

class AppointmentBase(BaseModel):
    doctor_id: UUID
    patient_id: UUID
    appointment_date: date
    appointment_time: time
    duration_minutes: int = 30
    description: Optional[str] = None
    patient_phone: Optional[str] = None
    calendar_event_id: Optional[str] = None

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: UUID
    status: AppointmentStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
