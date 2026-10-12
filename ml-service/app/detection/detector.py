from abc import ABC, abstractmethod
import numpy as np
from typing import List, Dict, Any, Optional

class BaseFaceDetector(ABC):
    """
    Abstract interface for face detectors.
    Allows easy future swap to a YOLO face detector without modifying downstream logic.
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


class InsightFaceDetector(BaseFaceDetector):
    """
    Detector implementation using InsightFace's pretrained detection model.
    """
    def __init__(self, app):
        self.app = app

    def detect(self, img: np.ndarray) -> List[Any]:
        # InsightFace app.get performs detection and landmark extraction
        return self.app.get(img)

    def get_backend_name(self) -> str:
        return "InsightFace-RetinaFace"
