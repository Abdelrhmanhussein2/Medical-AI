from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from app.schemes.doctor_schema import DoctorCreate, DoctorResponse
from app.services.doctor_service import doctor_service
from app.core.database import db

router = APIRouter(prefix="/doctors", tags=["Doctors"])

class SubscriptionActivate(BaseModel):
    subscription_plan: str
    subscription_expiry: str  # YYYY-MM-DD

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(
    name: str = Form(...),
    email: EmailStr = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    specialization: str = Form(...),
    department_id: str = Form(None),
    status: str = Form(None),
    certificate_file: Optional[UploadFile] = File(None),
):
    """
    Register a new doctor. Uploads certificate file and creates a pending record.
    """
    try:
        # Save file if provided
        certificate_url = None
        if certificate_file:
            certificate_url = await doctor_service.save_certificate(certificate_file, email)
        
        # Prepare data
        doctor_data = DoctorCreate(
            name=name,
            email=email,
            phone=phone,
            password=password,
            specialization=specialization,
            department_id=department_id,
            certificate_url=certificate_url,
            status=status
        )
        
        # Register in DB
        doctor = await doctor_service.register_doctor(doctor_data, certificate_url)
        return doctor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.patch("/{doctor_id}/activate-subscription", response_model=DoctorResponse)
async def activate_doctor_subscription(doctor_id: UUID, body: SubscriptionActivate):
    """
    Activate a doctor's subscription and set status to approved.
    """
    try:
        async with db.pool.acquire() as conn:
            # 1. Verify doctor exists and approve them
            doctor_exists = await conn.fetchrow("SELECT id FROM doctors WHERE id = $1", doctor_id)
            if not doctor_exists:
                raise HTTPException(status_code=404, detail="Doctor not found")
                
            await conn.execute(
                "UPDATE doctors SET status = 'approved', updated_at = now() WHERE id = $1",
                doctor_id
            )
            
            # 2. Map frontend plan name to DB bundle name
            plan_name = body.subscription_plan
            name_mapping = {
                "Basic Access": "Basic Practitioner",
                "Trial Access": "Basic Practitioner", 
                "Clinical Pro": "Premium Clinical",
                "Pro AI Suite": "Pro AI Suite",
                "Enterprise AI": "Premium Clinical"
            }
            mapped_name = name_mapping.get(plan_name, plan_name)
            
            # 3. Find bundle
            bundle = await conn.fetchrow(
                "SELECT id FROM subscription_bundles WHERE name = $1 AND target_type = 'doctor'",
                mapped_name
            )
            
            if not bundle:
                # Fallback: get first doctor bundle in DB
                bundle = await conn.fetchrow(
                    "SELECT id FROM subscription_bundles WHERE target_type = 'doctor' ORDER BY price ASC LIMIT 1"
                )
                
            if not bundle:
                raise HTTPException(status_code=400, detail="No suitable subscription bundle found in database.")
                
            bundle_id = bundle["id"]
            
            # 4. Deactivate old active subscriptions for this doctor
            await conn.execute(
                "UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE doctor_id = $1 AND status = 'active'",
                doctor_id
            )
            
            # 5. Insert new subscription
            from datetime import datetime
            try:
                expiry_date = datetime.strptime(body.subscription_expiry, "%Y-%m-%d")
            except ValueError:
                try:
                    expiry_date = datetime.strptime(body.subscription_expiry, "%m/%d/%Y")
                except ValueError:
                    raise HTTPException(status_code=400, detail="Invalid date format for subscription_expiry. Expected YYYY-MM-DD or MM/DD/YYYY.")

            await conn.execute(
                """
                INSERT INTO subscriptions (doctor_id, bundle_id, end_date, status)
                VALUES ($1, $2, $3, 'active')
                """,
                doctor_id,
                bundle_id,
                expiry_date
            )
            
            # 6. Fetch doctor details matching DoctorResponse schema (which includes dyn plan info)
            query = """
            SELECT 
                d.*,
                COALESCE(
                    (SELECT b.name FROM subscriptions s JOIN subscription_bundles b ON s.bundle_id = b.id WHERE s.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1),
                    (SELECT b.name FROM subscription_doctors sd JOIN subscriptions s ON sd.subscription_id = s.id JOIN subscription_bundles b ON s.bundle_id = b.id WHERE sd.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1)
                ) as subscription_plan,
                COALESCE(
                    (SELECT s.end_date FROM subscriptions s WHERE s.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1),
                    (SELECT s.end_date FROM subscription_doctors sd JOIN subscriptions s ON sd.subscription_id = s.id WHERE sd.doctor_id = d.id AND s.status = 'active' AND s.end_date > now() LIMIT 1)
                ) as subscription_expiry
            FROM doctors d
            WHERE d.id = $1
            """
            row = await conn.fetchrow(query, doctor_id)
            if not row:
                raise HTTPException(status_code=404, detail="Doctor not found after update")
                
            item = dict(row)
            if item.get("subscription_expiry"):
                if hasattr(item["subscription_expiry"], "strftime"):
                    item["subscription_expiry"] = item["subscription_expiry"].strftime("%Y-%m-%d")
                else:
                    item["subscription_expiry"] = str(item["subscription_expiry"])
            return item
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


