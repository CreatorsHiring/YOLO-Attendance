import numpy as np
from app.recognition.matcher import compute_cosine_similarity, match_query_against_candidates
from app.detection.preprocessing import validate_image_resolution, decode_image_bytes

def test_cosine_similarity_identical():
    vec = np.random.randn(512).astype(np.float32)
    vec = vec / np.linalg.norm(vec)
    sim = compute_cosine_similarity(vec, vec)
    assert abs(sim - 1.0) < 1e-4

def test_cosine_similarity_orthogonal():
    vec1 = np.zeros(512, dtype=np.float32)
    vec2 = np.zeros(512, dtype=np.float32)
    vec1[0] = 1.0
    vec2[1] = 1.0
    sim = compute_cosine_similarity(vec1, vec2)
    assert abs(sim - 0.0) < 1e-4

def test_cosine_similarity_zero_vector():
    vec1 = np.zeros(512, dtype=np.float32)
    vec2 = np.ones(512, dtype=np.float32)
    sim = compute_cosine_similarity(vec1, vec2)
    assert sim == 0.0

def test_match_against_candidates_clear_winner():
    target = np.random.randn(512).astype(np.float32)
    target = (target / np.linalg.norm(target)).tolist()

    imposter = np.random.randn(512).astype(np.float32)
    imposter = (imposter / np.linalg.norm(imposter)).tolist()

    candidates = [
        {"studentId": "STU001", "name": "Alice", "embeddings": [target]},
        {"studentId": "STU002", "name": "Bob", "embeddings": [imposter]}
    ]

    res = match_query_against_candidates(
        query_embedding=np.array(target),
        candidates=candidates,
        similarity_threshold=0.45,
        ambiguity_margin=0.08
    )

    assert res["status"] == "candidate"
    assert res["candidate"]["studentId"] == "STU001"
    assert res["candidate"]["similarity"] >= 0.99
    assert res["requires_review"] is False

def test_match_against_candidates_unknown():
    query = np.random.randn(512).astype(np.float32)
    query = (query / np.linalg.norm(query)).tolist()

    # orthogonal vectors
    ortho = np.zeros(512, dtype=np.float32).tolist()

    candidates = [
        {"studentId": "STU001", "name": "Alice", "embeddings": [ortho]}
    ]

    res = match_query_against_candidates(
        query_embedding=np.array(query),
        candidates=candidates,
        similarity_threshold=0.45,
        ambiguity_margin=0.08
    )

    assert res["status"] == "unknown"
    assert res["requires_review"] is True

def test_match_against_candidates_ambiguous():
    base = np.random.randn(512).astype(np.float32)
    base = base / np.linalg.norm(base)

    cand1 = (base + np.random.randn(512) * 0.01).astype(np.float32)
    cand1 = (cand1 / np.linalg.norm(cand1)).tolist()

    cand2 = (base + np.random.randn(512) * 0.01).astype(np.float32)
    cand2 = (cand2 / np.linalg.norm(cand2)).tolist()

    candidates = [
        {"studentId": "STU001", "name": "Alice", "embeddings": [cand1]},
        {"studentId": "STU002", "name": "Bob", "embeddings": [cand2]}
    ]

    res = match_query_against_candidates(
        query_embedding=base,
        candidates=candidates,
        similarity_threshold=0.45,
        ambiguity_margin=0.08
    )

    assert res["status"] == "ambiguous"
    assert res["requires_review"] is True

def test_image_validation():
    assert validate_image_resolution(None) is False
    small = np.zeros((50, 50, 3), dtype=np.uint8)
    assert validate_image_resolution(small, min_width=100, min_height=100) is False
    valid = np.zeros((150, 150, 3), dtype=np.uint8)
    assert validate_image_resolution(valid, min_width=100, min_height=100) is True

if __name__ == "__main__":
    test_cosine_similarity_identical()
    test_cosine_similarity_orthogonal()
    test_cosine_similarity_zero_vector()
    test_match_against_candidates_clear_winner()
    test_match_against_candidates_unknown()
    test_match_against_candidates_ambiguous()
    test_image_validation()
    print("All ML unit tests passed successfully!")
