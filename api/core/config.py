import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GROQ_API_KEY: str = ""
    GOOGLE_APPS_SCRIPT_URL: str = ""
    GOOGLE_CLIENT_ID: str = ""
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
