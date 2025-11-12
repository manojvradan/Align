from sqlalchemy.orm import Session, joinedload
from shared.core import models  # Assuming shared models are accessible


def get_student_profile(db: Session, student_id: int) -> models.Student | None:
    """
    Fetches a student and all their related growth data in a single,
    efficient query.
    """
    return db.query(models.Student).filter(models.Student.id == student_id).options(
        joinedload(models.Student.skills),
        joinedload(models.Student.interests),
        joinedload(models.Student.projects),
        joinedload(models.Student.courses)
    ).first()


def get_all_internships(db: Session) -> list[models.Internship]:
    """
    Fetches all internships from the database.
    """
    return db.query(models.Internship).all()