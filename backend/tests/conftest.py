"""Isolated fixtures for backend API tests.

Environment protection must happen before importing any backend module: config.py
normally reads backend/.env at import time.
"""

from __future__ import annotations

import atexit
import os
import sys
from pathlib import Path
from typing import Callable

import dotenv
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


BACKEND_DIR = Path(__file__).resolve().parents[1]
BACKEND_PATH = str(BACKEND_DIR)
KNOWN_TEST_PASSWORD = "P0-fixture-password"

_MISSING = object()
_TEST_ENV = {
    "DATABASE_URL": "sqlite://",
    "JWT_SECRET": "pytest-only-secret",
    "JWT_ALGORITHM": "HS256",
    "JWT_EXPIRE_MINUTES": "30",
    "SKIP_MODEL_VALIDATION": "1",
    "PYTHON_DOTENV_DISABLED": "1",
    # Explicitly mask provider credentials before chatbot_routes is imported.
    "GROQ_API_KEY": "",
    "OPENAI_API_KEY": "",
}
_ORIGINAL_ENV = {key: os.environ.get(key, _MISSING) for key in _TEST_ENV}
_ORIGINAL_LOAD_DOTENV = dotenv.load_dotenv
_ADDED_BACKEND_PATH = BACKEND_PATH not in sys.path
_PROCESS_STATE_RESTORED = False

if _ADDED_BACKEND_PATH:
    sys.path.insert(0, BACKEND_PATH)
os.environ.update(_TEST_ENV)
dotenv.load_dotenv = lambda *_args, **_kwargs: False

import auth  # noqa: E402
import database  # noqa: E402
import models  # noqa: E402
import routes.chatbot_routes as chatbot_routes  # noqa: E402
from main import app as production_app  # noqa: E402


_ORIGINAL_GET_GROQ_CLIENT = chatbot_routes.get_groq_client
_ORIGINAL_GROQ_API_KEY = chatbot_routes.GROQ_API_KEY
_ORIGINAL_GROQ_CLIENT = chatbot_routes.groq_client

# Defense in depth: no test can initialize a provider client even if it calls
# a chatbot endpoint or mutates the module-level API-key value.
chatbot_routes.GROQ_API_KEY = ""
chatbot_routes.groq_client = None
chatbot_routes.get_groq_client = lambda: None


def _restore_process_state() -> None:
    """Restore process-global state changed to import the production app safely."""
    global _PROCESS_STATE_RESTORED
    if _PROCESS_STATE_RESTORED:
        return
    _PROCESS_STATE_RESTORED = True

    chatbot_routes.get_groq_client = _ORIGINAL_GET_GROQ_CLIENT
    chatbot_routes.GROQ_API_KEY = _ORIGINAL_GROQ_API_KEY
    chatbot_routes.groq_client = _ORIGINAL_GROQ_CLIENT
    dotenv.load_dotenv = _ORIGINAL_LOAD_DOTENV

    for key, original_value in _ORIGINAL_ENV.items():
        if original_value is _MISSING:
            os.environ.pop(key, None)
        else:
            os.environ[key] = original_value

    if _ADDED_BACKEND_PATH:
        try:
            sys.path.remove(BACKEND_PATH)
        except ValueError:
            pass
    atexit.unregister(_restore_process_state)


atexit.register(_restore_process_state)


def pytest_unconfigure(config) -> None:
    """Restore environment, dotenv, provider, and import-path mutations."""
    _restore_process_state()


@pytest.fixture(autouse=True)
def _reset_rag_index():
    """The material index is process-cached; clear it around every test so an
    index built from one test's database can never leak into another."""
    chatbot_routes.reset_rag_index()
    yield
    chatbot_routes.reset_rag_index()


