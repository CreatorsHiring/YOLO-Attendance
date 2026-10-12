import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from app.services.face_service import FaceService
from app.api.health import router as health_router
from app.api.enrollment import router as enrollment_router
from app.api.recognition import router as recognition_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly initialize models on startup
    print("Pre-loading InsightFace & ArcFace models...")
    FaceService.get_instance()
    print("ML models loaded and ready!")
    yield
    print("ML Service shutting down...")

app = FastAPI(
    title="AI Face Recognition ML Service",
    description="Internal FastAPI service for face detection, ArcFace embedding extraction, and cosine matching",
    version="1.0.0",
    lifespan=lifespan
)

# CORS setup - restricted to Express backend / local requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["Health"])
app.include_router(enrollment_router, tags=["Enrollment"])
app.include_router(recognition_router, tags=["Recognition"])
