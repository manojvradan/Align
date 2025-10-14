# services/user-api/app/crud.py
from shared.core import models
from . import schemas
from sqlalchemy.orm import Session
import sys

# Add project root to path to allow importing shared modules
sys.path.append('../../../')


# --- Hashing Passwords (CRITICAL!) ---
# In a real app, you MUST hash passwords. We'll use a placeholder for now.
# A great library for this is `passlib`. Example:
# from passlib.context import CryptContext
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# def get_password_hash(password):
#     return pwd_context.hash(password)


def get_student(db: Session, student_id: int):
    return db.query(models.Student).filter(
        models.Student.id == student_id).first()


def get_student_by_email(db: Session, email: str):
    return db.query(models.Student).filter(
        models.Student.email == email).first()


def get_students(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Student).offset(skip).limit(limit).all()


def create_student(db: Session, student: schemas.StudentCreate):
    # In a real app, replace student.password with a hashed password
    # fake_hashed_password = get_password_hash(student.password)
    fake_hashed_password = student.password + "_hashed"  # Placeholder
    db_student = models.Student(
        email=student.email,
        full_name=student.full_name,
        hashed_password=fake_hashed_password
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student


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
