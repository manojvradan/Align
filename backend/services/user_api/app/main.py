from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks, UploadFile, File
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from shared.core.database import engine, get_db
from shared.core import models
from . import crud, schemas, security, llm_service, email_service
from typing import List
from jose import JWTError
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import os
import base64
import requests as http_requests

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

# Run lightweight additive migrations for new columns on existing tables.
with engine.connect() as _conn:
    _conn.execute(
        __import__("sqlalchemy").text(
            "ALTER TABLE students ADD COLUMN IF NOT EXISTS resume_s3_url TEXT;"
        )
    )
    _conn.commit()

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


@app.post("/users/me/profile-picture", response_model=schemas.Student)
async def upload_profile_picture(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token),
):
    """Upload a profile picture. Stored as a base64 data URI."""
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, GIF, or WebP images are allowed.",
        )
    content = await file.read()
    MAX_SIZE = 5 * 1024 * 1024  # 5 MB
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size must not exceed 5 MB.",
        )
    b64 = base64.b64encode(content).decode("utf-8")
    data_uri = f"data:{file.content_type};base64,{b64}"
    current_user.profile_picture_url = data_uri
    db.commit()
    db.refresh(current_user)
    return current_user


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


@app.get("/users/me/skills/for-role")
def get_skills_for_role(
    role: str,
    current_user: models.Student = Depends(get_current_student_from_token),
):
    """
    Uses Gemini with Google Search Grounding to return the current market
    skills required for the given role. Results are cached for 24 hours.

    Query param:
        role (str): e.g. "Frontend Engineer Intern"

    Returns:
        {
            "skills": ["Python", "SQL", ...],
            "source": "Google Search (grounded by Gemini 1.5 Flash)",
            "grounding_urls": [{"title": "...", "url": "..."}, ...]
        }
    """
    if not role or not role.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query parameter 'role' is required.",
        )
    result = llm_service.get_skills_for_role(role.strip())
    if not result["skills"]:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not fetch skills from Gemini API. Check server logs for details (quota, model availability, or missing API key).",
        )
    return result


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

    # 3. Resolve full resume text — prefer DB, fall back to S3 fetch
    resume_text = student.resume_text or ""
    if not resume_text and getattr(student, "resume_s3_url", None):
        try:
            import boto3
            from urllib.parse import urlparse

            s3_url = student.resume_s3_url
            parsed = urlparse(s3_url)
            # URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
            bucket = parsed.netloc.split(".")[0]
            key = parsed.path.lstrip("/")

            s3 = boto3.client(
                "s3",
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
                region_name=os.getenv("AWS_REGION", "ap-southeast-2"),
            )
            obj = s3.get_object(Bucket=bucket, Key=key)
            raw_bytes = obj["Body"].read()

            content_type = obj.get("ContentType", "")
            if "pdf" in content_type or key.endswith(".pdf"):
                import io
                import pdfminer.high_level
                resume_text = pdfminer.high_level.extract_text(io.BytesIO(raw_bytes))
            else:
                import io
                import docx
                doc = docx.Document(io.BytesIO(raw_bytes))
                resume_text = "\n".join(p.text for p in doc.paragraphs)

            # Persist back to DB so next request is instant
            student.resume_text = resume_text
            db.commit()
            print(f"[CoverLetter] Fetched resume from S3 for student {student.id} ({len(resume_text)} chars)")
        except Exception as e:
            print(f"[CoverLetter] Could not fetch resume from S3: {e}")

    # 4. Call LLM service
    cover_letter_text = llm_service.generate_cover_letter(
        student_name=student.full_name or "Applicant",
        student_summary=student.summary or "",
        skills=skill_names,
        job_title=internship.title,
        company=internship.company or "the company",
        job_description=internship.description or "",
        resume_text=resume_text,
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


# --------------------------------------------------------------------------
# -------------------- Notification Endpoints (Protected) ------------------
# --------------------------------------------------------------------------

@app.get("/users/me/notification-preferences",
         response_model=schemas.NotificationPreference)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Return the notification preferences for the current user."""
    return crud.get_or_create_notification_preference(db, current_user.id)


@app.put("/users/me/notification-preferences",
         response_model=schemas.NotificationPreference)
def update_notification_preferences(
    prefs: schemas.NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Enable or disable in-app / email notifications."""
    return crud.update_notification_preference(db, current_user.id, prefs)


@app.get("/users/me/notifications",
         response_model=List[schemas.Notification])
def get_my_notifications(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Return all notifications for the current user (newest first)."""
    return crud.get_notifications(db, current_user.id)


@app.get("/users/me/notifications/unread-count", response_model=int)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Return the count of unread notifications."""
    return crud.get_unread_notification_count(db, current_user.id)


@app.post("/users/me/notifications/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Mark a single notification as read."""
    notif = crud.mark_notification_read(db, notification_id, current_user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "read"}


@app.post("/users/me/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Mark every notification for the current user as read."""
    crud.mark_all_notifications_read(db, current_user.id)
    return {"status": "all_read"}


@app.delete("/users/me/notifications/{notification_id}",
            status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """Delete a single notification."""
    notif = crud.delete_notification(db, notification_id, current_user.id)
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")


@app.post("/users/me/notifications/check",
          response_model=List[schemas.Notification])
def check_for_new_job_notifications(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.Student = Depends(get_current_student_from_token)
):
    """
    Queries the recommendation service for top matches, then creates
    in-app notifications (and optionally sends an email) for any
    newly posted jobs (last 14 days) not previously notified about.
    """
    pref = crud.get_or_create_notification_preference(db, current_user.id)
    if not pref.in_app_enabled:
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    rec_url = os.getenv("RECOMMENDATION_SERVICE_URL", "http://localhost:8002")

    new_notifications = []
    new_job_infos: list[dict] = []  # collected for the email

    try:
        response = http_requests.get(
            f"{rec_url}/recommendations/{current_user.id}",
            timeout=10
        )
        if response.status_code != 200:
            return []

        data = response.json()
        for item in data.get("recommendations", [])[:10]:
            internship_id = item.get("id")
            if not internship_id:
                continue

            # Only consider recently posted internships
            created_str = item.get("created_at", "")
            try:
                created_at = datetime.fromisoformat(
                    created_str.replace("Z", "+00:00")
                )
                if created_at < cutoff:
                    continue
            except Exception:
                pass  # if parsing fails, include the job anyway

            # Skip if already notified
            if crud.notification_exists_for_internship(
                    db, current_user.id, internship_id):
                continue

            company = item.get("company") or "Unknown Company"
            location = item.get("location") or ""
            title = item.get("title", "New Internship")

            notif = crud.create_notification(
                db,
                student_id=current_user.id,
                title=f"{title}",
                message=f"{company} \u2022 {location}",
                internship_id=internship_id,
            )
            new_notifications.append(notif)
            new_job_infos.append({
                "title": title,
                "company": company,
                "location": location,
                "url": item.get("url", ""),
            })

    except Exception as exc:
        print(f"[notifications/check] Error querying recommendation service: {exc}")
        return []

    # Fire email in the background if enabled and there are new matches
    if pref.email_enabled and new_job_infos:
        background_tasks.add_task(
            email_service.send_job_notification_email,
            current_user.email,
            (current_user.full_name or "Student").split()[0],
            new_job_infos,
        )

    return new_notifications