# services/recommendation-service/app/core.py

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from shared.core import models
import numpy as np


class TFIDFRecommender:
    def __init__(self):
        # Initialize the vectorizer with English stop words
        self.vectorizer = TfidfVectorizer(stop_words='english', min_df=2)
        self.internship_matrix = None
        self.internships = []

    def _compile_student_document(self, student: models.Student) -> str:
        """
        Creates a single text document for a student, weighting important
        fields.
        Weighting is done by repeating terms.
        """
        text_parts = []

        # 1. PREFERRED JOB ROLE (Weight: 5x)
        if student.preferred_job_role:
            text_parts.append((student.preferred_job_role + ' ') * 5)

        # 2. LLM GENERATED KEYWORDS (Weight: 8x)
        # This is the most powerful part. It bridges the gap between
        # "Frontend" and "React/Redux/CSS".
        # keywords = getattr(student, "search_keywords", None)
        # if keywords:
        #     text_parts.append((keywords + ' ') * 8)

        # 3. EXISTING SKILLS (Weight: 4x)
        skills = ' '.join([s.name for s in student.skills])
        text_parts.append((skills + ' ') * 4)

        # 4. SUMMARY & PROJECTS
        if student.summary:
            text_parts.append((student.summary + ' ') * 2)

        for project in student.projects:
            text_parts.append((project.title + ' ') * 2)
            if project.technologies_used:
                text_parts.append((project.technologies_used + ' ') * 2)
            text_parts.append(project.description)

        return ' '.join(text_parts)

    def _compile_internship_document(
            self,
            internship: models.Internship
            ) -> str:
        """Creates a single text document for an internship."""
        return ' '.join([
            internship.title,
            internship.company or '',
            internship.description or ''
        ])

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
            ) -> list[models.Internship]:
        """
        Recommends the top N internships for a given student.
        """
        if self.internship_matrix is None:
            raise RuntimeError(
                "Recommender has not been fitted. Call fit() first."
                )

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
        # 4. APPLY BOOSTING LOGIC
        # -------------------------------------------------------------
        # If the internship title explicitly matches words in the preferred role,
        # we manually multiply the similarity score.
        if student.preferred_job_role:
            role_keywords = student.preferred_job_role.lower().split()

            # Iterate through all internships to apply specific boosting
            for idx, internship in enumerate(self.internships):
                title_lower = internship.title.lower()

                # Check intersection (e.g., if "Software" is in "Software Engineer")
                if any(word in title_lower for word in role_keywords):
                    # Multiply score by 1.5 (50% Boost)
                    cosine_similarities[idx] *= 1.5

        # -------------------------------------------------------------

        # 5. Get the indices of the top N most similar internships
        # Handle case where top_n > total internships
        actual_top_n = min(top_n, len(self.internships))

        if actual_top_n == 0:
            return []

        # Argpartition to get top N unsorted
        related_docs_indices = np.argpartition(
            cosine_similarities, -actual_top_n
            )[-actual_top_n:]

        # 6. Sort these top N indices by their similarity score
        top_indices = sorted(
            related_docs_indices,
            key=lambda i: cosine_similarities[i],
            reverse=True
            )

        # 7. Return the actual internship objects
        recommended_internships = [self.internships[i] for i in top_indices]
        print("Recommended Internships IDs:", [i.id for i in recommended_internships])
        return recommended_internships
