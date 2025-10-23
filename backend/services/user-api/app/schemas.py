# services/user-api/app/schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# --- Student Schemas ---


# Shared properties
class StudentBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


# Properties to receive via API on creation
class StudentCreate(StudentBase):
    password: str


# Properties to receive via API on update
class StudentUpdate(StudentBase):
    pass  # For now, allow updating the same fields as base


# Properties to return to client
class Student(StudentBase):
    id: int
    created_at: datetime

    # This is a Pydantic V2 configuration setting that allows the model
    # to be created from an ORM object (like our SQLAlchemy Student model).
    # It tells Pydantic to read the data even if it is not a dict,
    # but an ORM model.
    class Config:
        from_attributes = True
