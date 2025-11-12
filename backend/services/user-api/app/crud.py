# services/user-api/app/crud.py
from shared.core import models
from . import schemas, security
from sqlalchemy.orm import Session
import sys

# Add project root to path to allow importing shared modules
sys.path.append('../../../')


def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(
        models.Student.id == student_id).first()


def get_student_by_email(db: Session, email: str):
    return db.query(models.Student).filter(
        models.Student.email == email).first()


def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()


def get_or_create_student(db: Session, claims: dict):
    """
    Finds a student by email from JWT claims, or creates them if they don't exist.
    """
    email = claims.get("email")
    if not email:
        return None

    student = db.query(models.Student).filter(models.Student.email == email).first()

    if not student:
        # User exists in Cognito but not our DB, so create them here
        student = models.Student(
            email=email,
            full_name=claims.get("custom:full_name")  # Or 'name' depending on Cognito setup
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
    db_skill = db.query(models.Skill).filter(models.Skill.name == skill.name.lower()).first()
    if db_skill:
        return db_skill
    db_skill = models.Skill(name=skill.name.lower())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


def add_skill_to_student(db: Session, student_id: int, skill: schemas.SkillCreate):
    db_student = get_student(db, student_id)
    if not db_student:
        return None

    db_skill = get_or_create_skill(db, skill)

    # Check if the student already has this skill
    for s in db_student.skills:
        if s.skill_id == db_skill.id:
            return db_student  # Already has the skill

    # Add the new skill
    student_skill = models.StudentSkill(student_id=db_student.id, skill_id=db_skill.id)
    db.add(student_skill)
    db.commit()
    db.refresh(db_student)
    return db_student


def get_internships(db: Session, skip: int = 0, limit: int = 20):
    """
    Retrieves a list of internships from the database with pagination.
    """
    return db.query(models.Internship).order_by(models.Internship.created_at.desc()).offset(skip).limit(limit).all()
