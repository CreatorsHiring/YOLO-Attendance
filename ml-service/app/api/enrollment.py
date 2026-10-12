from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from app.schemas.face import EnrollmentResponse
from app.services.face_service import FaceService
import os

router = APIRouter()

ML_SERVICE_SECRET = os.getenv("ML_SERVICE_SECRET", "internal_secret_token_face_rec")

@router.post("/internal/enroll", response_model=EnrollmentResponse)
async def enroll_face(
    file: UploadFile = File(...),
    x_service_token: str = Header(default="internal_secret_token_face_rec")
):
    if x_service_token != ML_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized internal ML service request")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image file received")
    
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image size exceeds 15MB limit")

    service = FaceService.get_instance()
    result = service.process_enrollment(contents)
    return EnrollmentResponse(**result)
