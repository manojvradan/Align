import fitz  # PyMuPDF
import docx
import io

# A comprehensive list of skills. You should expand this list significantly.
# You can also load this from a separate JSON or text file.
SKILLS_LIST = [
    # --- TECHNOLOGY & DATA SCIENCE ---
    "python", "java", "c++", "c#", "javascript", "react", "angular", "vue",
    "node.js", "typescript", "html", "css", "tailwind css", "sql", "postgresql",
    "mysql", "mongodb", "nosql", "docker", "kubernetes", "aws", "azure", "gcp",
    "git", "restful apis", "graphql", "fastapi", "django", "flask",
    "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn",
    "data analysis", "pandas", "numpy", "r language", "tableau", "power bi",
    "linux", "bash", "cybersecurity", "network security", "penetration testing",

    # --- BUSINESS, FINANCE & ACCOUNTING ---
    "financial modeling", "valuation", "accounting", "bookkeeping", "gaap", "ifrs",
    "auditing", "taxation", "budgeting", "forecasting", "risk management",
    "excel", "advanced excel", "vlookup", "pivot tables", "macros", "vba",
    "sap", "oracle", "netsuite", "quickbooks", "xero", "salesforce", "crm",
    "bloomberg terminal", "capital markets", "investment banking", "compliance",

    # --- MARKETING, SALES & CONTENT ---
    "seo", "sem", "google analytics", "google ads", "content marketing",
    "social media management", "copywriting", "email marketing", "mailchimp",
    "hubspot", "digital marketing", "brand strategy", "public relations",
    "market research", "customer service", "lead generation", "negotiation",

    # --- ENGINEERING (MECHANICAL, CIVIL, ELECTRICAL) ---
    "autocad", "solidworks", "catia", "ansys", "matlab", "simulink",
    "revit", "civil 3d", "structural analysis", "hvac", "thermodynamics",
    "fluid mechanics", "circuit design", "pcb design", "microcontrollers",
    "arduino", "raspberry pi", "plc", "scada", "robotics", "embedded systems",
    "six sigma", "lean manufacturing", "quality control",

    # --- HEALTHCARE, PHARMACY & SCIENCE ---
    "pharmacology", "clinical trials", "patient care", "medical terminology",
    "hipaa", "electronic medical records", "emr", "ehr", "triage", "phlebotomy",
    "vital signs", "cpr certified", "first aid", "dispensing", "compounding",
    "medication reconciliation", "biology", "chemistry", "biochemistry",
    "pcr", "microscopy", "lab techniques", "clinical research",

    # --- DESIGN & CREATIVE ---
    "adobe creative suite", "photoshop", "illustrator", "indesign",
    "premiere pro", "after effects", "figma", "sketch", "invision",
    "ui design", "ux design", "prototyping", "wireframing", "typography",
    "color theory", "video editing", "animation", "3d modeling", "blender",

    # --- LAW, POLICY & ADMIN ---
    "legal research", "contract law", "litigation", "westlaw", "lexisnexis",
    "legal writing", "public policy", "grant writing", "administrative support",
    "data entry", "transcription", "scheduling", "office management",

    # --- PROJECT MANAGEMENT & SOFT SKILLS ---
    "project management", "agile", "scrum", "kanban", "jira", "asana", "trello",
    "notion", "leadership", "communication", "teamwork", "problem solving",
    "critical thinking", "time management", "strategic planning", "public speaking"
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
