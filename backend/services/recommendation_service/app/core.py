# services/recommendation-service/app/core.py

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from shared.core import models
import numpy as np

# ---------------------------------------------------------------------------
# Domain clusters used for cross-domain penalty.
# Any internship whose title/description matches a NON-TECH cluster while the
# student belongs to the TECH cluster gets heavily penalised before ranking.
# ---------------------------------------------------------------------------
DOMAIN_CLUSTERS: dict[str, set[str]] = {
    "tech": {
        "software", "developer", "programmer", "frontend",
        "backend", "fullstack", "full-stack", "web", "react", "javascript",
        "typescript", "python", "java", "node", "devops", "cloud",
        "cybersecurity", "security", "machine learning", "ai",
        "artificial intelligence", "ml", "data", "ux", "ui", "product",
        "mobile", "ios", "android", "game", "it", "information technology",
        "computer", "coding", "tech", "digital", "database", "infrastructure",
        "network", "systems", "sre", "qa",
    },
    "pharmacy": {
        "pharmacy", "pharmacist", "pharmaceutical", "dispensary",
        "medication", "dispensing", "compounding", "apothecary",
    },
    "medical": {
        "medical", "clinical", "healthcare", "nurse", "nursing", "doctor",
        "physician", "hospital", "dental", "physiotherapy",
        "occupational therapy", "radiology", "pathology",
    },
    "finance": {
        "finance", "financial", "banking", "investment", "accounting",
        "actuary", "actuarial", "audit", "tax", "treasury", "equity",
    },
    "law": {"law", "legal", "paralegal", "attorney", "solicitor", "barrister"},
    "education": {
        "teaching", "teacher", "tutoring", "tutor", "instructor",
    },
    "marketing": {
        "marketing", "advertising", "brand", "social media", "seo",
        "public relations", "communications",
    },
    "engineering": {
        "mechanical", "civil", "electrical", "chemical", "structural",
        "aerospace", "automotive", "manufacturing", "geotechnical",
        "environmental engineering", "process engineering",
    },
}

# Broad synonyms that count as a "role match" for the title boost.
# Key = a word that might appear in preferred_job_role; values = extra words
# that also count as a match in an internship title.
ROLE_SYNONYMS: dict[str, list[str]] = {
    "frontend": ["software", "web", "developer", "react", "javascript", "ui"],
    "backend": ["software", "developer", "engineer", "python", "java", "node"],
    "fullstack": ["software", "developer", "engineer", "web", "full-stack"],
    "data": ["analytics", "scientist", "engineer", "analyst", "ml", "ai"],
    "software": ["developer", "engineer", "programmer", "coding"],
    "web": ["frontend", "developer", "software", "react"],
    "developer": ["software", "engineer", "programmer"],
    "engineer": ["developer", "programmer", "software"],
    "designer": ["ux", "ui", "graphic", "visual", "product"],
    "devops": ["cloud", "infrastructure", "sre", "platform"],
    "cybersecurity": ["security", "infosec", "network"],
    "machine": ["ml", "ai", "data", "analyst"],   # "machine learning"
    "ai": ["machine learning", "ml", "data", "nlp"],
}


