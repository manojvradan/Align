import json
import openai
import os
from typing import List, Dict, Any

# It's best practice to load the API key from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")


def generate_profile_enrichment(
        skills: List[str],
        projects: List[Dict[str, str]]
        ) -> Dict[str, Any]:
    """
    Uses an LLM to analyze a student's profile and infer additional skills
    and generate a professional summary.
    """
    if not openai.api_key:
        print("WARNING: OPENAI_API_KEY environment variable not set. "
              "LLM service is disabled.")
        return {"inferred_skills": [], "summary": ""}

    # --- 1. Compile the input text ---
    skill_str = ", ".join(skills)
    project_str = "\n".join([
        f"- {p['title']}: {p['description']}" for p in projects
        ])

    # --- 2. Engineer the Prompt ---
    # This is the most important part. We give the LLM a clear role, context
    prompt = f"""
    You are an expert career advisor and tech recruiter AI.
    Your task is to analyze a student's technical profile.
    Based on the provided skills and projects, your goal is
    to infer broader technical concepts, roles, and related keywords.

    **Student's Explicit Skills:**
    {skill_str}

    **Student's Projects:**
    {project_str}

    **Your Tasks:**
    1.  **Infer Skills & Keywords:** Based on the profile, list up to 10
    additional relevant skills, technical concepts, or job roles.
    Examples include "frontend development", "web applications",
    "data visualization", "state management", "API consumption".
    2.  **Generate Summary:** Write a 1-2 sentence professional
    summary highlighting the student's core strengths, as if for a resume.

    **Output Format:**
    Provide your response as a JSON object with two keys: "inferred_skills"
    (a list of strings) and "summary" (a single string).
    Do not include any other text or explanation.

    Example Response:
    {{
      "inferred_skills": ["frontend development", "user interface design",
      "web applications", "state management"],
      "summary": "A frontend-focused developer with hands-on experience in
      building interactive web applications using React and TypeScript."
    }}
    """

    # --- 3. Call the OpenAI API ---
    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",  # A good balance of cost and performance
            messages=[
                {"role": "system",
                 "content": "You are a helpful AI assistant outputting JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content

        # The API should return a JSON string, which we parse
        import json
        return json.loads(content)

    except Exception as e:
        print(f"Error calling OpenAI API: {e}")
        return {"inferred_skills": [], "summary": ""}


def generate_keywords_for_role(role: str) -> str:
    """
    Asks the LLM to generate a string of technical keywords relevant 
    to a specific job role to improve search matching.
    Returns a space-separated string of keywords.
    """
    if not openai.api_key:
        print("WARNING: OPENAI_API_KEY not set. Skipping keyword generation.")
        return ""

    print(f"🤖 (LLM) Generating search keywords for role: {role}...")

    prompt = f"""
    Act as an expert technical recruiter. 
    I am building a search engine. I have a user looking for an internship as a "{role}".
    
    List 25 specific technical hard skills, libraries, tools, frameworks, and concepts 
    that commonly appear in job descriptions for this specific role.
    
    Focus on technology (e.g., "React", "Python", "AWS", "Agile", "CI/CD").
    
    **Output Format:**
    Provide a JSON object with a single key "keywords" containing a list of strings.

    Example:
    {{ "keywords": ["react", "typescript", "redux", "css", "webpack"] }}
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful AI that outputs JSON."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        data = json.loads(content)

        # Convert list ["a", "b"] -> string "a b"
        keywords = data.get("keywords", [])
        return " ".join(keywords)

    except Exception as e:
        print(f"Error generating keywords: {e}")
        return ""


def generate_cover_letter(
        student_name: str,
        student_summary: str,
        skills: List[str],
        job_title: str,
        company: str,
        job_description: str,
        resume_text: str = ""
) -> str:
    """
    Uses an LLM to generate a professional cover letter tailored to
    a specific job posting based on the student's profile.
    """
    if not openai.api_key:
        print("WARNING: OPENAI_API_KEY not set. Cannot generate cover letter.")
        return ""

    skill_str = ", ".join(skills) if skills else "Not specified"

    # Truncate resume text to avoid hitting token limits (~3000 chars ≈ 750 tokens)
    resume_section = ""
    if resume_text:
        truncated = resume_text[:3000]
        resume_section = f"\n    - Full Resume:\n{truncated}"

    prompt = f"""
    You are an expert career advisor writing a professional cover letter
    for a university student applying to an internship.

    **Applicant Info:**
    - Name: {student_name}
    - Summary: {student_summary or "A motivated university student seeking an internship opportunity."}
    - Key Skills: {skill_str}{resume_section}

    **Job Details:**
    - Title: {job_title}
    - Company: {company}
    - Description: {job_description or "Not available"}

    **Instructions:**
    1. Write a concise, professional cover letter (3-4 paragraphs).
    2. Highlight how the applicant's skills and background align with the role.
    3. Draw on specific experiences and projects from the resume where relevant.
    4. Keep the tone enthusiastic but professional.
    5. Do NOT fabricate experience the student doesn't have.
    6. Use a standard cover letter format with greeting and sign-off.
    7. Address it to "Hiring Manager" if no specific name is given.

    Output ONLY the cover letter text, no extra commentary.
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system",
                 "content": "You are a professional cover letter writer."},
                {"role": "user", "content": prompt}
            ],
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return ""
