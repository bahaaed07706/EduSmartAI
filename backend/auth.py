# auth.py - نظام المصادقة JWT
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
import models

# Password hashing (using sha256 to avoid bcrypt UTF-8 issues)
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Bearer token
security = HTTPBearer()


def hash_password(password: str) -> str:
    """تشفير كلمة السر"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """التحقق من كلمة السر"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """إنشاء JWT token"""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    """فك تشفير الـ token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> models.User:
    """الحصول على المستخدم الحالي من الـ token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def require_role(*roles: str):
    """Decorator للتحقق من دور المستخدم"""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {roles}"
            )
        return current_user
    return role_checker


# Shortcuts للأدوار
def get_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_lecturer(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "lecturer":
        raise HTTPException(status_code=403, detail="Lecturer access required")
    return current_user


def get_student(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    return current_user