class TFIDFRecommender:
    def __init__(self):
        # Initialize the vectorizer with English stop words
        self.vectorizer = TfidfVectorizer(stop_words='english', min_df=1)
        self.internship_matrix = None
        self.internships = []

    def _compile_student_document(self, student: models.Student) -> str:
        """
        Creates a single text document for a student, weighting important
        fields by repetition.
        """
        text_parts = []

        # 1. PREFERRED JOB ROLE (Weight: 8x) — most reliable signal
        if student.preferred_job_role:
            text_parts.append((student.preferred_job_role + ' ') * 8)

        # 2. LLM GENERATED KEYWORDS (Weight: 5x)
        # Reduced from 8x — was too dominant and caused off-domain matches
        # when search_keywords happened to share rare IDF terms with unrelated
        # job descriptions.
        keywords = getattr(student, "search_keywords", None)
        if keywords:
            text_parts.append((keywords + ' ') * 5)
        else:
            # Fallback: if the LLM hasn't run yet, repeat the role + major
            # so the high-weight slot isn't wasted.
            if student.preferred_job_role:
                text_parts.append((student.preferred_job_role + ' ') * 4)
            major = getattr(student, "major", None)
            if major:
                text_parts.append((major + ' ') * 3)

        # 3. EXISTING SKILLS (Weight: 4x) — raised from 1x
        skills = ' '.join([s.name for s in student.skills])
        if skills.strip():
            text_parts.append((skills + ' ') * 4)

        # 4. SUMMARY & PROJECTS
        if student.summary:
            text_parts.append((student.summary + ' ') * 2)

        for project in student.projects:
            text_parts.append((project.title + ' ') * 2)
            if project.technologies_used:
                text_parts.append((project.technologies_used + ' ') * 2)
            if project.description:
                text_parts.append(project.description)

        return ' '.join(text_parts)

    def _compile_internship_document(
            self,
            internship: models.Internship
            ) -> str:
        """Creates a single text document for an internship.
        Title is repeated 3x so title-keyword matching dominates over
        description-volume effects."""
        title = internship.title or ''
        return ' '.join([
            (title + ' ') * 3,
            internship.company or '',
            internship.description or ''
        ])

    def _get_student_domain(self, student: models.Student) -> set[str]:
        """Returns the set of domain labels this student belongs to."""
        combined = ' '.join([
            student.preferred_job_role or '',
            getattr(student, 'major', None) or '',
            getattr(student, 'search_keywords', None) or '',
            ' '.join([s.name for s in student.skills]),
        ]).lower()
        matched: set[str] = set()
        for domain, keywords in DOMAIN_CLUSTERS.items():
            if any(kw in combined for kw in keywords):
                matched.add(domain)
        return matched

    def _get_internship_domain(self, internship: models.Internship) -> set[str]:
        """Returns the set of domain labels this internship belongs to."""
        text = ((internship.title or '') + ' ' + (internship.description or '')).lower()
        matched: set[str] = set()
        for domain, keywords in DOMAIN_CLUSTERS.items():
            if any(kw in text for kw in keywords):
                matched.add(domain)
        return matched

    def _generate_match_reason(
            self, student: models.Student, internship: models.Internship
            ) -> str:
        """
        Produces a human-readable explanation for why this internship was
        recommended to this student.
        """
        reasons: list[str] = []
        intern_text = (
            (internship.title or '') + ' ' + (internship.description or '')
        ).lower()

        # 1. Role / title alignment
        if student.preferred_job_role:
            role_words = student.preferred_job_role.lower().split()
            expanded: set[str] = set(role_words)
            for word in role_words:
                expanded.update(ROLE_SYNONYMS.get(word, []))
            if any(kw in intern_text for kw in expanded):
                reasons.append(
                    f"Aligns with your preferred role \"{student.preferred_job_role}\""
                )

        # 2. Matching skills
        matching_skills = [
            s.name for s in student.skills if s.name.lower() in intern_text
        ]
        if matching_skills:
            reasons.append(
                f"Your skills match: {', '.join(matching_skills[:5])}"
            )

        # 3. Keywords that fired
        keywords_raw = getattr(student, "search_keywords", None)
        if keywords_raw:
            # keywords may be comma-separated or space-separated
            kws = [k.strip() for k in keywords_raw.replace(',', ' ').split() if k.strip()]
            matching_kws = [kw for kw in kws if kw.lower() in intern_text]
            # Deduplicate and limit
            seen: set[str] = set()
            unique_kws: list[str] = []
            for kw in matching_kws:
                if kw.lower() not in seen:
                    seen.add(kw.lower())
                    unique_kws.append(kw)
            if unique_kws:
                reasons.append(f"Keyword match: {', '.join(unique_kws[:4])}")

        # 4. Projects that reference the same technologies
        matching_projects: list[str] = []
        for project in student.projects:
            tech = (project.technologies_used or '').lower()
            title = (project.title or '').lower()
            if tech and any(t.strip() in intern_text for t in tech.split(',')):
                matching_projects.append(project.title)
            elif title and title in intern_text:
                matching_projects.append(project.title)
        if matching_projects:
            reasons.append(
                f"Related to your project(s): {', '.join(matching_projects[:2])}"
            )

        if not reasons:
            reasons.append("Matches your overall profile")

        return " · ".join(reasons)

    def fit(self, internships: list[models.Internship]):
        """
        Fits the TF-IDF vectorizer on the entire corpus of internships.
        """
        self.internships = internships
        internship_docs = [
            self._compile_internship_document(i) for i in internships
            ]
        # Ensure we have data to fit
        if internship_docs:
            self.internship_matrix = self.vectorizer.fit_transform(internship_docs)
            print(f"TF-IDF model fitted on {len(internships)} internships.")
        else:
            print("Warning: No internships found to train model.")

    def recommend(
            self, student: models.Student,
            top_n: int = 10
            ) -> list[tuple[models.Internship, str]]:
        """
        Recommends the top N internships for a given student.
        """
        if self.internship_matrix is None:
            return []

        # 1. Create the student's document
        student_doc = self._compile_student_document(student)

        # 2. Transform the student doc into a TF-IDF vector
        student_vector = self.vectorizer.transform([student_doc])

        # 3. Compute cosine similarity
        cosine_similarities = cosine_similarity(
            student_vector,
            self.internship_matrix
            ).flatten()

        # -------------------------------------------------------------
        # 4. DOMAIN PENALTY: hard-penalise clearly off-domain results
        # -------------------------------------------------------------
        # If the student is in the tech domain, internships whose title +
        # description belong exclusively to a non-tech domain get a ×0.05
        # penalty — effectively removing them from contention.
        student_domains = self._get_student_domain(student)
        for idx, internship in enumerate(self.internships):
            intern_domains = self._get_internship_domain(internship)
            if not intern_domains:
                # Unknown domain — leave score unchanged
                continue
            if student_domains and not student_domains.intersection(intern_domains):
                # Internship is in a completely different domain
                cosine_similarities[idx] *= 0.05

        # -------------------------------------------------------------
        # 5. TITLE BOOST: reward internships whose title matches the role
        # -------------------------------------------------------------
        # Boost ×2.5 (up from ×1.5) and also accept domain synonyms so
        # "Software Engineer Intern" is boosted for a "Frontend Developer".
        if student.preferred_job_role:
            role_words = student.preferred_job_role.lower().split()
            # Build expanded keyword set using ROLE_SYNONYMS
            expanded_keywords: set[str] = set(role_words)
            for word in role_words:
                expanded_keywords.update(ROLE_SYNONYMS.get(word, []))

            for idx, internship in enumerate(self.internships):
                title_lower = internship.title.lower()
                if any(kw in title_lower for kw in expanded_keywords):
                    cosine_similarities[idx] *= 2.5

        # -------------------------------------------------------------

        # 6. Get the indices of the top N most similar internships
        actual_top_n = min(top_n, len(self.internships))

        if actual_top_n == 0:
            return []

        # Argpartition to get top N unsorted
        related_docs_indices = np.argpartition(
            cosine_similarities, -actual_top_n
            )[-actual_top_n:]

        # 7. Sort these top N indices by their similarity score
        top_indices = sorted(
            related_docs_indices,
            key=lambda i: cosine_similarities[i],
            reverse=True
            )

        # 8. Return internship objects paired with their match reasons
        recommended_internships = [
            (self.internships[i], self._generate_match_reason(student, self.internships[i]))
            for i in top_indices
        ]
        print("Recommended Internships IDs:", [t[0].id for t in recommended_internships])
        return recommended_internships
