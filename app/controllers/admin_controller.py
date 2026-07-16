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

@router.get("/subscriptions")
async def get_all_subscriptions():
    """
    Get a list of all active/expired subscriptions in the system.
    """
    return await admin_service.get_all_subscriptions()

@router.patch("/doctors/{doctor_id}/toggle-status")
async def toggle_doctor_status(doctor_id: UUID):
    try:
        return await admin_service.toggle_doctor_status(doctor_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/departments/{department_id}/toggle-status")
async def toggle_department_status(department_id: UUID):
    try:
        return await admin_service.toggle_department_status(department_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/doctors/{doctor_id}")
async def delete_doctor(doctor_id: UUID):
    try:
        success = await admin_service.delete_doctor(doctor_id)
        if not success:
            raise HTTPException(status_code=404, detail="الطبيب غير موجود.")
        return {"message": "تم حذف الطبيب نهائياً بنجاح."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/departments/{department_id}")
async def delete_department(department_id: UUID):
    try:
        success = await admin_service.delete_department(department_id)
        if not success:
            raise HTTPException(status_code=404, detail="القسم غير موجود.")
        return {"message": "تم حذف القسم نهائياً بنجاح."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
