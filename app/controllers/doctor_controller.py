from fastapi import APIRouter, HTTPException, UploadFile, File, Form, status
from pydantic import EmailStr
from app.schemes.doctor_schema import DoctorCreate, DoctorResponse
from app.services.doctor_service import doctor_service

router = APIRouter(prefix="/doctors", tags=["Doctors"])

@router.post("/register", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def register_doctor(
    name: str = Form(...),
    email: EmailStr = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    certificate_file: UploadFile = File(...),
):
    """
    Register a new doctor. Uploads certificate file and creates a pending record.
    """
    try:
        # Save file
        certificate_url = await doctor_service.save_certificate(certificate_file, email)
        
        # Prepare data
        doctor_data = DoctorCreate(
            name=name,
            email=email,
            phone=phone,
            password=password,
            certificate_url=certificate_url
        )
        
        # Register in DB
        doctor = await doctor_service.register_doctor(doctor_data, certificate_url)
        return doctor
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
