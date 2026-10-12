import numpy as np
from typing import Optional, List, Tuple

def compute_cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Computes cosine similarity between two vectors safely.
    Handles zero-length vectors and normalizes them.
    similarity = dot(q, s) / (norm(q) * norm(s))
    """
    v1 = np.asarray(vec1, dtype=np.float32).flatten()
    v2 = np.asarray(vec2, dtype=np.float32).flatten()
    
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    sim = np.dot(v1, v2) / (norm1 * norm2)
    return float(np.clip(sim, -1.0, 1.0))

def match_query_against_candidates(
    query_embedding: np.ndarray,
    candidates: List[dict],
    similarity_threshold: float = 0.45,
    ambiguity_margin: float = 0.08
) -> dict:
    """
    Compares query embedding against enrolled candidates.
    Supports multiple enrollment embeddings per student (uses maximum similarity).
    Ranks candidates and evaluates against similarity threshold and ambiguity margin.
    """
    if not candidates:
        return {
            "status": "unknown",
            "candidate": None,
            "second_best": None,
            "similarity_score": 0.0,
            "threshold": similarity_threshold,
            "ambiguity_margin": ambiguity_margin,
            "message": "No enrolled candidates provided for matching.",
            "requires_review": True
        }

    scores = []
    for cand in candidates:
        student_id = cand.get("studentId")
        name = cand.get("name", "")
        embeddings = cand.get("embeddings", [])
        
        best_cand_score = -1.0
        for emb in embeddings:
            score = compute_cosine_similarity(query_embedding, emb)
            if score > best_cand_score:
                best_cand_score = score
        
        if best_cand_score >= 0.0:
            scores.append({
                "studentId": student_id,
                "name": name,
                "similarity": round(best_cand_score, 4)
            })

    # Sort descending by similarity
    scores.sort(key=lambda x: x["similarity"], reverse=True)

    if not scores:
        return {
            "status": "unknown",
            "candidate": None,
            "second_best": None,
            "similarity_score": 0.0,
            "threshold": similarity_threshold,
            "ambiguity_margin": ambiguity_margin,
            "message": "Unable to calculate similarity scores.",
            "requires_review": True
        }

    top_candidate = scores[0]
    second_candidate = scores[1] if len(scores) > 1 else None
    
    top_score = top_candidate["similarity"]
    second_score = second_candidate["similarity"] if second_candidate else 0.0

    # Decision logic
    if top_score < similarity_threshold:
        return {
            "status": "unknown",
            "candidate": top_candidate,
            "second_best": second_candidate,
            "similarity_score": top_score,
            "threshold": similarity_threshold,
            "ambiguity_margin": ambiguity_margin,
            "message": f"Face not recognized (score {top_score:.2f} below threshold {similarity_threshold:.2f}).",
            "requires_review": True
        }

    # Ambiguity check: if 2nd candidate is too close to 1st candidate
    if second_candidate and (top_score - second_score) < ambiguity_margin:
        return {
            "status": "ambiguous",
            "candidate": top_candidate,
            "second_best": second_candidate,
            "similarity_score": top_score,
            "threshold": similarity_threshold,
            "ambiguity_margin": ambiguity_margin,
            "message": f"Ambiguous match between {top_candidate['studentId']} ({top_score:.2f}) and {second_candidate['studentId']} ({second_score:.2f}). Margin {top_score - second_score:.2f} < {ambiguity_margin:.2f}.",
            "requires_review": True
        }

    # Clear candidate match
    return {
        "status": "candidate",
        "candidate": top_candidate,
        "second_best": second_candidate,
        "similarity_score": top_score,
        "threshold": similarity_threshold,
        "ambiguity_margin": ambiguity_margin,
        "message": f"Successfully identified student {top_candidate['name'] or top_candidate['studentId']} with similarity {top_score:.2f}.",
        "requires_review": False
    }
