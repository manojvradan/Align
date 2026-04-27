import json
import re
import time
import openai
import os
from typing import List, Dict, Any

# It's best practice to load the API key from environment variables
openai.api_key = os.getenv("OPENAI_API_KEY")

# ---------------------------------------------------------------------------
# Gemini – role skills with Google Search grounding
# ---------------------------------------------------------------------------
# Simple in-process cache so we don't hit the API on every page load.
_skills_cache: Dict[str, Dict] = {}
_skills_cache_ts: Dict[str, float] = {}
_CACHE_TTL = 86_400  # 24 hours


def get_skills_for_role(role: str) -> Dict[str, Any]:
    """
    Uses Gemini (gemini-1.5-flash) with Google Search Grounding to return
    the current market skills required for the given job role.

    Returns:
        {
            "skills": ["Python", "SQL", ...],
            "source": "Google Search (grounded by Gemini 1.5 Flash)",
            "grounding_urls": [{"title": "...", "url": "..."}, ...]
        }
    On any failure returns an empty result so the frontend falls back to the
    static skill map.
    """
    empty = {"skills": [], "source": "", "grounding_urls": []}

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY not set – skill grounding disabled.")
        return empty

    role_key = role.lower().strip()

    # Return cached result if still fresh
    if role_key in _skills_cache:
        age = time.time() - _skills_cache_ts.get(role_key, 0)
        if age < _CACHE_TTL:
            print(f"[Gemini] Returning cached skills for '{role}'")
            return _skills_cache[role_key]

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)

        prompt = (
            f'You are an expert technical recruiter. '
            f'Using current job market data from the web, list under 10 most'
            f'important skills (technical tools, frameworks, certifications, '
            f'and methodologies) that appear in real internship job postings for the role: '
            f'"{role}". '
            f'Focus specifically on entry-level internship positions, not full-time or senior roles. '
            f'Respond ONLY with a JSON object in this exact format, no other text:\n'
            f'{{"skills": ["skill1", "skill2", "skill3"]}}'
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())],
            ),
        )

        # --- Parse skills from response text ---
        raw = response.text.strip()
        # Strip markdown fences if present
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.IGNORECASE)
        raw = re.sub(r"\n?```$", "", raw)
        # Remove inline citation markers like [1], [2] etc.
        raw = re.sub(r"\[\d+\]", "", raw)

        # Try to extract the JSON object
        json_match = re.search(r'\{.*"skills"\s*:\s*\[.*?\]\s*\}', raw, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
        else:
            data = json.loads(raw)

        skills: List[str] = data.get("skills", [])
        if not isinstance(skills, list):
            skills = []

        # --- Extract grounding source URLs ---
        grounding_urls: List[Dict[str, str]] = []
        try:
            candidate = response.candidates[0]
            metadata = candidate.grounding_metadata
            if metadata and metadata.grounding_chunks:
                for chunk in metadata.grounding_chunks[:6]:
                    if hasattr(chunk, "web") and chunk.web:
                        grounding_urls.append({
                            "title": chunk.web.title or chunk.web.uri,
                            "url": chunk.web.uri,
                        })
        except Exception as meta_err:
            print(f"[Gemini] Could not extract grounding metadata: {meta_err}")

        result = {
            "skills": skills,
            "source": "Google Search (grounded by Gemini 2.5 Flash)",
            "grounding_urls": grounding_urls,
        }

        # Store in cache
        _skills_cache[role_key] = result
        _skills_cache_ts[role_key] = time.time()
        print(f"[Gemini] Fetched {len(skills)} skills for '{role}' "
              f"with {len(grounding_urls)} grounding sources.")
        return result

    except Exception as e:
        print(f"[Gemini] Error fetching skills for role '{role}': {type(e).__name__}: {e}")
        return empty


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

    # Truncate resume text to avoid hitting token limits (~6000 chars ≈ 1500 tokens)
    resume_section = ""
    if resume_text:
        truncated = resume_text[:6000]
        resume_section = f"\n\n**Full Resume Text (use this as the source of truth):**\n{truncated}"

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

    **Strict Instructions:**
    1. Write a concise, professional cover letter (3-4 paragraphs).
    2. ONLY reference experiences, projects, skills, and achievements that are explicitly present in the resume text above. Quote or paraphrase directly from the resume — do not invent anything.
    3. If the resume text is empty or a section is missing, acknowledge the student's studies and skills without fabricating work history.
    4. DO NOT fabricate any job titles, company names, projects, certifications, or experiences the student has not listed.
    5. Match the role requirements from the job description to actual resume content — if a requirement isn't met, do not claim it is.
    6. Use a standard cover letter format: greeting, 3 body paragraphs, sign-off.
    7. Address it to "Hiring Manager" unless the job description specifies a name.
    8. Keep the tone enthusiastic but honest and professional.

    Output ONLY the cover letter text, no extra commentary or explanation.
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-4o-mini",  # Better quality than gpt-3.5-turbo at similar cost
            messages=[
                {"role": "system",
                 "content": (
                     "You are a professional cover letter writer. "
                     "You only write about experiences and skills that are explicitly "
                     "stated in the resume provided. You never fabricate or embellish."
                 )},
                {"role": "user", "content": prompt}
            ],
        )
        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return ""
