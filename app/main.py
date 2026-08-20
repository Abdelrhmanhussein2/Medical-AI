from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import db
from app.core.redis import redis_client
from contextlib import asynccontextmanager

from app.scheduler.whatsapp_scheduler import WhatsAppScheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to the database on startup
    await db.connect()
    await redis_client.connect()
    
    # Start WhatsApp background scheduler tasks
    scheduler = WhatsAppScheduler()
    scheduler.start()
    app.state.whatsapp_scheduler = scheduler
    
    yield
    
    # Stop WhatsApp background scheduler tasks
    if hasattr(app.state, "whatsapp_scheduler"):
        app.state.whatsapp_scheduler.stop()
        
    # Disconnect from the database on shutdown
    await db.disconnect()
    await redis_client.disconnect()

from app.routes.api import api_router

app = FastAPI(title="Medical Booking System API", lifespan=lifespan)

import os
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Depends, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from app.core.dependencies import get_current_user

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
    expose_headers=["X-Total-Count"],
)

os.makedirs("app/uploads/audio", exist_ok=True)
UPLOADS_BASE = Path("app/uploads").resolve()

@app.get("/uploads/{file_path:path}")
async def serve_upload(
    file_path: str,
    current_user: dict = Depends(get_current_user)
):
    full_path = (UPLOADS_BASE / file_path).resolve()
    if not str(full_path).startswith(str(UPLOADS_BASE)):
        raise HTTPException(403, "Access denied")
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(404, "File not found")
    return FileResponse(full_path)

app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Medical Booking System API"}