@pytest.fixture
def session_factory():
    """Create a fresh single-connection SQLite database for every test."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session = sessionmaker(
        bind=engine,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
    models.Base.metadata.create_all(bind=engine)

    try:
        yield testing_session
    finally:
        models.Base.metadata.drop_all(bind=engine)
        engine.dispose()


@pytest.fixture
def seeded_data(session_factory) -> dict[str, object]:
    """Seed stable P1-ready identities, ownership, and access boundaries."""
    admin = models.User(
        id=1,
        name="Test Admin",
        email="admin@test.invalid",
        password_hash=auth.hash_password(KNOWN_TEST_PASSWORD),
        role="admin",
    )
    lecturers = (
        models.User(
            id=101,
            name="Lecturer One",
            email="lecturer1@test.invalid",
            password_hash=auth.hash_password(KNOWN_TEST_PASSWORD),
            role="lecturer",
        ),
        models.User(
            id=102,
            name="Lecturer Two",
            email="lecturer2@test.invalid",
            password_hash=auth.hash_password(KNOWN_TEST_PASSWORD),
            role="lecturer",
        ),
    )
    students = (
        models.User(
            id=201,
            name="Student One",
            email="student1@test.invalid",
            password_hash=auth.hash_password(KNOWN_TEST_PASSWORD),
            role="student",
        ),
        models.User(
            id=202,
            name="Student Two",
            email="student2@test.invalid",
            password_hash=auth.hash_password(KNOWN_TEST_PASSWORD),
            role="student",
        ),
    )
    courses = (
        models.Course(
            id=301,
            name="Fixture Course One",
            code="TEST301",
            lecturer_id=lecturers[0].id,
        ),
        models.Course(
            id=302,
            name="Fixture Course Two",
            code="TEST302",
            lecturer_id=lecturers[1].id,
        ),
    )
    # Each student is enrolled in one course and deliberately not enrolled in
    # the other, providing both positive and negative P1 access cases.
    enrollments = (
        models.Enrollment(
            id=401,
            student_id=students[0].id,
            course_id=courses[0].id,
            semester="P1-TEST",
            status="active",
        ),
        models.Enrollment(
            id=402,
            student_id=students[1].id,
            course_id=courses[1].id,
            semester="P1-TEST",
            status="active",
        ),
    )

    with session_factory() as session:
        session.add_all((admin, *lecturers, *students, *courses, *enrollments))
        session.commit()
        session.expunge_all()

    return {
        "admin": admin,
        "lecturers": lecturers,
        "students": students,
        "courses": courses,
        "enrollments": enrollments,
    }


@pytest.fixture
def admin(seeded_data: dict[str, object]) -> models.User:
    return seeded_data["admin"]


@pytest.fixture
def lecturers(seeded_data: dict[str, object]) -> tuple[models.User, models.User]:
    return seeded_data["lecturers"]


@pytest.fixture
def students(seeded_data: dict[str, object]) -> tuple[models.User, models.User]:
    return seeded_data["students"]


@pytest.fixture
def courses(seeded_data: dict[str, object]) -> tuple[models.Course, models.Course]:
    return seeded_data["courses"]


@pytest.fixture
def enrollments(seeded_data: dict[str, object]) -> tuple[models.Enrollment, ...]:
    return seeded_data["enrollments"]


@pytest.fixture
def known_password() -> str:
    return KNOWN_TEST_PASSWORD


@pytest.fixture
def client(session_factory, seeded_data: dict[str, object]):
    """Use a new SQLAlchemy Session for every dependency resolution/request."""
    def override_get_db():
        session = session_factory()
        try:
            yield session
        finally:
            session.close()

    previous_override = production_app.dependency_overrides.get(
        database.get_db, _MISSING
    )
    test_client = None
    try:
        production_app.dependency_overrides[database.get_db] = override_get_db
        # Avoid the context manager so production lifespan/model loading does
        # not run. Requests still exercise the real app and routers.
        test_client = TestClient(production_app)
        yield test_client
    finally:
        try:
            if test_client is not None:
                test_client.close()
        finally:
            if previous_override is _MISSING:
                production_app.dependency_overrides.pop(database.get_db, None)
            else:
                production_app.dependency_overrides[database.get_db] = (
                    previous_override
                )


@pytest.fixture
def auth_headers() -> Callable[[models.User], dict[str, str]]:
    def build(user: models.User) -> dict[str, str]:
        token = auth.create_access_token(
            {"sub": str(user.id), "role": user.role}
        )
        return {"Authorization": f"Bearer {token}"}

    return build
