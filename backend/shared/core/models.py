from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum
# Import the Base from our database.py file
from .database import Base


# --- Association Tables ---


student_skills = Table(
    'student_skills',
    Base.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True),
    # Add a timestamp to know WHEN a skill was added/updated
    Column('added_at', DateTime(timezone=True), server_default=func.now())
)

student_interests = Table(
    'student_interests',
    Base.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    # We can reuse the Skill table for interests or create a separate Interest table
    # For simplicity, let's assume interests are like skills for now.
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True)
)


# --- Enums for Tracking ---


class ApplicationStatus(enum.Enum):
    INTERESTED = "interested"
    APPLIED = "applied"
    INTERVIEWING = "interviewing"
    OFFER = "offer"
    REJECTED = "rejected"


# --- Core Models ---


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, index=True)
    university = Column(String, nullable=True)
    major = Column(String, nullable=True)
    graduation_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    skills = relationship(
        "Skill",
        secondary=student_skills, # Use the association table
        back_populates="students"
    )
    interests = relationship(
        "Skill", # Reusing Skill table for interests
        secondary=student_interests
    )
    projects = relationship("Project", back_populates="student", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="student", cascade="all, delete-orphan")
    applications = relationship("InternshipApplication", back_populates="student")


class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    location = Column(String, index=True, nullable=False)
    company = Column(String, index=True)
    description = Column(Text)
    url = Column(String, unique=True)  # The source URL of the job posting
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    # This relationship is not strictly necessary but can be useful
    students = relationship(
        "Student",
        secondary=student_skills,
        back_populates="skills"
    )


# --- New Models for Growth Tracking ---


class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    technologies_used = Column(String) # Comma-separated or JSON
    start_date = Column(DateTime(timezone=True))
    end_date = Column(DateTime(timezone=True))
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)

    student = relationship("Student", back_populates="projects")


class Course(Base):
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    skills_learned = Column(String) # Comma-separated or JSON
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)

    student = relationship("Student", back_populates="courses")


class InternshipApplication(Base):
    __tablename__ = "internship_applications"
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey('students.id'), nullable=False)
    internship_id = Column(Integer, ForeignKey('internships.id'), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.INTERESTED)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="applications")
    internship = relationship("Internship")
