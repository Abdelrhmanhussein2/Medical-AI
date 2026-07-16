from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

class BundleResponse(BaseModel):
    id: UUID
    name: str
    target_type: str
    max_doctors: Optional[int] = None
    duration_days: int
    price: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SubscriptionCreateRequest(BaseModel):
    bundle_id: UUID

class AssignDoctorRequest(BaseModel):
    doctor_id: UUID

class SubscriptionResponse(BaseModel):
    id: UUID
    department_id: Optional[UUID] = None
    doctor_id: Optional[UUID] = None
    bundle_id: UUID
    start_date: datetime
    end_date: datetime
    status: str
    total_seats: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Custom fields for frontend visibility
    bundle_name: Optional[str] = None
    seats_used: Optional[int] = None
    managed_by_org: Optional[bool] = False

    class Config:
        from_attributes = True
