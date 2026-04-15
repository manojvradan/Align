from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from shared.core.database import engine, get_db
from shared.core import models
from . import crud, schemas, security, llm_service
from typing import List
from jose import JWTError
from dotenv import load_dotenv
import os

# Now you can import from the shared directory
load_dotenv()

if not os.getenv("OPENAI_API_KEY"):
    print("CRITICAL WARNING: OPENAI_API_KEY is missing!")
else:
    print("OPENAI_API_KEY loaded successfully.")

# This command tells SQLAlchemy to
# create all the tables defined in your models.
# It checks if the tables exist first, so it's safe to run on every startup.
# For production, you would use a migration tool like Alembic.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Internship Recommendation - User API",
    description="Handles user profiles, authentication, and interactions."
)

origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8001",
    "http://127.0.0.1:8002",
]

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Setup ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def get_mock_current_student(db: Session = Depends(get_db)) -> models.Student:
    """
    Returns a hardcoded student for development purposes.
    Creates the student if they don't exist in the database.
    """
    # These claims simulate what would come from a real Cognito token.
    # You can change the email to test with different mock users.
    mock_claims = {
        "email": "dev-test-user@example.com",
        "sub": "mock-cognito-sub-12345",  # This is the unique ID from Cognito
        "given_name": "Dev",
        "family_name": "User",
    }
    user = crud.get_or_create_student(db, mock_claims)
    if user is None:
        raise HTTPException(
            status_code=500,
            detail="Could not create mock user in the database.",
        )
    return user


def get_current_student_from_token(
    claims: dict = Depends(security.get_current_user_claims),
    db: Session = Depends(get_db)
) -> models.Student:
    """
    Validates token, then gets or creates the user in our database.
    This is the central dependency for all protected routes.
    """
    user = crud.get_or_create_student(db, claims)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not identify user from token claims",
        )
    return user


