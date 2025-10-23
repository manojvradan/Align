import io
from fastapi import FastAPI, UploadFile, File, HTTPException
import uuid
from . import s3_utils, parser, schemas
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Resume Parser Service")

origins = [
    "http://localhost:3000", # The default for create-react-app
    "http://localhost:3001",
    "http://localhost:5173", # The default for Vite
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
)

@app.post("/upload-resume/", response_model=schemas.ResumeParseResponse)
async def upload_and_parse_resume(file: UploadFile = File(...)):
    """
    Accepts a resume file (PDF or DOCX), uploads it to S3,
    parses it for skills, and returns the results.
    """
    # 1. Validate file type
    if not file.content_type in ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF or DOCX.")

    # 2. Read file content into memory
    file_content = await file.read()
    
    # 3. Create a unique filename to avoid conflicts in S3
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"resumes/{uuid.uuid4()}.{file_extension}"

    # 4. Upload to S3
    s3_url = s3_utils.upload_file_to_s3(file_obj=io.BytesIO(file_content), object_name=unique_filename)
    if not s3_url:
        raise HTTPException(status_code=500, detail="Could not upload file to S3.")
        
    # 5. Extract text based on file type
    text = ""
    
    try: # <--- ADD TRY BLOCK
        if file.content_type == "application/pdf":
            text = parser.extract_text_from_pdf(file_content)
        else: # DOCX
            text = parser.extract_text_from_docx(file_content)
    except Exception as e: # <--- CATCH EXCEPTIONS
        print(f"Error parsing file: {e}") # This will print the error to your console
        raise HTTPException(status_code=400, detail=f"Failed to parse the uploaded file. It might be corrupted.")

    if not text:
        raise HTTPException(status_code=500, detail="Could not extract text from the document.")

    # 6. Extract skills
    skills = parser.extract_skills(text)
    
    # 7. Return the response
    return schemas.ResumeParseResponse(
        filename=file.filename,
        s3_url=s3_url,
        extracted_skills=skills
    )