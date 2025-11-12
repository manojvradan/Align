from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from contextlib import asynccontextmanager
from typing import List

from shared.core.database import SessionLocal, engine, get_db
from shared.core import models
from . import crud, core, schemas  # Import new files

# This tells SQLAlchemy to create tables if they don't exist
# Good for dev, but use migrations (Alembic) for prod
models.Base.metadata.create_all(bind=engine)

# --- Global Recommender Instance ---
# This object will hold our trained TF-IDF model in memory.
recommender = core.TFIDFRecommender()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # This code runs on startup
    print("Application startup...")
    db = SessionLocal()
    try:
        # 1. Fetch all internships from the database
        all_internships = crud.get_all_internships(db)
        if not all_internships:
            print("WARNING: No internships found in the database to train on.")
        else:
            # 2. Fit the recommender model
            recommender.fit(all_internships)
    finally:
        db.close()

    yield

    # This code runs on shutdown (optional)
    print("Application shutdown...")


app = FastAPI(
    title="AI Internship Recommendation - Recommendation Service",
    description="Provides internship recommendations based on student profiles.",
    lifespan=lifespan # Use the new lifespan event handler
)


# --- Schemas ---
# Re-define a simple Internship schema here for the response model
class Internship(schemas.Internship):  # Inherit from your shared schema if possible
    pass


class RecommendationResponse(schemas.BaseModel):
    recommendations: List[Internship]


# --- API Endpoint ---
@app.get("/recommendations/{student_id}", response_model=RecommendationResponse)
def get_recommendations_for_student(
    student_id: int, 
    db: Session = Depends(get_db)
):

    """
    Generates personalized internship recommendations for a student.
    """
    # 1. Fetch the student's complete profile
    student_profile = crud.get_student_profile(db, student_id=student_id)
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student not found")

    try:
        # 2. Get recommendations from our in-memory model
        recommended_internships = recommender.recommend(student_profile, top_n=10)
        return {"recommendations": recommended_internships}
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=f"Service Unavailable: {e}")
