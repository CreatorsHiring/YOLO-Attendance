from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_name: str
    detector_backend: str

class BoundingBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float

class FaceValidationResult(BaseModel):
    face_count: int
    is_valid: bool
    message: str
    box: Optional[BoundingBox] = None

class EnrollmentResponse(BaseModel):
    success: bool
    face_count: int
    embedding: Optional[List[float]] = None
    embedding_dimension: Optional[int] = None
    model_version: str
    box: Optional[BoundingBox] = None
    message: str

class StoredCandidate(BaseModel):
    studentId: str
    name: Optional[str] = None
    embeddings: List[List[float]]

class RecognitionRequest(BaseModel):
    candidates: List[StoredCandidate] = Field(default_factory=list)
    similarity_threshold: Optional[float] = None
    ambiguity_margin: Optional[float] = None

class CandidateMatch(BaseModel):
    studentId: str
    name: Optional[str] = None
    similarity: float

class RecognitionResponse(BaseModel):
    status: str  # "candidate", "unknown", "ambiguous", "invalid_face"
    candidate: Optional[CandidateMatch] = None
    second_best: Optional[CandidateMatch] = None
    similarity_score: Optional[float] = None
    threshold: float
    ambiguity_margin: float
    model_version: str
    face_count: int
    message: str
    requires_review: bool
    embedding: Optional[List[float]] = None
