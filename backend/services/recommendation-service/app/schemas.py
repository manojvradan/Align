# services/recommendation-service/app/schemas.py

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# This is the Pydantic model that defines the structure of a single internship
# in the API response. It should match the data you want to show the user.
class Internship(BaseModel):
    id: int
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    url: str
    created_at: datetime

    # This config allows Pydantic to read data from ORM objects (like SQLAlchemy models)
    class Config:
        from_attributes = True


# This is the main response model for your endpoint.
# It ensures the final JSON will look like: {"recommendations": [...]}
class RecommendationResponse(BaseModel):
    recommendations: List[Internship]
