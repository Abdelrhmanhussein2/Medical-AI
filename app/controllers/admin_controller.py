from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemes.doctor_schema import DoctorResponse
from app.services.admin_service import admin_service

router = APIRouter(prefix="/admins", tags=["Admins"])

@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """
    Get statistics for the admin dashboard (e.g. total doctors, patients, appointments).
    """
    return await admin_service.get_dashboard_stats()

@router.get("/doctors", response_model=List[DoctorResponse])
async def get_all_doctors():
    """
    Get a list of all registered doctors.
    """
    return await admin_service.get_all_doctors()
