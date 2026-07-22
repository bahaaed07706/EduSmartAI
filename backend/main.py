# main.py - التطبيق الرئيسي
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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


app = FastAPI(
    title="EduSmartAI Backend",
    description="نظام إدارة تعليمي ذكي مع تنبؤات الذكاء الاصطناعي",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
