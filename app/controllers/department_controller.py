from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemes.doctor_schema import DoctorResponse
from app.schemes.department_schema import DepartmentDashboardStats, DepartmentResponse, DepartmentCreate
from app.services.department_service import department_service

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(dept: DepartmentCreate):
    """
    Create a new department with an account.
    """
    try:
        return await department_service.create_department(dept)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{department_id}/dashboard/stats", response_model=DepartmentDashboardStats)
async def get_department_stats(department_id: UUID):
    """
    Get statistics for the department dashboard (total doctors, appointments, best doctor).
    """
    stats = await department_service.get_department_dashboard_stats(department_id)
    return stats

@router.get("/{department_id}/doctors", response_model=List[DoctorResponse])
async def get_department_doctors(department_id: UUID):
    """
    Get a list of all registered doctors in the department.
    """
    return await department_service.get_department_doctors(department_id)