# --- Dependency to get current user ---
def get_current_user(
        token: str = Depends(oauth2_scheme),
        db: Session = Depends(get_db)
        ):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # This is where you would decode the JWT
        # For simplicity, we are skipping the actual decoding logic here
        # In a real app, you would use: payload = jwt.decode(
        # token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        # And then get the user from the payload.
        # This is a placeholder for demonstration purposes.
        email = "test@example.com"  # Placeholder
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = crud.get_student_by_email(db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user


# --------------------------------------------------------------------------
# --------------------------------------------------------------------------
# -------------------- Profile Endpoints (Protected) -----------------------
# --------------------------------------------------------------------------
# --------------------------------------------------------------------------


@app.get("/users/me/", response_model=schemas.Student)
def read_users_me(
        current_user: models.Student = Depends(get_current_student_from_token)
        ):
    """
    Get the profile of the currently logged-in user.
    """
    return current_user


@app.put("/users/me/", response_model=schemas.Student)
def update_current_user_profile(
    student_update: schemas.StudentUpdate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    print("DEBUG - DATA RECEIVED:", student_update.model_dump(exclude_unset=True))

    """
    Update basic profile info for the current user (name, university, etc.).
    """
    return crud.update_student(
        db=db,
        student_id=current_user.id,
        student_update=student_update
        )


@app.post("/users/me/skills/", response_model=schemas.Student)
def add_skill_for_current_user(
    skills: List[schemas.SkillCreate],
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """
    Add a list of skills to the current user's profile.
    This is the endpoint your resume-parser will call.
    """
    for skill in skills:
        crud.add_skill_to_student(
            db=db,
            student_id=current_user.id,
            skill=skill
            )
    return crud.get_student(db, student_id=current_user.id)


@app.post(
        "/users/me/courses/",
        response_model=schemas.Course,
        status_code=status.HTTP_201_CREATED
        )
def add_course_for_current_user(
    course: schemas.CourseCreate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Add a new course to the current user's profile."""
    return crud.add_course_to_student(
        db=db,
        student_id=current_user.id,
        course=course
        )


@app.post("/users/me/interests/", response_model=schemas.Student)
def add_interest_for_current_user(
    interest: schemas.SkillCreate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Add a new area of interest for the current user."""
    return crud.add_interest_to_student(
        db=db,
        student_id=current_user.id,
        interest=interest
        )


# --- Endpoint for Tracking Internship Interactions ---

@app.post(
        "/users/me/applications/",
        response_model=schemas.InternshipApplication
        )
def track_internship_application(
    application: schemas.InternshipApplicationCreate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """
    Log or update the status of an internship application for the current user.
    This is the key to creating the "temporal feedback loop".
    """
    return crud.log_or_update_application(
        db=db,
        student_id=current_user.id,
        application=application
        )


# --- READ (all) ---
@app.get("/students/", response_model=List[schemas.Student])
def read_all_students(skip: int = 0, limit: int = 100,
                      db: Session = Depends(get_db)):
    students = crud.get_students(db, skip=skip, limit=limit)
    return students


# --- READ (one) ---
@app.get("/students/{student_id}", response_model=schemas.Student)
def read_one_student(student_id: int, db: Session = Depends(get_db)):
    db_student = crud.get_student(db, student_id=student_id)
    if db_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return db_student


# --- UPDATE ---
@app.put("/students/{student_id}", response_model=schemas.Student)
def update_existing_student(student_id: int,
                            student_update: schemas.StudentUpdate,
                            db: Session = Depends(get_db)):
    updated_student = crud.update_student(db, student_id, student_update)
    if updated_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return updated_student


# --- DELETE ---
@app.delete("/students/{student_id}", response_model=schemas.Student)
def delete_existing_student(student_id: int, db: Session = Depends(get_db)):
    deleted_student = crud.delete_student(db, student_id)
    if deleted_student is None:
        raise HTTPException(status_code=404, detail="Student not found")
    return deleted_student


@app.get("/jobs/", response_model=List[schemas.Internship])
def read_jobs(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Fetches a list of scraped internships from the database.
    This endpoint is public and does not require authentication.
    """
    internships = crud.get_internships(db, skip=skip, limit=limit)
    return internships


# --- NEW DEDICATED ENDPOINT FOR LLM ENRICHMENT ---
@app.post("/users/me/enrich", response_model=schemas.Student)
def enrich_current_user_profile(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """
    Analyzes the current user's profile using an LLM to infer new skills
    and generate a professional summary.
    """
    updated_student = crud.enrich_student_profile(
        db=db,
        student_id=current_user.id
        )
    if not updated_student:
        raise HTTPException(status_code=404, detail="Student not found")
    return updated_student


@app.get("/users/me/saved-jobs/ids", response_model=List[int])
def get_my_saved_job_ids(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Returns just the IDs of saved jobs (for the frontend to highlight icons)."""
    return crud.get_saved_job_ids(db, student_id=current_user.id)


@app.post("/users/me/saved-jobs/{internship_id}")
def toggle_saved_job(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Toggles the saved status of a specific job."""
    is_saved = crud.toggle_save_job(db, student_id=current_user.id, internship_id=internship_id)
    return {"status": "saved" if is_saved else "unsaved", "internship_id": internship_id}


@app.get("/users/me/applied-jobs/ids", response_model=List[int])
def get_my_applied_job_ids(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    return crud.get_applied_job_ids(db, student_id=current_user.id)


@app.post("/users/me/applied-jobs/{internship_id}")
def mark_job_applied(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    crud.mark_job_as_applied(db, student_id=current_user.id, internship_id=internship_id)
    return {"status": "marked_applied", "internship_id": internship_id}


@app.get("/users/me/saved-jobs", response_model=List[schemas.Internship])
def get_my_saved_jobs_list(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Fetches full details of all jobs the user has saved."""
    return crud.get_saved_jobs(db, student_id=current_user.id)

@app.get("/users/me/applied-jobs", response_model=List[schemas.Internship])
def get_my_applied_jobs_list(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """
    Fetches full details (Title, Company, Desc, etc.) of all jobs 
    the user has marked as applied.
    """
    return crud.get_applied_jobs(db, student_id=current_user.id)


@app.post(
    "/users/me/cover-letter/{internship_id}",
    response_model=schemas.CoverLetterResponse
)
def generate_cover_letter_for_job(
    internship_id: int,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """
    Generates a tailored cover letter for the given internship
    using the current user's profile and the job description.
    """
    # 1. Get the internship details
    internship = db.query(models.Internship).filter(
        models.Internship.id == internship_id
    ).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    # 2. Load full student profile
    student = crud.get_student(db, student_id=current_user.id)
    skill_names = [s.name for s in student.skills] if student.skills else []

    # 3. Call LLM service
    cover_letter_text = llm_service.generate_cover_letter(
        student_name=student.full_name or "Applicant",
        student_summary=student.summary or "",
        skills=skill_names,
        job_title=internship.title,
        company=internship.company or "the company",
        job_description=internship.description or "",
        resume_text=student.resume_text or ""
    )

    if not cover_letter_text:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate cover letter. Please try again."
        )

    return schemas.CoverLetterResponse(
        cover_letter=cover_letter_text,
        job_title=internship.title,
        company=internship.company or ""
    )