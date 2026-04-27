import os
import time
import threading
from fastapi import FastAPI
from contextlib import asynccontextmanager
import traceback
from shared.core.database import SessionLocal, engine
from shared.core import models
from . import crud, core, schemas
from fastapi.middleware.cors import CORSMiddleware

# This tells SQLAlchemy to create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

# --- Global Recommender Instance ---
recommender = core.TFIDFRecommender()

# --- In-process recommendation cache ---
# Keyed by student_id. Avoids repeated DB hits when Dashboard, JobsPage,
# and notifications/check all fire concurrently on the same page load.
_rec_cache: dict[int, dict] = {}
_rec_cache_ts: dict[int, float] = {}
_REC_CACHE_TTL = 120  # seconds

# --- Per-student lock ---
# Prevents multiple simultaneous requests for the same student from each
# opening their own SSL connection. Concurrent requests queue behind the
# first, then all return from cache once the first completes.
_rec_locks: dict[int, threading.Lock] = {}
_rec_locks_meta = threading.Lock()
_rec_computing: set[int] = set()


def _get_student_lock(student_id: int) -> threading.Lock:
    with _rec_locks_meta:
        if student_id not in _rec_locks:
            _rec_locks[student_id] = threading.Lock()
        return _rec_locks[student_id]


def _run_computation(student_id: int):
    """Compute recommendations in a background thread and populate cache."""
    db = SessionLocal()
    try:
        student_profile = crud.get_student_profile(db, student_id=student_id)
        if not student_profile:
            print(f"[background] Student {student_id} not found, skipping.")
            return

        if recommender.internship_matrix is None:
            all_internships = crud.get_all_internships(db)
            if not all_internships:
                return
            recommender.fit(all_internships)

        results = recommender.recommend(student_profile, top_n=10)
        recommendations = []
        for internship, reason in results:
            item = schemas.RecommendedInternship.model_validate(internship)
            item.match_reason = reason
            recommendations.append(item)

        result = {"recommendations": recommendations, "computing": False}
        _rec_cache[student_id] = result
        _rec_cache_ts[student_id] = time.time()
        print(f"[background] Recommendations cached for student {student_id}")
    except Exception as e:
        print(f"[background] Error for student {student_id}: {e}")
        traceback.print_exc()
    finally:
        with _rec_locks_meta:
            _rec_computing.discard(student_id)
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application startup...")
    db = SessionLocal()
    try:
        all_internships = crud.get_all_internships(db)
        if not all_internships:
            print("WARNING: No internships found in the database to train on.")
        else:
            recommender.fit(all_internships)
    finally:
        db.close()
    yield
    print("Application shutdown...")

app = FastAPI(
    title="AI Internship Recommendation - Recommendation Service",
    description="Provides internship recommendations ",
    lifespan=lifespan
)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
]

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Status Endpoint ---
@app.get("/recommendations/{student_id}/status")
def get_recommendation_status(student_id: int):
    """
    Non-blocking check: returns whether recommendations are cached and fresh,
    and whether a background computation is currently running.
    """
    now = time.time()
    cached = (
        student_id in _rec_cache
        and (now - _rec_cache_ts.get(student_id, 0)) < _REC_CACHE_TTL
    )
    computing = student_id in _rec_computing
    return {"cached": cached, "computing": computing}


# --- API Endpoint ---
@app.get(
        "/recommendations/{student_id}",
        response_model=schemas.RecommendationResponse
        )
def get_recommendations_for_student(
    student_id: int,
):
    """
    Returns recommendations for a student.
    If the result is cached it returns immediately.
    If not, it starts a background thread to compute and returns
    {computing: true, recommendations: []} so the frontend can poll
    /status and re-fetch once the cache is populated.
    """
    now = time.time()

    # Fast path: already cached and fresh
    if student_id in _rec_cache:
        age = now - _rec_cache_ts.get(student_id, 0)
        if age < _REC_CACHE_TTL:
            print(f"[cache] Returning cached recommendations for student {student_id}")
            return _rec_cache[student_id]

    # Kick off background computation if not already running
    with _rec_locks_meta:
        if student_id not in _rec_computing:
            _rec_computing.add(student_id)
            t = threading.Thread(target=_run_computation, args=(student_id,), daemon=True)
            t.start()
            print(f"[background] Started computation for student {student_id}")

    # Return immediately — frontend will poll /status and re-fetch
    return {"recommendations": [], "computing": True}
