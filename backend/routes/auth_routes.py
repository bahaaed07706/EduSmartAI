# routes/auth_routes.py - مسارات المصادقة
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from auth import hash_password, verify_password, create_access_token
from schemas import LoginRequest, TokenResponse
import models

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """تسجيل الدخول"""
    user = db.query(models.User).filter(models.User.email == request.email).first()
    
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # إنشاء token
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return TokenResponse(
        access_token=access_token,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
    )


@router.post("/logout")
def logout():
    """تسجيل الخروج (للـ frontend فقط - مسح الـ token)"""
    return {"message": "Logged out successfully"}
