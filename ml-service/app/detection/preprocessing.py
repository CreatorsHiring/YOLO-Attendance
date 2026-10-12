import cv2
import numpy as np
from typing import Tuple, Optional

def decode_image_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
    """
    Decodes raw image bytes into an OpenCV BGR numpy array safely.
    Validates dimensions and channels.
    """
    if not image_bytes:
        return None
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def validate_image_resolution(img: np.ndarray, min_width: int = 100, min_height: int = 100) -> bool:
    """
    Validates minimum resolution for reliable face detection.
    """
    if img is None:
        return False
    h, w = img.shape[:2]
    return h >= min_height and w >= min_width
