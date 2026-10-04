"""
Application configuration using Pydantic Settings.
Reads environment variables and provides type-safe access.
"""
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    APP_NAME: str = "ChurnXAI API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROJECT_ROOT: Path = BASE_DIR.parent
    MODEL_DIR: Path = BASE_DIR / "models"
    DATA_DIR: Path = PROJECT_ROOT / "data"

    MODEL_PATH: Path = MODEL_DIR / "xgb_churn_pipeline.joblib"
    METADATA_PATH: Path = MODEL_DIR / "model_metadata.json"

    API_V1_PREFIX: str = "/api/v1"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    LOG_LEVEL: str = "INFO"

    MAX_WORKERS: int = 4
    REQUEST_TIMEOUT: int = 30

    DATABASE_URL: Optional[str] = None
    MONGODB_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()