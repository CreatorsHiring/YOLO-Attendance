from fastapi import APIRouter
from app.schemas.face import HealthResponse
from app.services.face_service import FaceService

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    service = FaceService.get_instance()
    return HealthResponse(
        status="healthy" if service.is_ready else "initializing",
        model_loaded=service.is_ready,
        model_name=service.embedder.get_model_version() if service.embedder else "none",
        detector_backend=service.detector.get_backend_name() if service.detector else "none"
    )
