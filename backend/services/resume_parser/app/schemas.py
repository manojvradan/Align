from pydantic import BaseModel
from typing import List


class ResumeParseResponse(BaseModel):
    filename: str
    s3_url: str
    extracted_skills: List[str]
