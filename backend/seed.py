from sqlalchemy.orm import Session
from services.user_api.app import crud, schemas  # Assuming you run this from the backend root
from shared.core.database import SessionLocal, engine
from shared.core import models

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()


def seed_data():
    print("Seeding data...")

    # --- 1. Create Some Distinct Internships ---
    internships = [
        models.Internship(title="Frontend Developer Intern (React)", company="WebCorp", description="Build amazing UIs with React and TypeScript.", location="Remote", url="webcorp.com/react"),
        models.Internship(title="Data Science Intern", company="DataCorp", description="Analyze data using Python, Pandas, and Scikit-learn. Machine learning focus.", location="New York, NY", url="datacorp.com/ds"),
        models.Internship(title="Backend Engineer Intern (Java)", company="ServerCorp", description="Work on our core Java API, databases, and microservices.", location="San Francisco, CA", url="servercorp.com/java"),
        models.Internship(title="UX/UI Design Intern", company="WebCorp", description="Design user flows and mockups for our React applications.", location="Remote", url="webcorp.com/uiux"),
    ]
    db.query(models.Internship).delete()  # Clear existing internships
    db.add_all(internships)
    db.commit()
    print(f"Added {len(internships)} internships.")

    # --- 2. Create Student Personas ---
    db.query(models.Student).delete()  # Clear existing students

    # Persona 1: The Frontend Developer
    student_frontend = models.Student(email="frontend.dev@test.com", full_name="Alex Ray")
    db.add(student_frontend)
    db.commit()
    crud.add_skill_to_student(db, student_frontend.id, schemas.SkillCreate(name="react"))
    crud.add_skill_to_student(db, student_frontend.id, schemas.SkillCreate(name="typescript"))
    crud.add_skill_to_student(db, student_frontend.id, schemas.SkillCreate(name="css"))
    crud.add_project_to_student(db, student_frontend.id, schemas.ProjectCreate(title="Portfolio Website", description="Built a personal portfolio using React."))

    # Persona 2: The Data Scientist
    student_data = models.Student(email="data.sci@test.com", full_name="Sam Curve")
    db.add(student_data)
    db.commit()
    crud.add_skill_to_student(db, student_data.id, schemas.SkillCreate(name="python"))
    crud.add_skill_to_student(db, student_data.id, schemas.SkillCreate(name="pandas"))
    crud.add_skill_to_student(db, student_data.id, schemas.SkillCreate(name="machine learning"))
    crud.add_project_to_student(db, student_data.id, schemas.ProjectCreate(title="Movie Recommender", description="Analyzed movie data with Python and Pandas."))

    db.commit()
    print("Added student personas.")
    print("--- Seeding complete! ---")


if __name__ == "__main__":
    seed_data()
    db.close()
