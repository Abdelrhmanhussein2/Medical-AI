from fastapi import FastAPI
from app.core.database import db
from app.core.redis import redis_client
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect to the database on startup
    await db.connect()
    await redis_client.connect()
    yield
    # Disconnect from the database on shutdown
    await db.disconnect()
    await redis_client.disconnect()

from app.routes.api import api_router

app = FastAPI(title="Medical Booking System API", lifespan=lifespan)

app.include_router(api_router)

@app.get("/")
def read_root():
    return {"message": "Welcome to Medical Booking System API"}
