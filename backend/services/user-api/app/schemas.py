# services/user-api/app/schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# --- Skill Schemas ---
class SkillBase(BaseModel):
    name: str


class SkillCreate(SkillBase):
    pass


class Skill(SkillBase):
    id: int

    class Config:
        from_attributes = True


# --- Student Schemas ---


# Shared properties
class StudentBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


# Properties to receive via API on creation
class StudentCreate(StudentBase):
    pass


# Properties to receive via API on update
class StudentUpdate(StudentBase):
    pass


# Properties to return to client
class Student(StudentBase):
    id: int
    created_at: datetime
    skills: List[Skill] = []

    class Config:
        from_attributes = True


# --- Authentication Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class Internship(BaseModel):
    id: int
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    created_at: datetime

    class Config:
        from_attributes = True
