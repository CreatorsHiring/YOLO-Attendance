import numpy as np
from typing import Optional, List

class ArcFaceEmbedder:
    """
    Handles feature embedding generation using ArcFace model representation from InsightFace.
    """
    def __init__(self, model_name: str = "buffalo_s-w600k_mbf", embedding_dim: int = 512):
        self.model_name = model_name
        self.embedding_dim = embedding_dim

    def extract_embedding(self, face_obj) -> Optional[List[float]]:
        """
        Extracts 512-D normalized embedding vector from a detected face.
        """
        if face_obj is None or not hasattr(face_obj, "embedding") or face_obj.embedding is None:
            return None
        
        emb = np.asarray(face_obj.embedding, dtype=np.float32)
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return [float(x) for x in emb.tolist()]

    def get_model_version(self) -> str:
        return self.model_name
