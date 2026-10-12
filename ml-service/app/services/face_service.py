import os
import cv2
import numpy as np
from typing import Optional, List, Dict, Any, Tuple
from insightface.app import FaceAnalysis

from app.detection.detector import InsightFaceDetector, BaseFaceDetector
from app.detection.preprocessing import decode_image_bytes, validate_image_resolution
from app.recognition.embedder import ArcFaceEmbedder
from app.recognition.matcher import match_query_against_candidates
from app.schemas.face import BoundingBox

class FaceService:
    """
    Core Face Processing Service.
    Loads InsightFace models once at startup and performs validation, detection,
    ArcFace embedding extraction, and cosine matching.
    """
    _instance: Optional["FaceService"] = None

    def __init__(self, model_name: str = "buffalo_s", det_size: Tuple[int, int] = (640, 640)):
        self.model_name = model_name
        self.det_size = det_size
        self.app = None
        self.detector: Optional[BaseFaceDetector] = None
        self.embedder: Optional[ArcFaceEmbedder] = None
        self.is_ready = False

    def initialize(self):
        if self.is_ready:
            return
        # Initialize InsightFace with CPUExecutionProvider for landmarks & ArcFace
        self.app = FaceAnalysis(name=self.model_name, providers=["CPUExecutionProvider"])
        self.app.prepare(ctx_id=-1, det_size=self.det_size)
        
        # Initialize YOLO Face Detector with fallback to InsightFaceDetector
        yolo_weights = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "yolov8n-face.pt")
        if not os.path.exists(yolo_weights):
            yolo_weights = "yolov8n-face.pt"

        if os.path.exists(yolo_weights):
            from app.detection.detector import YOLOFaceDetector
            self.detector = YOLOFaceDetector(weights_path=yolo_weights, insight_app=self.app)
            print(f"Detector initialized: {self.detector.get_backend_name()}")
        else:
            self.detector = InsightFaceDetector(self.app)
            print(f"Detector initialized: {self.detector.get_backend_name()}")

        self.embedder = ArcFaceEmbedder(model_name=f"{self.model_name}-arcface-512")
        self.is_ready = True

    @classmethod
    def get_instance(cls) -> "FaceService":
        if cls._instance is None:
            cls._instance = FaceService()
            cls._instance.initialize()
        return cls._instance

    def process_enrollment(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Validates that exactly 1 usable face is present and extracts its embedding.
        """
        img = decode_image_bytes(image_bytes)
        if img is None:
            return {
                "success": False,
                "face_count": 0,
                "embedding": None,
                "embedding_dimension": None,
                "model_version": self.embedder.get_model_version(),
                "box": None,
                "message": "Invalid or corrupt image data."
            }

        if not validate_image_resolution(img):
            return {
                "success": False,
                "face_count": 0,
                "embedding": None,
                "embedding_dimension": None,
                "model_version": self.embedder.get_model_version(),
                "box": None,
                "message": "Image resolution too low for enrollment."
            }

        faces = self.detector.detect(img)
        face_count = len(faces)

        if face_count == 0:
            return {
                "success": False,
                "face_count": 0,
                "embedding": None,
                "embedding_dimension": None,
                "model_version": self.embedder.get_model_version(),
                "box": None,
                "message": "No face detected in the image. Please position your face clearly in good lighting."
            }

        if face_count > 1:
            return {
                "success": False,
                "face_count": face_count,
                "embedding": None,
                "embedding_dimension": None,
                "model_version": self.embedder.get_model_version(),
                "box": None,
                "message": f"Multiple faces detected ({face_count}). Only one person must be present for enrollment."
            }

        face = faces[0]
        # Check detection confidence
        score = float(face.det_score) if hasattr(face, "det_score") else 1.0
        if score < 0.60:
            return {
                "success": False,
                "face_count": 1,
                "embedding": None,
                "embedding_dimension": None,
                "model_version": self.embedder.get_model_version(),
                "box": None,
                "message": f"Face detection confidence is too low ({score:.2f}). Please face the camera directly."
            }

        embedding = self.embedder.extract_embedding(face)
        if not embedding:
            return {
                "success": False,
                "face_count": 1,
                "embedding": None,
                "embedding_dimension": None,
                "model_version": self.embedder.get_model_version(),
                "box": None,
                "message": "Failed to generate ArcFace feature embedding."
            }

        bbox = None
        if hasattr(face, "bbox"):
            b = face.bbox.astype(float).tolist()
            bbox = BoundingBox(x1=b[0], y1=b[1], x2=b[2], y2=b[3], confidence=round(score, 3))

        return {
            "success": True,
            "face_count": 1,
            "embedding": embedding,
            "embedding_dimension": len(embedding),
            "model_version": self.embedder.get_model_version(),
            "box": bbox,
            "message": "Face validated and ArcFace embedding extracted successfully."
        }

    def process_recognition(
        self,
        image_bytes: bytes,
        candidates: List[dict],
        similarity_threshold: float = 0.45,
        ambiguity_margin: float = 0.08
    ) -> Dict[str, Any]:
        """
        Generates query embedding and performs matching against candidate records.
        """
        img = decode_image_bytes(image_bytes)
        if img is None:
            return {
                "status": "invalid_face",
                "candidate": None,
                "second_best": None,
                "similarity_score": None,
                "threshold": similarity_threshold,
                "ambiguity_margin": ambiguity_margin,
                "model_version": self.embedder.get_model_version(),
                "face_count": 0,
                "message": "Invalid or corrupt image data.",
                "requires_review": True,
                "embedding": None
            }

        faces = self.detector.detect(img)
        face_count = len(faces)

        if face_count == 0:
            return {
                "status": "invalid_face",
                "candidate": None,
                "second_best": None,
                "similarity_score": None,
                "threshold": similarity_threshold,
                "ambiguity_margin": ambiguity_margin,
                "model_version": self.embedder.get_model_version(),
                "face_count": 0,
                "message": "No face detected in scan. Ensure adequate lighting and face camera.",
                "requires_review": True,
                "embedding": None
            }

        if face_count > 1:
            return {
                "status": "invalid_face",
                "candidate": None,
                "second_best": None,
                "similarity_score": None,
                "threshold": similarity_threshold,
                "ambiguity_margin": ambiguity_margin,
                "model_version": self.embedder.get_model_version(),
                "face_count": face_count,
                "message": f"Multiple faces detected ({face_count}). Only one student should scan at a time.",
                "requires_review": True,
                "embedding": None
            }

        face = faces[0]
        query_embedding = self.embedder.extract_embedding(face)
        if not query_embedding:
            return {
                "status": "invalid_face",
                "candidate": None,
                "second_best": None,
                "similarity_score": None,
                "threshold": similarity_threshold,
                "ambiguity_margin": ambiguity_margin,
                "model_version": self.embedder.get_model_version(),
                "face_count": 1,
                "message": "Failed to extract embedding from detected face.",
                "requires_review": True,
                "embedding": None
            }

        match_res = match_query_against_candidates(
            query_embedding=np.array(query_embedding, dtype=np.float32),
            candidates=candidates,
            similarity_threshold=similarity_threshold,
            ambiguity_margin=ambiguity_margin
        )

        match_res["model_version"] = self.embedder.get_model_version()
        match_res["face_count"] = 1
        match_res["embedding"] = query_embedding
        return match_res
