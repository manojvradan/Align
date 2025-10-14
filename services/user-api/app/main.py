from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from shared.core.database import engine, get_db
from shared.core import models
from . import crud, schemas
from typing import List
import sys

# This is a key step to allow importing from the parent directory
# It adds the project root to Python's path
sys.path.append('../../../')

# Now you can import from the shared directory


# This command tells SQLAlchemy to
# create all the tables defined in your models.
# It checks if the tables exist first, so it's safe to run on every startup.
# For production, you would use a migration tool like Alembic.
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Internship Recommendation - User API",
    description="Handles user profiles, authentication, and interactions."
)


# --- CREATE ---
@app.post("/students/", response_model=schemas.Student, status_code=201)
def create_new_student(student: schemas.StudentCreate,
                       db: Session = Depends(get_db)):
    db_student = crud.get_student_by_email(db, email=student.email)
    if db_student:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_student(db=db, student=student)


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
