# services/user-api/app/crud.py
from shared.core import models
from . import schemas, llm_service
from sqlalchemy.orm import Session, joinedload
import sys
# Add project root to path to allow importing shared modules
sys.path.append('../../../')


def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(
        models.Student.id == student_id).options(
        joinedload(models.Student.skills),
        joinedload(models.Student.projects)
    ).first()


def get_student_by_email(db: Session, email: str):
    return db.query(models.Student).filter(
        models.Student.email == email).first()


def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()


def get_or_create_student(db: Session, claims: dict):
    """
    Finds a student by email from JWT claims,
    or creates them if they don't exist.
    """
    email = claims.get("email")
    if not email:
        return None

    student = db.query(
        models.Student
        ).filter(models.Student.email == email).first()

    if not student:
        # User exists in Cognito but not our DB, so create them here
        student = models.Student(
            email=email,
            full_name=claims.get("custom:full_name")
        )
        db.add(student)
        db.commit()
        db.refresh(student)

    return student


def update_student(db: Session, student_id: int,
                   student_update: schemas.StudentUpdate):
    db_student = get_student(db, student_id)
    if not db_student:
        return None

    # Update model instance with new data
    update_data = student_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_student, key, value)

    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


def delete_student(db: Session, student_id: int):
    db_student = get_student(db, student_id)
    if not db_student:
        return None
    db.delete(db_student)
    db.commit()
    return db_student


def get_or_create_skill(db: Session, skill: schemas.SkillCreate):
    """Finds a skill by name or creates it if it doesn't exist."""
    db_skill = db.query(
        models.Skill
        ).filter(models.Skill.name == skill.name.lower()).first()
    if db_skill:
        return db_skill
    db_skill = models.Skill(name=skill.name.lower())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def add_skill_to_student(
        db: Session,
        student_id: int,
        skill: schemas.SkillCreate
        ):
    db_student = get_student(db, student_id)
    if not db_student:
        return None

    db_skill = get_or_create_skill(db, skill)

    # Check if the student already has this skill
    for s in db_student.skills:
        if s.id == db_skill.id:
            return db_student  # Already has the skill

    # Add the new skill
    db_student.skills.append(db_skill)
    db.commit()
    db.refresh(db_student)
    return db_student


def get_internships(db: Session, skip: int = 0, limit: int = 20):
    """
    Retrieves a list of internships from the database with pagination.
    """
    return db.query(models.Internship).order_by(
        models.Internship.created_at.desc()
        ).offset(skip).limit(limit).all()


# --- CRUD for Projects ---

def add_project_to_student(
        db: Session,
        student_id: int,
        project: schemas.ProjectCreate
        ):
    db_project = models.Project(**project.dict(), student_id=student_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


# --- LLM-Driven Profile Enrichment ---
def enrich_student_profile(db: Session, student_id: int):
    """
    Fetches a student's full profile, sends it to the LLM for analysis,
    and saves the inferred skills and summary back to the database.
    """
    student = get_student(db, student_id)
    if not student:
        return

    # Prepare data for the LLM
    skill_names = [s.name for s in student.skills]
    project_data = [
        {
            "title": p.title,
            "description": p.description
            } for p in student.projects
        ]

    # Call the LLM service
    enrichment_data = llm_service.generate_profile_enrichment(
        skill_names,
        project_data
        )

    if not enrichment_data:
        return

    # Add the new, inferred skills to the student
    inferred_skills = enrichment_data.get("inferred_skills", [])
    print(f"LLM inferred skills for student {student_id}: {inferred_skills}")
    for skill_name in inferred_skills:
        # We reuse our existing function to avoid duplicating skills
        add_skill_to_student(
            db,
            student_id,
            schemas.SkillCreate(name=skill_name)
            )

    # Save the summary
    summary = enrichment_data.get("summary")
    if summary:
        student.summary = summary
        db.add(student)
        db.commit()
        db.refresh(student)

    return get_student(db, student_id)


# --- CRUD for Courses ---


def add_course_to_student(
        db: Session,
        student_id: int,
        course: schemas.CourseCreate
        ):
    db_course = models.Course(**course.dict(), student_id=student_id)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course

# --- CRUD for Interests ---


def add_interest_to_student(
        db: Session,
        student_id: int,
        interest: schemas.SkillCreate
        ):
    db_student = get_student(db, student_id)
    if not db_student:
        return None
    # We reuse get_or_create_skill because the schema is the same
    db_interest = get_or_create_skill(db, interest)
    if db_interest not in db_student.interests:
        db_student.interests.append(db_interest)
        db.commit()
    return db_student

# --- CRUD for Internship Applications ---


def log_or_update_application(
        db: Session,
        student_id: int,
        application: schemas.InternshipApplicationCreate
        ):
    # Check if an application for this internship already exists
    db_app = db.query(models.InternshipApplication).filter(
        models.InternshipApplication.student_id == student_id,
        models.InternshipApplication.internship_id == application.internship_id
    ).first()

    if db_app:
        # Update existing application status
        db_app.status = application.status
    else:
        # Create a new application log
        db_app = models.InternshipApplication(
            student_id=student_id,
            internship_id=application.internship_id,
            status=application.status
        )
        db.add(db_app)

    db.commit()
    db.refresh(db_app)
    return db_app
