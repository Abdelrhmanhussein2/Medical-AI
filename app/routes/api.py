from fastapi import APIRouter
from app.controllers.patient_controller import router as patient_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(patient_router)
