# database.py - إعداد قاعدة البيانات
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

# إنشاء المحرك
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False}  # مطلوب لـ SQLite
)

# إنشاء Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class للموديلات
Base = declarative_base()


def get_db():
    """Dependency للحصول على database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """إنشاء الجداول"""
    from models import Base  # Import هنا لتجنب circular import
    Base.metadata.create_all(bind=engine)
