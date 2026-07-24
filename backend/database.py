# database.py - إعداد قاعدة البيانات
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL


def _normalize_url(url: str) -> str:
    """Accept the URL shape managed Postgres providers hand out.

    Render (and Heroku) expose `postgres://...`, a scheme SQLAlchemy 2 removed.
    Rewriting it here means the platform's value can be used verbatim instead of
    being hand-edited into every environment.
    """
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def _engine_kwargs(url: str) -> dict:
    """Driver-specific engine options.

    `check_same_thread` is a SQLite-only connect arg — passing it to psycopg
    raises TypeError at connect time, so it must be gated on the dialect rather
    than applied unconditionally.
    """
    if url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    # Managed Postgres closes idle connections; pre-ping avoids handing a dead
    # one to a request. Modest pool: the service runs a small dyno.
    return {"pool_pre_ping": True, "pool_size": 5, "max_overflow": 5}


DATABASE_URL = _normalize_url(DATABASE_URL)

# إنشاء المحرك
engine = create_engine(DATABASE_URL, **_engine_kwargs(DATABASE_URL))

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
