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

class DepartmentDashboardStats(BaseModel):
    total_doctors: int
    total_appointments: int
    best_doctor: Optional[str] = None

class AdminDepartmentStatItem(BaseModel):
    department: DepartmentResponse
    stats: DepartmentDashboardStats
    doctors: List[DoctorResponse]
