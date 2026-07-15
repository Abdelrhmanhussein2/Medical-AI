from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.schemes.doctor_schema import DoctorResponse

class DepartmentBase(BaseModel):
    name: str
    email: EmailStr

class DepartmentCreate(DepartmentBase):
    password: str

class DepartmentResponse(DepartmentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TopDoctor(BaseModel):
    id: UUID
    name: str
    patients_count: int
    ai_adoption: int
    status: str

class ExpiringDoctor(BaseModel):
    id: UUID
    name: str
    days_left: int

class ActivityLog(BaseModel):
    id: str
    message: str
    time_ago: str

class DepartmentDashboardStats(BaseModel):
    total_doctors: int
    active_licenses: int
    ai_adoption_rate: int
    monthly_consults: int
    consultation_trends: List[int]
    top_performing_doctors: List[TopDoctor]
    expiring_doctors: List[ExpiringDoctor]
    department_activity: List[ActivityLog]

class AdminDepartmentStatItem(BaseModel):
    department: DepartmentResponse
    stats: DepartmentDashboardStats
    doctors: List[DoctorResponse]
