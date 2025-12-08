from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from typing import List
import traceback
from shared.core.database import SessionLocal, engine, get_db
from shared.core import models
from . import crud, core, schemas
from fastapi.middleware.cors import CORSMiddleware  # Import new files

# This tells SQLAlchemy to create tables if they don't exist
# Good for dev, but use migrations (Alembic) for prod
models.Base.metadata.create_all(bind=engine)

# --- Global Recommender Instance ---
# This object will hold our trained TF-IDF model in memory.
recommender = core.TFIDFRecommender()


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Specifies the allowed origins
    allow_credentials=True,      # Allows cookies to be included in requests
    allow_methods=["*"],         # Allows all methods (GET, POST, etc.)
    allow_headers=["*"],         # Allows all headers
)

# --- Schemas ---
# Re-define a simple Internship schema here for the response model
class Internship(schemas.Internship):  # Inherit from your shared schema
    pass


class RecommendationResponse(schemas.BaseModel):
    recommendations: List[Internship]


# --- API Endpoint ---
@app.get(
        "/recommendations/{student_id}",
        response_model=RecommendationResponse
        )
def get_recommendations_for_student(
    student_id: int,
    db: Session = Depends(get_db)
):

    """
    Generates personalized internship recommendations for a student.
    """
    print(f"Request received for student ID: {student_id}")
    # 1. Fetch the student's complete profile
    student_profile = crud.get_student_profile(db, student_id=student_id)
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        print(f"Generating recommendations for: {student_profile.email}")
        # 2. Get recommendations from our in-memory model
        recommended_internships = recommender.recommend(
            student_profile, top_n=10
            )
        return {"recommendations": recommended_internships}
    except HTTPException:
        raise  # Re-raise HTTP exceptions (like 404)
    except Exception as e:
        # --- THIS IS THE FIX ---
        # This prints the full error to your terminal
        print("CRITICAL ERROR IN RECOMMENDATION ENDPOINT:")
        traceback.print_exc()
        # -----------------------
        raise HTTPException(status_code=500, detail=str(e))
