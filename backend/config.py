# config.py - إعدادات التطبيق من ملف .env
"""
Application configuration loaded from environment variables.
All paths can be overridden via .env file.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# تحميل .env
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ============ Database ============
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./edusmart.db")

# ============ JWT Authentication ============
JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))

# ============ CORS ============
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

# ============ Model Paths ============
# All paths are configurable via environment variables with sensible fallbacks

def _get_model_path(env_var: str, default_filename: str, models_dir: Path) -> Path:
    """Get model path from env or use default in models_dir"""
    env_path = os.getenv(env_var)
    if env_path:
        path = Path(env_path)
        if path.is_absolute():
            return path
        return BASE_DIR / path
    return models_dir / default_filename


def _validate_model_paths():
    """Validate that model files exist, warn if not"""
    paths = {
        "OULAD_MODEL": OULAD_MODEL_PATH,
        "OULAD_SCALER": OULAD_SCALER_PATH,
        "AXI_MODEL": AXI_MODEL_PATH,
        "AXI_SCALER": AXI_SCALER_PATH
    }
    
    missing = []
    for name, path in paths.items():
        if not path.exists():
            missing.append(f"  - {name}: {path}")
    
    if missing:
        print(f"⚠️ Warning: Missing model files:\n" + "\n".join(missing))
        print("  Set correct paths in .env or ensure files exist.")


# Models directory with env override
MODELS_DIR = Path(BASE_DIR / os.getenv("MODELS_DIR", "../Saved_Models")).resolve()

# Individual model paths - all configurable via env
OULAD_MODEL_PATH = _get_model_path("OULAD_MODEL_PATH", "oulad_model_fixed.joblib", MODELS_DIR)
OULAD_SCALER_PATH = _get_model_path("OULAD_SCALER_PATH", "oulad_scaler_fixed.joblib", MODELS_DIR)
AXI_MODEL_PATH = _get_model_path("AXI_MODEL_PATH", "axi_rf_model.joblib", MODELS_DIR)
AXI_SCALER_PATH = _get_model_path("AXI_SCALER_PATH", "axi_scaler.joblib", MODELS_DIR)

# Validate on import (but don't crash)
if os.getenv("SKIP_MODEL_VALIDATION") != "1":
    _validate_model_paths()
