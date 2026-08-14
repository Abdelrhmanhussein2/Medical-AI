from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel
from app.schemes.doctor_schema import DoctorResponse
from app.schemes.department_schema import DepartmentDashboardStats, DepartmentResponse, DepartmentCreate
from app.services.department_service import department_service
from app.core.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/departments", tags=["Departments"])

@router.post("/", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    dept: DepartmentCreate,
    current_user: dict = Depends(require_admin)
):
    """
    Create a new department with an account. Restricted to system administrators.
    """
    try:
        return await department_service.create_department(dept)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{department_id}/dashboard/stats", response_model=DepartmentDashboardStats)
async def get_department_stats(department_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Get statistics for the department dashboard (total doctors, appointments, best doctor).
    """
    if current_user.get("role") == "department" and str(current_user["id"]) != str(department_id):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول لبيانات قسم آخر.")
    if current_user.get("role") not in ("admin", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")
    stats = await department_service.get_department_dashboard_stats(department_id)
    return stats

@router.get("/{department_id}/doctors", response_model=List[DoctorResponse])
async def get_department_doctors(department_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Get a list of all registered doctors in the department.
    """
    if current_user.get("role") == "department" and str(current_user["id"]) != str(department_id):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول لبيانات قسم آخر.")
    if current_user.get("role") not in ("admin", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")
    return await department_service.get_department_doctors(department_id)

@router.patch("/{department_id}/doctors/{doctor_id}/toggle-status")
async def toggle_department_doctor_status(department_id: UUID, doctor_id: UUID, current_user: dict = Depends(get_current_user)):
    """
    Toggle a doctor's status (approved/disabled) by their department.
    """
    if current_user.get("role") == "department" and str(current_user["id"]) != str(department_id):
        raise HTTPException(status_code=403, detail="غير مصرح لك بتعديل أطباء قسم آخر.")
    if current_user.get("role") not in ("admin", "department"):
        raise HTTPException(status_code=403, detail="غير مصرح لك بالوصول.")
    from app.core.database import db
    try:
        async with db.pool.acquire() as conn:
            # check ownership
            owner = await conn.fetchval("SELECT department_id FROM doctors WHERE id = $1", doctor_id)
            if owner != department_id:
                raise HTTPException(status_code=403, detail="Unauthorized: Doctor does not belong to this department")
            
            # check if doctor has their own independent subscription and is currently active
            current_active = await conn.fetchval("SELECT is_active FROM doctors WHERE id = $1", doctor_id)
            if current_active:
                independent_sub = await conn.fetchval(
                    "SELECT id FROM subscriptions WHERE doctor_id = $1 AND status = 'active' AND end_date > now()",
                    doctor_id
                )
                if independent_sub:
                    raise HTTPException(status_code=403, detail="لا يمكنك تعطيل هذا الطبيب لأنه يمتلك اشتراكاً شخصياً مستقلاً.")

            
            row = await conn.fetchrow(
                """
                UPDATE doctors 
                SET is_active = NOT is_active,
                    updated_at = now() 
                WHERE id = $1 RETURNING id, name, is_active, status
                """,
                doctor_id
            )
            
            # If the doctor is now disabled, release their seat
            if row and not row['is_active']:
                # Delete from subscription_doctors to free up the seat
                await conn.execute("DELETE FROM subscription_doctors WHERE doctor_id = $1", doctor_id)
                
            return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
