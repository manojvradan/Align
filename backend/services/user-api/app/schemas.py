# services/user-api/app/schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from shared.core.models import ApplicationStatus

# --- Skill Schemas ---


class SkillBase(BaseModel):
    name: str


class SkillCreate(SkillBase):
    pass


class Skill(SkillBase):
    id: int

    class Config:
        from_attributes = True

# --- New Growth-Tracking Schemas ---


class ProjectBase(BaseModel):
    title: str
    description: str
    technologies_used: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class Project(ProjectBase):
    id: int

    class Config:
        from_attributes = True


class CourseBase(BaseModel):
    name: str
    description: Optional[str] = None
    skills_learned: Optional[str] = None


class CourseCreate(CourseBase):
    pass


class Course(CourseBase):
    id: int

    class Config:
        from_attributes = True


class InternshipApplicationBase(BaseModel):
    internship_id: int
    status: ApplicationStatus


class InternshipApplicationCreate(InternshipApplicationBase):
    pass


class InternshipApplication(InternshipApplicationBase):
    id: int
    applied_at: datetime

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
class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    university: Optional[str] = None
    major: Optional[str] = None
    graduation_year: Optional[int] = None


# Properties to return to client
class Student(StudentBase):
    id: int
    created_at: datetime
    university: Optional[str] = None
    major: Optional[str] = None
    graduation_year: Optional[int] = None
    skills: List[Skill] = []
    interests: List[Skill] = []
    projects: List[Project] = []
    courses: List[Course] = []
    applications: List[InternshipApplication] = []

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
