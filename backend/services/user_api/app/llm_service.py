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
