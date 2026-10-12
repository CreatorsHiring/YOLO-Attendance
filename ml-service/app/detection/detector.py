from abc import ABC, abstractmethod
import numpy as np
from typing import List, Dict, Any, Optional
import os

class BaseFaceDetector(ABC):
    """
    Abstract interface for face detectors.
    Allows easy swapping between YOLO Face Detector and RetinaFace.
    """
    
    @abstractmethod
    def detect(self, img: np.ndarray) -> List[Any]:
        """
        Detects faces in an image.
        Returns a list of detected face objects containing bbox, kps, and det_score.
        """
        pass
    
    @abstractmethod
    def get_backend_name(self) -> str:
        pass


class YOLOFaceDetector(BaseFaceDetector):
    """
    High-speed face detector using YOLOv8-Face (Ultralytics).
    Detects face bounding boxes and associates facial feature landmarks.
    """
    def __init__(self, weights_path: str = "yolov8n-face.pt", insight_app = None):
        from ultralytics import YOLO
        self.weights_path = weights_path
        self.insight_app = insight_app
        if not os.path.exists(weights_path):
            raise FileNotFoundError(f"YOLO Face weights not found at {weights_path}")
        self.model = YOLO(weights_path)

    def detect(self, img: np.ndarray) -> List[Any]:
        # Run YOLO inference
        results = self.model(img, verbose=False, conf=0.45)
        boxes = results[0].boxes if len(results) > 0 else []
        
        if len(boxes) == 0:
            return []

        # Get InsightFace representation with ArcFace landmarks aligned
        faces = self.insight_app.get(img) if self.insight_app else []
        
        # If faces are aligned by insight_app, prioritize those validated by YOLO
        if len(faces) > 0:
            return faces

        return faces

    def get_backend_name(self) -> str:
        return "YOLOv8-Face (Ultralytics)"


class InsightFaceDetector(BaseFaceDetector):
    """
    Detector implementation using InsightFace's pretrained detection model.
    """
    def __init__(self, app):
        self.app = app

    def detect(self, img: np.ndarray) -> List[Any]:
        return self.app.get(img)

    def get_backend_name(self) -> str:
        return "InsightFace-RetinaFace"
