from pydantic_settings import BaseSettings
from pathlib import Path # <--- Import the Path object

class Settings(BaseSettings):
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_S3_BUCKET_NAME: str
    AWS_REGION: str

    class Config:
        env_file = Path(__file__).parent / '..' / '.env'

# Create a single instance of the settings to be used throughout the app
settings = Settings()