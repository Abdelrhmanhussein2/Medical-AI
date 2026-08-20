from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional
from uuid import UUID
from app.core.dependencies import get_current_user
from app.schemes.subscription_schema import (
    BundleResponse,
    SubscriptionCreateRequest,
    SubscriptionResponse,
    AssignDoctorRequest,
    RenewSubscriptionRequest
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
    Get current user's active subscription (Doctor or Department).
    """
    is_dept = (current_user.get("role") == "department")
    try:
        sub = await subscription_service.get_active_subscription(
            owner_id=current_user["id"],
            is_department=is_dept
        )
        return sub
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/subscribe", response_model=SubscriptionResponse)
async def create_subscription(
    body: SubscriptionCreateRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Subscribe to a bundle (Doctor or Department).
    """
    is_dept = (current_user.get("role") == "department")
    try:
        sub = await subscription_service.create_subscription(
            owner_id=current_user["id"],
            bundle_id=body.bundle_id,
            is_department=is_dept
        )
        return sub
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{subscription_id}/renew", response_model=SubscriptionResponse)
async def renew_subscription(
    subscription_id: UUID,
    body: Optional[RenewSubscriptionRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Renew an existing subscription with custom options.
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
        req_data = body or RenewSubscriptionRequest()
        renewed = await subscription_service.renew_subscription(
            subscription_id=subscription_id,
            owner_id=current_user["id"],
            is_department=is_dept,
            is_admin=is_admin,
            days_to_add=req_data.days_to_add,
            bundle_id=req_data.bundle_id,
            allowed_minutes=req_data.allowed_minutes,
            daily_message_limit=req_data.daily_message_limit
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
