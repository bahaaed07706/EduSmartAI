# main.py - التطبيق الرئيسي
import os
import time
from collections import defaultdict, deque

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path
from config import CORS_ORIGINS
from database import init_db
from routes import auth_routes, student_routes, lecturer_routes, admin_routes, admin_crud_routes, prediction_routes, chatbot_routes, file_routes, notification_routes, quiz_routes, assessment_routes, skeleton_routes


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("Starting EduSmartAI Backend...")
    init_db()
    print("Database initialized")
    
    # Create uploads directory
    uploads_dir = Path(__file__).parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)
    print("Uploads directory ready")
    
    # تحميل موديلات AI
    from routes.prediction_routes import load_models
    load_models()
    
    yield
    
    # Shutdown
    print("Shutting down...")


ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()
IS_PRODUCTION = ENVIRONMENT == "production"

app = FastAPI(
    title="EduSmartAI Backend",
    description="نظام إدارة تعليمي ذكي مع تنبؤات الذكاء الاصطناعي",
    version="2.0.0",
    lifespan=lifespan,
    # The interactive docs enumerate every endpoint and schema. Useful in
    # development, unnecessary attack surface on a public demo.
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)

# CORS. Origins come from the environment; a public deployment must name its
# frontend explicitly rather than falling back to a wildcard.
if IS_PRODUCTION and (not CORS_ORIGINS or "*" in CORS_ORIGINS):
    raise RuntimeError(
        "CORS_ORIGINS must list the exact frontend origin(s) in production. "
        "A wildcard would let any site call this API with credentials."
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------
# Deliberately in-process and dependency-free: this protects a single-instance
# demo from credential stuffing and chatbot cost abuse. It is NOT a substitute
# for an edge limiter, and it does not coordinate across replicas — if this
# service is ever scaled out, move to a shared store.
RATE_LIMITS = {
    "/api/v1/auth/login": (10, 300),      # 10 attempts per 5 minutes
    "/api/v1/chatbot/query": (30, 300),   # 30 questions per 5 minutes
    "/api/v1/files/upload": (20, 3600),   # 20 uploads per hour
}
_DEFAULT_LIMIT = (300, 60)  # everything else: 300 requests/minute

# The test suite drives every request from one client address, so the limiter
# would make unrelated tests fail depending on execution order. Off by default
# under pytest; always on in a deployed environment.
RATE_LIMIT_ENABLED = os.getenv("RATE_LIMIT_ENABLED", "1").strip().lower() not in {"0", "false", "no"}

_hits: dict = defaultdict(deque)


def _client_key(request: Request) -> str:
    """Identify the caller, trusting the platform proxy's forwarded header."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.middleware("http")
async def rate_limit(request: Request, call_next):
    if not RATE_LIMIT_ENABLED:
        return await call_next(request)

    path = request.url.path
    limit, window = RATE_LIMITS.get(path, _DEFAULT_LIMIT)
    key = f"{_client_key(request)}:{path if path in RATE_LIMITS else '*'}"

    now = time.monotonic()
    bucket = _hits[key]
    cutoff = now - window
    while bucket and bucket[0] < cutoff:
        bucket.popleft()

    if len(bucket) >= limit:
        retry_after = int(window - (now - bucket[0])) + 1
        return JSONResponse(
            status_code=429,
            content={"detail": "Too many requests. Please slow down."},
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)
    return await call_next(request)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline hardening headers. The API returns JSON and files only."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if IS_PRODUCTION:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response

# NOTE: Uploaded files are intentionally NOT served via an open static mount.
# They contain course materials and student submissions and must only be
# reachable through the authenticated, ownership-checked download endpoint in
# routes/file_routes.py (GET /api/v1/files/{material_id}/download).

# تسجيل المسارات الأساسية
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(student_routes.router, prefix="/api/v1")
app.include_router(lecturer_routes.router, prefix="/api/v1")
app.include_router(admin_routes.router, prefix="/api/v1")
app.include_router(admin_crud_routes.router, prefix="/api/v1")
app.include_router(prediction_routes.router, prefix="/api/v1")
app.include_router(chatbot_routes.router, prefix="/api/v1")
app.include_router(file_routes.router, prefix="/api/v1")
app.include_router(notification_routes.router, prefix="/api/v1")
app.include_router(quiz_routes.router, prefix="/api/v1")
app.include_router(quiz_routes.student_router, prefix="/api/v1")
app.include_router(assessment_routes.router, prefix="/api/v1")
app.include_router(assessment_routes.student_router, prefix="/api/v1")
app.include_router(skeleton_routes.router, prefix="/api/v1")


@app.get("/")
def root():
    return {"message": "EduSmartAI Backend is running!", "docs": "/docs"}


@app.get("/health")
def health_check():
    """Liveness: the process is up and serving. Cheap enough to poll."""
    return {"status": "healthy", "environment": ENVIRONMENT}


@app.get("/ready")
def readiness_check():
    """Readiness: the dependencies this app cannot serve without actually work.

    A plain 'healthy' string proves only that uvicorn is listening. This
    verifies the database answers a query and the ML artifacts deserialised, so
    a deploy that booted with an unreachable database or missing model files
    fails the platform health check instead of serving 500s.

    Deliberately reports no paths, versions, or configuration — a public
    endpoint should not describe the filesystem or the model internals.
    """
    from sqlalchemy import text

    from database import SessionLocal

    checks = {"database": False, "models": False}

    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
            checks["database"] = True
        finally:
            db.close()
    except Exception as e:
        print(f"[ready] database check failed: {type(e).__name__}")

    try:
        from routes import prediction_routes

        checks["models"] = prediction_routes.oulad_model is not None
    except Exception as e:
        print(f"[ready] model check failed: {type(e).__name__}")

    ready = all(checks.values())
    return JSONResponse(
        status_code=200 if ready else 503,
        content={"status": "ready" if ready else "not_ready", "checks": checks},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
