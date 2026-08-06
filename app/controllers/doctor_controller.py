from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from app.schemes.doctor_schema import DoctorCreate, DoctorResponse
from app.services.doctor_service import doctor_service
from app.core.database import db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/doctors", tags=["Doctors"])

class SubscriptionActivate(BaseModel):
    subscription_plan: str
    subscription_expiry: str  # YYYY-MM-DD
    custom_minutes_limit: Optional[int] = None
    custom_tokens_limit: Optional[int] = None

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(
    name: str = Form(...),
    email: EmailStr = Form(...),
    phone: str = Form(...),
    password: Optional[str] = Form(None),
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
        import secrets
        actual_password = password if (password and password.strip()) else secrets.token_urlsafe(10)
        doctor_data = DoctorCreate(
            name=name,
            email=email,
            phone=phone,
            password=actual_password,
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
async def activate_doctor_subscription(
    doctor_id: UUID,
    body: SubscriptionActivate,
    current_user: dict = Depends(get_current_user)
):
    """
    Activate a doctor's subscription and set status to approved.
    """
    role = current_user.get("role")
    if role not in ("admin", "department"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="غير مصرح لك بتفعيل اشتراك الطبيب."
        )
    try:
        async with db.pool.acquire() as conn:
            # 1. Verify doctor exists and check if they belong to a department
            doctor = await conn.fetchrow(
                "SELECT id, department_id, is_active FROM doctors WHERE id = $1", 
                doctor_id
            )
            if not doctor:
                raise HTTPException(status_code=404, detail="Doctor not found")
            
            dept_id = doctor["department_id"]
            if role == "department" and (not dept_id or str(current_user["id"]) != str(dept_id)):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="غير مصرح لك بتفعيل اشتراك طبيب لا ينتمي لقسمك."
                )
            
            if dept_id:
                # Handle department-affiliated doctor
                # Fetch active department subscription
                dept_sub = await conn.fetchrow(
                    """
                    SELECT s.id, s.total_seats, s.allowed_minutes 
                    FROM subscriptions s
                    WHERE s.department_id = $1 AND s.status = 'active' AND s.end_date > now()
                    LIMIT 1
                    """,
                    dept_id
                )
                if not dept_sub:
                    raise HTTPException(
                        status_code=400,
                        detail="لا يوجد اشتراك نشط للمنظمة التابع لها هذا الطبيب. يرجى تجديد أو ترقية اشتراك المنظمة أولاً."
                    )
                
                sub_id = dept_sub["id"]
                total_seats = dept_sub["total_seats"]
                dept_allowed_minutes = dept_sub["allowed_minutes"]
                
                # Validate custom minutes limit
                if body.custom_minutes_limit is not None and body.custom_minutes_limit > dept_allowed_minutes:
                    raise HTTPException(
                        status_code=400,
                        detail=f"لا يمكنك تعيين حد دقائق للطبيب ({body.custom_minutes_limit}) أكبر من الحد المسموح به لباقة المنظمة ({dept_allowed_minutes} دقيقة)."
                    )
                
                # Check if doctor is already assigned to this subscription
                already_assigned = await conn.fetchval(
                    "SELECT EXISTS(SELECT 1 FROM subscription_doctors WHERE subscription_id = $1 AND doctor_id = $2)",
                    sub_id, doctor_id
                )
                if not already_assigned:
                    # Check seats limit
                    seats_used = await conn.fetchval(
                        "SELECT COUNT(*) FROM subscription_doctors WHERE subscription_id = $1",
                        sub_id
                    )
                    if total_seats is not None and seats_used >= total_seats:
                        raise HTTPException(
                            status_code=400,
                            detail=f"تم استهلاك جميع المقاعد المتاحة في اشتراك القسم ({total_seats} مقاعد). لا يمكنك تفعيل المزيد من الأطباء."
                        )
                    
                    # Clean up old seat assignments
                    await conn.execute("DELETE FROM subscription_doctors WHERE doctor_id = $1", doctor_id)
                    # Clean up any active independent subscriptions
                    await conn.execute(
                        "UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE doctor_id = $1 AND status = 'active'",
                        doctor_id
                    )
                    
                    # Insert into subscription_doctors
                    await conn.execute(
                        "INSERT INTO subscription_doctors (subscription_id, doctor_id) VALUES ($1, $2)",
                        sub_id, doctor_id
                    )
                
                # Update doctor status and limits
                await conn.execute(
                    """
                    UPDATE doctors 
                    SET status = 'approved',
                        is_active = true,
                        custom_minutes_limit = $2, 
                        custom_tokens_limit = $3, 
                        updated_at = now() 
                    WHERE id = $1
                    """,
                    doctor_id,
                    body.custom_minutes_limit,
                    body.custom_tokens_limit
                )
            else:
                # Handle independent doctor
                # Update doctor status and limits
                await conn.execute(
                    """
                    UPDATE doctors 
                    SET status = 'approved', 
                        custom_minutes_limit = $2, 
                        custom_tokens_limit = $3, 
                        updated_at = now() 
                    WHERE id = $1
                    """,
                    doctor_id,
                    body.custom_minutes_limit,
                    body.custom_tokens_limit
                )
                
                # Map frontend plan name to DB bundle name
                plan_name = body.subscription_plan
                name_mapping = {
                    "Basic Access": "Basic Practitioner",
                    "Trial Access": "Basic Practitioner", 
                    "Clinical Pro": "Premium Clinical",
                    "Pro AI Suite": "Pro AI Suite",
                    "Enterprise AI": "Premium Clinical"
                }
                mapped_name = name_mapping.get(plan_name, plan_name)
                
                # Find bundle
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
                
                # Prevent doctor from taking Free Trial more than once
                bundle_details = await conn.fetchrow("SELECT price, name, allowed_minutes, allowed_messages FROM subscription_bundles WHERE id = $1", bundle_id)
                if bundle_details and (bundle_details["price"] == 0 or bundle_details["name"] == "Free Trial"):
                    has_had_trial = await conn.fetchval(
                        """
                        SELECT EXISTS(
                            SELECT 1 
                            FROM subscriptions s
                            JOIN subscription_bundles b ON s.bundle_id = b.id
                            WHERE s.doctor_id = $1 AND (b.name = 'Free Trial' OR b.price = 0)
                        )
                        """,
                        doctor_id
                    )
                    if has_had_trial:
                        raise HTTPException(
                            status_code=400, 
                            detail="لقد قمت بالاشتراك في الفترة التجريبية المجانية بالفعل سابقاً. يمكنك الاختيار من بين باقات الدفع المتاحة."
                        )
    
                # Deactivate old active subscriptions for this doctor
                await conn.execute(
                    "UPDATE subscriptions SET status = 'cancelled', updated_at = now() WHERE doctor_id = $1 AND status = 'active'",
                    doctor_id
                )
                
                # Insert new subscription
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
                    INSERT INTO subscriptions (doctor_id, bundle_id, end_date, status, allowed_minutes, allowed_messages)
                    VALUES ($1, $2, $3, 'active', $4, $5)
                    """,
                    doctor_id,
                    bundle_id,
                    expiry_date,
                    bundle_details["allowed_minutes"] if bundle_details else None,
                    bundle_details["allowed_messages"] if bundle_details else None
                )
            
            # Fetch doctor details matching DoctorResponse schema (which includes dyn plan info)
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

class DoctorUpdate(BaseModel):
    name: str
    email: EmailStr
    specialization: str

@router.patch("/me", response_model=DoctorResponse)
async def update_my_profile(body: DoctorUpdate, current_user: dict = Depends(get_current_user)):
    """
    Update logged-in doctor's name, email, and specialization.
    """
    if body.email != current_user["email"]:
        raise HTTPException(
            status_code=400,
            detail="تغيير البريد الإلكتروني يجب أن يتم عبر تأكيد رمز التحقق (OTP) من خلال الإعدادات."
        )

    try:
        doctor_id = UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
        updated = await doctor_service.update_doctor(doctor_id, body.name, body.email, body.specialization)
        if not updated:
            raise HTTPException(status_code=404, detail="Doctor not found")
        return updated
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(current_user: dict = Depends(get_current_user)):
    """
    Delete logged-in doctor's profile and clear data.
    """
    try:
        doctor_id = UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
        await doctor_service.delete_doctor(doctor_id)
        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ──────────── OTP & Password Change Security Routes ────────────

class ForceChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@router.post("/me/change-password")
async def change_my_password(body: ForceChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """
    Force change password endpoint (used for first-time login welcome flow).
    """
    doctor_id = UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    async with db.pool.acquire() as conn:
        row = await conn.fetchrow("SELECT password_hash FROM doctors WHERE id = $1", doctor_id)
        if not row:
            raise HTTPException(status_code=404, detail="Doctor not found")
            
        from app.core.security import verify_password, get_password_hash
        if not verify_password(body.current_password, row["password_hash"]):
            raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة.")
            
        new_hash = get_password_hash(body.new_password)
        await conn.execute(
            "UPDATE doctors SET password_hash = $1, must_change_password = false, updated_at = now() WHERE id = $2",
            new_hash, doctor_id
        )
        
    return {"message": "تم تغيير كلمة المرور بنجاح."}

class OTPRequest(BaseModel):
    action: str  # 'change_password' | 'change_email'
    new_email: Optional[EmailStr] = None

@router.post("/me/request-otp")
async def request_otp_for_action(body: OTPRequest, current_user: dict = Depends(get_current_user)):
    from app.services.otp_service import otp_service
    from app.services.email_service import email_service
    from app.core.redis import redis_client
    
    otp = otp_service.generate_otp()
    email = current_user["email"]
    redis_key = f"otp:{body.action}:{email}"
    
    await redis_client.redis.set(redis_key, otp, ex=300) # 5 minutes expiry
    
    action_text = "تغيير كلمة المرور" if body.action == "change_password" else "تغيير البريد الإلكتروني"
    
    import asyncio
    asyncio.create_task(email_service.send_otp_email(email, otp, action_text))
    
    return {
        "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني."
    }

class VerifyOTPChangePasswordRequest(BaseModel):
    otp: str
    new_password: str

@router.post("/me/verify-otp-change-password")
async def verify_otp_change_password(body: VerifyOTPChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    from app.core.redis import redis_client
    from app.core.security import get_password_hash
    
    email = current_user["email"]
    redis_key = f"otp:change_password:{email}"
    
    stored_otp = await redis_client.redis.get(redis_key)
    if not stored_otp or stored_otp != body.otp:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح أو انتهت صلاحيته.")
        
    await redis_client.redis.delete(redis_key)
    
    doctor_id = UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    new_hash = get_password_hash(body.new_password)
    
    async with db.pool.acquire() as conn:
        await conn.execute("UPDATE doctors SET password_hash = $1, updated_at = now() WHERE id = $2", new_hash, doctor_id)
        
    return {"message": "تم تغيير كلمة المرور بنجاح."}

class VerifyOTPChangeEmailRequest(BaseModel):
    otp: str
    new_email: EmailStr

@router.post("/me/verify-otp-change-email")
async def verify_otp_change_email(body: VerifyOTPChangeEmailRequest, current_user: dict = Depends(get_current_user)):
    from app.core.redis import redis_client
    
    email = current_user["email"]
    redis_key = f"otp:change_email:{email}"
    
    stored_otp = await redis_client.redis.get(redis_key)
    if not stored_otp or stored_otp != body.otp:
        raise HTTPException(status_code=400, detail="رمز التحقق غير صحيح أو انتهت صلاحيته.")
        
    await redis_client.redis.delete(redis_key)
    
    doctor_id = UUID(current_user["id"]) if isinstance(current_user["id"], str) else current_user["id"]
    
    async with db.pool.acquire() as conn:
        taken = await conn.fetchrow("SELECT id FROM doctors WHERE email = $1 AND id != $2", body.new_email, doctor_id)
        if taken:
            raise HTTPException(status_code=400, detail="البريد الإلكتروني الجديد مستخدم بالفعل.")
            
        await conn.execute("UPDATE doctors SET email = $1, updated_at = now() WHERE id = $2", body.new_email, doctor_id)
        updated_doc = await conn.fetchrow("SELECT * FROM doctors WHERE id = $1", doctor_id)
        
    from app.services.auth_service import auth_service
    token_response = auth_service.create_token(dict(updated_doc), "doctor")
    
    return {
        "message": "تم تغيير البريد الإلكتروني بنجاح.",
        "access_token": token_response.access_token,
        "user": token_response.user
    }


