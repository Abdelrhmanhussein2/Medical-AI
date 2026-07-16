from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from uuid import UUID
from app.core.dependencies import get_current_user
from app.schemes.subscription_schema import (
    BundleResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    AssignDoctorRequest
)
from app.services.subscription_service import subscription_service

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])

@router.get("/bundles", response_model=List[BundleResponse])
async def get_bundles(target_type: Optional[str] = None):
    """
    Get list of all active subscription bundles. Can filter by target_type: 'doctor' or 'department'.
    """
    try:
        return await subscription_service.get_bundles(target_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/my", response_model=Optional[SubscriptionResponse])
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    """
    Get active subscription details for the logged in doctor or department.
    """
    role = current_user.get("role")
    if role not in ["doctor", "department"]:
        raise HTTPException(
            status_code=400,
            detail="فقط الأطباء والإدارات يمكنهم امتلاك اشتراكات."
        )
    
    is_dept = (role == "department")
    try:
        sub = await subscription_service.get_active_subscription(
            owner_id=current_user["id"],
            is_department=is_dept
        )
        return sub
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscribe", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
async def create_subscription(
    body: SubscriptionCreateRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Subscribe the logged in doctor or department to a bundle.
    """
    role = current_user.get("role")
    if role not in ["doctor", "department"]:
        raise HTTPException(
            status_code=400,
            detail="فقط الأطباء والإدارات يمكنهم الاشتراك في الباقات."
        )
    
    is_dept = (role == "department")
    try:
        new_sub = await subscription_service.create_subscription(
            owner_id=current_user["id"],
            is_department=is_dept,
            bundle_id=body.bundle_id
        )
        return new_sub
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{subscription_id}/renew", response_model=SubscriptionResponse)
async def renew_subscription(
    subscription_id: UUID, 
    current_user: dict = Depends(get_current_user)
):
    """
    Renew an existing subscription.
    """
    role = current_user.get("role")
    if role not in ["doctor", "department", "admin"]:
        raise HTTPException(
            status_code=400,
            detail="فقط الأطباء أو الإدارات أو المسؤولين يمكنهم تجديد الاشتراكات."
        )
        
    is_dept = (role == "department")
    is_admin = (role == "admin")
    try:
        renewed = await subscription_service.renew_subscription(
            subscription_id=subscription_id,
            owner_id=current_user["id"],
            is_department=is_dept,
            is_admin=is_admin
        )
        return renewed
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{subscription_id}/assign-doctor")
async def assign_doctor_to_seat(
    subscription_id: UUID,
    body: AssignDoctorRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Assign a doctor to an active department subscription seat. (Departments Only)
    """
    if current_user.get("role") != "department":
        raise HTTPException(
            status_code=403,
            detail="هذا الإجراء مخصص لحسابات المنظمات/الإدارات فقط."
        )
        
    try:
        assignment = await subscription_service.assign_doctor_to_seat(
            subscription_id=subscription_id,
            department_id=current_user["id"],
            doctor_id=body.doctor_id
        )
        return {
            "message": "تم تفعيل الطبيب وحجز مقعد له في الباقة بنجاح.",
            "data": assignment
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{subscription_id}/remove-doctor/{doctor_id}")
async def remove_doctor_from_seat(
    subscription_id: UUID,
    doctor_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a doctor from a department subscription seat, freeing it up. (Departments Only)
    """
    if current_user.get("role") != "department":
        raise HTTPException(
            status_code=403,
            detail="هذا الإجراء مخصص لحسابات المنظمات/الإدارات فقط."
        )
        
    try:
        success = await subscription_service.remove_doctor_from_seat(
            subscription_id=subscription_id,
            department_id=current_user["id"],
            doctor_id=doctor_id
        )
        if not success:
            raise HTTPException(
                status_code=404, 
                detail="لم يتم العثور على الطبيب في هذا الاشتراك أو لم يتم حذفه."
            )
        return {"message": "تم إلغاء تفعيل الطبيب وتحرير المقعد بنجاح."}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
