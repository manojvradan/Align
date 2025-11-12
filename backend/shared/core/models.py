from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Table, TIMESTAMP, text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

# Import the Base from our database.py file
from .database import Base

student_skills = Table(
    'student_skills',
    Base.metadata,
    Column('student_id', Integer, ForeignKey('students.id'), primary_key=True),
    Column('skill_id', Integer, ForeignKey('skills.id'), primary_key=True)
)


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, index=True)
    # add more fields like university, major, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    skills = relationship(
        "Skill",
        secondary=student_skills, # Use the association table
        back_populates="students"
    )


class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    location = Column(String, index=True, nullable=False)
    company = Column(String, index=True)
    description = Column(Text)
    url = Column(String, unique=True)  # The source URL of the job posting
    # add more fields like location, required_skills (as text), etc.
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

