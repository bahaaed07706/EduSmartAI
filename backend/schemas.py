# schemas.py - Pydantic models للـ API with validation
from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Literal
from datetime import date, datetime


# ============ Auth Schemas ============
class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ============ User Schemas ============
class UserBase(BaseModel):
    name: str
    email: str
    role: str


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# ============ Course Schemas ============
class CourseBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None


class CourseCreate(CourseBase):
    lecturer_id: Optional[int] = None


class CourseResponse(CourseBase):
    id: int
    lecturer_id: Optional[int] = None
    lecturer_name: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============ Enrollment Schemas ============
class EnrollmentCreate(BaseModel):
    student_id: int
    course_id: int
    semester: Optional[str] = "2024-1"


class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    semester: str
    status: str
    
    class Config:
        from_attributes = True


# ============ Grade Schemas ============
class GradeCreate(BaseModel):
    student_id: int
    course_id: int
    assessment_type: str
    score: float
    max_score: Optional[float] = 100.0
    weight: Optional[float] = 1.0


class GradeResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    assessment_type: str
    score: float
    max_score: float
    weight: float
    
    class Config:
        from_attributes = True


# ============ Attendance Schemas ============
class AttendanceCreate(BaseModel):
    student_id: int
    course_id: int
    date: date
    status: str = "present"


class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    date: date
    status: str
    
    class Config:
        from_attributes = True


# ============ Student Features (AI) Schemas ============
class StudentFeatureInput(BaseModel):
    """مدخلات خصائص الطالب للتنبؤ"""
    student_id: int
    course_id: int
    num_of_prev_attempts: int = 0
    # Updated to match model features
    weighted_grade: float = 0.0
    pass_rate: float = 0.0 # Replaces submission_rate in model context usually, or aliased
    score_tma: float = 0.0 # Renamed from tma_avg to match model
    score_cma: float = 0.0 # Renamed from cma_avg
    sum_click: int = 0
    days_active: int = 0  # Maps to 'Date' or 'Days_Active'


class StudentFullFeatureInput(BaseModel):
    """مدخلات كاملة لجميع خصائص الطالب (OULAD + AXI) للتنبؤ"""
    # OULAD Features
    num_of_prev_attempts: int = 0
    weighted_grade: float = 0.0
    pass_rate: float = 0.0
    score_tma: float = 0.0
    score_cma: float = 0.0
    sum_click: int = 0
    days_active: int = 0 # Maps to Date
    
    # AXI Behavioral Features (for behavioral model)
    raised_hands: int = 0
    visited_resources: int = 0
    announcements_view: int = 0
    discussion: int = 0
    absence_days: str = "Under-7"  # "Under-7" or "Above-7"
    parent_satisfaction: str = "Good"  # "Good" or "Bad"


class OuladPredictionInput(BaseModel):
    """Input for OULAD model prediction with validation"""
    num_of_prev_attempts: int = 0
    weighted_grade: float = 0.0
    pass_rate: float = 0.0
    score_tma: float = 0.0
    score_cma: float = 0.0
    sum_click: int = 0
    days_active: int = 0
    
    @field_validator('num_of_prev_attempts')
    @classmethod
    def validate_attempts(cls, v):
        if v < 0 or v > 10:
            raise ValueError('num_of_prev_attempts must be between 0 and 10')
        return v
    
    @field_validator('score_tma', 'score_cma', 'pass_rate')
    @classmethod
    def validate_percentage_fields(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Percentage fields must be between 0 and 100')
        return v
    
    @field_validator('sum_click')
    @classmethod
    def validate_clicks(cls, v):
        if v < 0:
            raise ValueError('sum_click must be non-negative')
        return v


class AXIPredictionInput(BaseModel):
    """Input for AXI behavioral prediction model with validation"""
    raised_hands: int = 0
    visited_resources: int = 0
    announcements_view: int = 0
    discussion: int = 0
    absence_days: Literal["Under-7", "Above-7"] = "Under-7"
    parent_satisfaction: Literal["Good", "Bad"] = "Good"
    
    @field_validator('raised_hands', 'visited_resources', 'announcements_view', 'discussion')
    @classmethod
    def validate_non_negative(cls, v):
        if v < 0:
            raise ValueError('Behavioral counts must be non-negative')
        if v > 200:
            raise ValueError('Behavioral counts cannot exceed 200')
        return v

class OuladRawInput(BaseModel):
    """Raw input for OULAD model that requires server-side processing"""
    # Removed exam_score and exam_weight to prevent data leakage
    # Replaced with aggregated metrics
    weighted_grade: float
    pass_rate: float
    score_tma: float
    score_cma: float
    sum_click: int
    active_days: int        # Maps to 'days_active'
    prev_failures: int      # Maps to 'num_of_prev_attempts'

    @field_validator('score_tma', 'score_cma', 'pass_rate')
    @classmethod
    def validate_percentages(cls, v):
        if v < 0 or v > 100:
            raise ValueError('Percentage fields must be between 0 and 100')
        return v
    
    @field_validator('sum_click', 'active_days', 'prev_failures')
    @classmethod
    def validate_counts(cls, v):
        if v < 0:
            raise ValueError('Counts/Days must be non-negative')
        return v


class PredictionResult(BaseModel):
    """نتيجة التنبؤ"""
    student_id: int
    prediction: int  # 0 = Fail, 1 = Success
    prediction_label: str
    probability: float


# ============ Chatbot Schemas ============
class ChatbotQuery(BaseModel):
    """استعلام الـ Chatbot"""
    message: str
    course_id: Optional[int] = None


class ChatbotResponse(BaseModel):
    """رد الـ Chatbot"""
    answer: str
    suggested_actions: Optional[List[str]] = None
    data: Optional[dict] = None


# ============ Course Material Schemas ============
class MaterialCreate(BaseModel):
    course_id: int
    title: str
    description: Optional[str] = None
    file_url: Optional[str] = None
    content_text: Optional[str] = None


class MaterialResponse(BaseModel):
    id: int
    course_id: int
    title: str
    description: Optional[str]
    file_url: Optional[str]
    created_at: Optional[datetime]
    
    class Config:
        from_attributes = True
