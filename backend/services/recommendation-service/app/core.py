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
        Creates a single text document for a student, weighting important fields.
        Weighting is done by repeating terms.
        """
        text_parts = []

        # High weight for skills and interests
        skills = ' '.join([s.name for s in student.skills])
        interests = ' '.join([i.name for i in student.interests])
        text_parts.append((skills + ' ') * 5)
        text_parts.append((interests + ' ') * 5)

        # Medium weight for project titles and technologies
        for project in student.projects:
            text_parts.append((project.title + ' ') * 3)
            if project.technologies_used:
                text_parts.append((project.technologies_used + ' ') * 3)
            text_parts.append(project.description)

        # Low weight for course names
        for course in student.courses:
            text_parts.append(course.name)

        return ' '.join(text_parts)

    def _compile_internship_document(self, internship: models.Internship) -> str:
        """Creates a single text document for an internship."""
        return ' '.join([
            internship.title,
            internship.company or '',
            internship.description or ''
        ])

    def fit(self, internships: list[models.Internship]):
        """
        Fits the TF-IDF vectorizer on the entire corpus of internships.
        This should be done once at startup or periodically.
        """
        self.internships = internships
        internship_docs = [self._compile_internship_document(i) for i in internships]
        self.internship_matrix = self.vectorizer.fit_transform(internship_docs)
        print("TF-IDF model fitted on internships.")

    def recommend(self, student: models.Student, top_n: int = 10) -> list[models.Internship]:
        """
        Recommends the top N internships for a given student.
        """
        if self.internship_matrix is None:
            raise RuntimeError("Recommender has not been fitted. Call fit() first.")

        # 1. Create the student's document
        student_doc = self._compile_student_document(student)

        # 2. Transform the student doc into a TF-IDF vector
        student_vector = self.vectorizer.transform([student_doc])

        # 3. Compute cosine similarity between the student and all internships
        cosine_similarities = cosine_similarity(student_vector, self.internship_matrix).flatten()

        # 4. Get the indices of the top N most similar internships
        # We use argpartition for efficiency, it's faster than a full sort
        related_docs_indices = np.argpartition(cosine_similarities, -top_n)[-top_n:]

        # 5. Sort these top N indices by their similarity score
        top_indices = sorted(related_docs_indices, key=lambda i: cosine_similarities[i], reverse=True)

        # 6. Return the actual internship objects
        recommended_internships = [self.internships[i] for i in top_indices]

        return recommended_internships
