import json
import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from app.schemas.face import RecognitionResponse
from app.services.face_service import FaceService

router = APIRouter()

ML_SERVICE_SECRET = os.getenv("ML_SERVICE_SECRET", "internal_secret_token_face_rec")

@router.post("/internal/recognize", response_model=RecognitionResponse)
async def recognize_face(
    file: UploadFile = File(...),
    candidates: str = Form(default="[]"),
    similarity_threshold: float = Form(default=0.45),
    ambiguity_margin: float = Form(default=0.08),
    x_service_token: str = Header(default="internal_secret_token_face_rec")
):
    if x_service_token != ML_SERVICE_SECRET:
        raise HTTPException(status_code=403, detail="Unauthorized internal ML service request")
    
    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Empty image file received")
    
    if len(contents) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image size exceeds 15MB limit")

    try:
        parsed_candidates = json.loads(candidates)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON format for candidates form field")

    service = FaceService.get_instance()
    result = service.process_recognition(
        image_bytes=contents,
        candidates=parsed_candidates,
        similarity_threshold=similarity_threshold,
        ambiguity_margin=ambiguity_margin
    )
    return RecognitionResponse(**result)
