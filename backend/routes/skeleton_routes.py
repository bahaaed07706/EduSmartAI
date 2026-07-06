# routes/skeleton_routes.py - Skeleton Endpoints (لمنع أخطاء 404)
"""
Skeleton endpoints for features not yet fully implemented.
Returns success responses to prevent frontend errors.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from auth import get_current_user, get_admin, get_lecturer
import models

router = APIRouter(tags=["Skeleton Endpoints"])


# ============ Quizzes ============
@router.get("/quizzes")
def get_quizzes(current_user: models.User = Depends(get_current_user)):
    """Get quizzes (placeholder)"""
    return []


@router.get("/quizzes/{quiz_id}")
def get_quiz(quiz_id: int, current_user: models.User = Depends(get_current_user)):
    """Get single quiz (placeholder)"""
    return {"id": quiz_id, "title": "Quiz Coming Soon", "questions": []}


@router.post("/quizzes")
def create_quiz(current_user: models.User = Depends(get_lecturer)):
    """Create quiz (placeholder)"""
    return {"message": "Quiz feature coming soon", "id": 0}


@router.post("/quizzes/{quiz_id}/submit")
def submit_quiz(quiz_id: int, current_user: models.User = Depends(get_current_user)):
    """Submit quiz (placeholder)"""
    return {"message": "Quiz submitted", "score": 0}


# ============ Departments ============
@router.get("/departments")
def get_departments(db: Session = Depends(get_db)):
    """Get departments (placeholder)"""
    return [
        {"id": 1, "name": "Computer Science", "code": "CS"},
        {"id": 2, "name": "Mathematics", "code": "MATH"},
        {"id": 3, "name": "Engineering", "code": "ENG"},
    ]


@router.get("/departments/{dept_id}")
def get_department(dept_id: int):
    """Get single department (placeholder)"""
    return {"id": dept_id, "name": "Department", "code": "DEPT", "courses": []}


# ============ Semesters ============
@router.get("/semesters")
def get_semesters():
    """Get semesters"""
    return [
        {"id": 1, "name": "Fall", "year": 2024},
        {"id": 2, "name": "Spring", "year": 2025},
    ]


@router.get("/semesters/current")
def get_current_semester():
    """Get current semester"""
    return {"id": 2, "name": "Spring", "year": 2025, "is_current": True}


# ============ Notifications ============
@router.get("/notifications")
def get_notifications(current_user: models.User = Depends(get_current_user)):
    """Get notifications (placeholder)"""
    return []


@router.post("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, current_user: models.User = Depends(get_current_user)):
    """Mark notification as read"""
    return {"message": "Marked as read"}


# ============ Assignments ============
@router.get("/assignments")
def get_assignments(current_user: models.User = Depends(get_current_user)):
    """Get assignments (placeholder)"""
    return []


@router.get("/assignments/{assignment_id}")
def get_assignment(assignment_id: int, current_user: models.User = Depends(get_current_user)):
    """Get single assignment (placeholder)"""
    return {"id": assignment_id, "title": "Assignment", "due_date": None, "submitted": False}


# ============ Analytics Export for Power BI ============
@router.get("/admin/analytics_export")
def export_analytics(
    current_user: models.User = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Export all analytics data in JSON format for Power BI.
    Admin only.
    """
    # Users summary
    users = db.query(models.User).all()
    users_data = [
        {"id": u.id, "name": u.name, "role": u.role}
        for u in users
    ]
    
    # Courses summary
    courses = db.query(models.Course).all()
    courses_data = []
    for c in courses:
        enrollment_count = db.query(models.Enrollment).filter(
            models.Enrollment.course_id == c.id
        ).count()
        courses_data.append({
            "id": c.id,
            "name": c.name,
            "code": c.code,
            "lecturer_id": c.lecturer_id,
            "enrollment_count": enrollment_count
        })
    
    # Student performance summary
    students_performance = []
    features = db.query(models.StudentFeature).all()
    for f in features:
        student = db.query(models.User).filter(models.User.id == f.student_id).first()
        course = db.query(models.Course).filter(models.Course.id == f.course_id).first()
        students_performance.append({
            "student_id": f.student_id,
            "student_name": student.name if student else None,
            "course_id": f.course_id,
            "course_name": course.name if course else None,
            "weighted_grade": f.weighted_grade,
            "pass_rate": f.pass_rate,
            "score_tma": f.score_tma,
            "score_cma": f.score_cma,
            "sum_click": f.sum_click,
            "prediction": f.prediction,
            "prediction_probability": f.prediction_probability
        })
    
    # Aggregated stats
    total_students = db.query(models.User).filter(models.User.role == "student").count()
    total_lecturers = db.query(models.User).filter(models.User.role == "lecturer").count()
    at_risk_count = db.query(models.StudentFeature).filter(
        models.StudentFeature.prediction == 0
    ).count()
    success_count = db.query(models.StudentFeature).filter(
        models.StudentFeature.prediction == 1
    ).count()
    
    return {
        "export_timestamp": str(__import__("datetime").datetime.now()),
        "summary": {
            "total_students": total_students,
            "total_lecturers": total_lecturers,
            "total_courses": len(courses_data),
            "at_risk_students": at_risk_count,
            "successful_students": success_count
        },
        "users": users_data,
        "courses": courses_data,
        "student_performance": students_performance
    }


# ============ Health Check ============
@router.get("/health")
def health_check():
    """System health check"""
    return {"status": "healthy", "timestamp": str(__import__("datetime").datetime.now())}
