import fitz  # PyMuPDF
import docx
import io

# A comprehensive list of skills. You should expand this list significantly.
# You can also load this from a separate JSON or text file.
SKILLS_LIST = [
    "python", "java", "c++", "javascript", "react", "angular", "vue", "node.js", 
    "typescript", "html", "css", "tailwind css", "sql", "postgresql", "mysql",
    "mongodb", "nosql", "docker", "kubernetes", "aws", "azure", "gcp", "git",
    "restful apis", "graphql", "fastapi", "django", "flask", "machine learning",
    "deep learning", "tensorflow", "pytorch", "scikit-learn", "data analysis",
    "project management", "agile", "scrum", "leadership", "communication"
]


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text content from a PDF file."""
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text()
    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts text content from a DOCX file."""
    doc = docx.Document(io.BytesIO(file_bytes))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text


def extract_skills(text: str) -> list[str]:
    """Extracts known skills from a block of text."""
    found_skills = set()
    text_lower = text.lower()

    for skill in SKILLS_LIST:
        if skill.lower() in text_lower:
            found_skills.add(skill)

    return sorted(list(found_skills))
