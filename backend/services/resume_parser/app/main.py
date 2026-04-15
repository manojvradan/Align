import io
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from . import s3_utils, parser, schemas

app = FastAPI(title="Resume Parser Service")

import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload-resume/", response_model=schemas.ResumeParseResponse)
async def upload_and_parse_resume(file: UploadFile = File(...)):
    """
    Accepts a resume file (PDF or DOCX), uploads it to S3,
    and returns the extracted skills to the client.
    """
    # 1. Validate file type
    allowed_types = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Please upload a PDF or DOCX."
        )

    # 2. Read file
    try:
        file_content = await file.read()
    except Exception:
        raise HTTPException(status_code=400, detail="Could not read file.")

    # 3. Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"resumes/{uuid.uuid4()}.{file_extension}"

    # 4. Upload to S3
    s3_url = s3_utils.upload_file_to_s3(
        file_obj=io.BytesIO(file_content),
        object_name=unique_filename
    )
    if not s3_url:
        raise HTTPException(status_code=500, detail="Could not upload file to S3.")

    # 5. Extract text
    text = ""
    try:
        if file.content_type == "application/pdf":
            text = parser.extract_text_from_pdf(file_content)
        else:
            text = parser.extract_text_from_docx(file_content)
    except Exception as e:
        print(f"Error parsing file: {e}")
        raise HTTPException(status_code=400, detail="Failed to parse file content.")

    # 6. Extract skills
    skills = parser.extract_skills(text)

    # 7. Return to Frontend (Let the frontend handle adding to profile)
    return schemas.ResumeParseResponse(
        filename=file.filename,
        s3_url=s3_url,
        extracted_skills=skills,
        raw_text=text
    )
