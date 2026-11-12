from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os

# Base directory: ECG_FINAL_PROJECT
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
DATABASE_DIR = PROJECT_ROOT / "database"
DATABASE_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_SQLITE_PATH = DATABASE_DIR / "cardiopulse.db"

class Settings(BaseSettings):
    PROJECT_NAME: str = "CardioPulse AI - Clinical Decision Support Platform"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "cardiopulse-clinical-security-key-production-ready-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Directory paths
    BASE_DIR: Path = PROJECT_ROOT
    DB_DIR: Path = DATABASE_DIR
    
    # Dedicated SQLite database path (inside database/ folder) with PostgreSQL URI support
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DEFAULT_SQLITE_PATH.as_posix()}")
    
    # AI / LLM Configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    AI_FALLBACK_MODE: bool = True
    
    # Emergency Contact Hotline Defaults (e.g., India: 112 / 102 / 108, US: 911)
    EMERGENCY_AMBULANCE_NUMBER: str = "112"
    
    class Config:
        env_file = ".env"

settings = Settings()
