# main.py - التطبيق الرئيسي
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
from config import CORS_ORIGINS
from database import init_db
from routes import auth_routes, student_routes, lecturer_routes, admin_routes, prediction_routes, chatbot_routes, file_routes, skeleton_routes


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

# Static files for uploads
uploads_path = Path(__file__).parent / "uploads"
if uploads_path.exists():
    app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

# تسجيل المسارات الأساسية
app.include_router(auth_routes.router, prefix="/api/v1")
app.include_router(student_routes.router, prefix="/api/v1")
app.include_router(lecturer_routes.router, prefix="/api/v1")
app.include_router(admin_routes.router, prefix="/api/v1")
app.include_router(prediction_routes.router, prefix="/api/v1")
app.include_router(chatbot_routes.router, prefix="/api/v1")
app.include_router(file_routes.router, prefix="/api/v1")
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
