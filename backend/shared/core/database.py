import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

# This line loads the .env file for local development outside of Docker
load_dotenv()

# --- 1. Read Database Credentials from Environment Variables ---
# These will be supplied by Docker Compose or your production environment
DB_USER = os.getenv("DATABASE_USER", "postgres")
DB_PASSWORD = os.getenv("DATABASE_PASSWORD", "Aligndb")
DB_HOST = os.getenv("DATABASE_HOST", "localhost")
DB_PORT = os.getenv("DATABASE_PORT", "5432")
DB_NAME = os.getenv("DATABASE_NAME", "postgres")

# --- 2. Construct the Database URL ---
# The format is: "postgresql://<user>:<password>@<host>:<port>/<dbname>"
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

# --- 3. Create the SQLAlchemy Engine ---
# The engine is the central source of connectivity to the database.
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# --- 4. Create a SessionLocal class ---
# Each instance of SessionLocal will be a database session.
# This is the main handle
# for interacting with the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False,
                            bind=engine)

# --- 5. Create a Base class ---
# We will inherit from this class to create each of the ORM models .
Base = declarative_base()


# --- 6. Dependency for FastAPI ---
# This function creates a new session for each request and ensures it's closed.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
