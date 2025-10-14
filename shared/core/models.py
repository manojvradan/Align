from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func

# Import the Base from our database.py file
from .database import Base


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    # add more fields like university, major, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    company = Column(String, index=True)
    description = Column(Text)
    url = Column(String, unique=True)  # The source URL of the job posting
    # add more fields like location, required_skills (as text), etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
