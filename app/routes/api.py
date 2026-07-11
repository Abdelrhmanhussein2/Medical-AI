from fastapi import APIRouter
from app.controllers.patient_controller import router as patient_router
from app.controllers.auth_controller import router as auth_router
from app.controllers.doctor_controller import router as doctor_router
from app.controllers.admin_controller import router as admin_router
from app.controllers.appointment_controller import router as appointment_router
from app.controllers.visit_controller import router as visit_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(patient_router)
api_router.include_router(auth_router)
api_router.include_router(doctor_router)
api_router.include_router(admin_router)
api_router.include_router(appointment_router)
api_router.include_router(visit_router)
