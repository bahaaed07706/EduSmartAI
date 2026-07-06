# routes/student_routes.py - مسارات الطالب
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, get_student
import models
import schemas

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/me")
def get_my_profile(current_user: models.User = Depends(get_student), db: Session = Depends(get_db)):
    """الحصول على معلومات الطالب"""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role
    }


@router.get("/me/courses")
def get_my_courses(current_user: models.User = Depends(get_student), db: Session = Depends(get_db)):
    """الحصول على مقررات الطالب"""
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id
    ).all()
    
    courses = []
    for enrollment in enrollments:
        course = db.query(models.Course).filter(models.Course.id == enrollment.course_id).first()
        if course:
            lecturer_name = None
            if course.lecturer_id:
                lecturer = db.query(models.User).filter(models.User.id == course.lecturer_id).first()
                lecturer_name = lecturer.name if lecturer else None
            
            courses.append({
                "id": course.id,
                "name": course.name,
                "code": course.code,
                "description": course.description,
                "lecturer_name": lecturer_name,
                "enrollment_status": enrollment.status
            })
    
    return courses


@router.get("/me/courses/{course_id}")
def get_course_details(
    course_id: int,
    current_user: models.User = Depends(get_student),
    db: Session = Depends(get_db)
):
    """تفاصيل مقرر معين"""
    # التحقق من تسجيل الطالب
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    
    # الدرجات
    grades = db.query(models.Grade).filter(
        models.Grade.student_id == current_user.id,
        models.Grade.course_id == course_id
    ).all()
    
    # الحضور
    attendances = db.query(models.Attendance).filter(
        models.Attendance.student_id == current_user.id,
        models.Attendance.course_id == course_id
    ).all()
    
    return {
        "course": {
            "id": course.id,
            "name": course.name,
            "code": course.code
        },
        "grades": [
            {"type": g.assessment_type, "score": g.score, "max": g.max_score}
            for g in grades
        ],
        "attendance": [
            {"date": str(a.date), "status": a.status}
            for a in attendances
        ]
    }


@router.get("/me/features/{course_id}")
def get_my_features(
    course_id: int,
    current_user: models.User = Depends(get_student),
    db: Session = Depends(get_db)
):
    """الحصول على خصائص الطالب ونتيجة التنبؤ لمقرر معين"""
    features = db.query(models.StudentFeature).filter(
        models.StudentFeature.student_id == current_user.id,
        models.StudentFeature.course_id == course_id
    ).first()
    
    if not features:
        return {"message": "No features available yet", "features": None, "prediction": None, "axi_prediction": None}
    
    # Behavior data is stored in User model
    return {
        "features": {
            "num_of_prev_attempts": features.num_of_prev_attempts,
            "weighted_grade": features.weighted_grade,
            "pass_rate": features.pass_rate,
            "score_tma": features.score_tma,
            "score_cma": features.score_cma,
            "sum_click": features.sum_click,
            "date": features.date
        },
        "oulad_prediction": {
            "result": "Success" if features.prediction == 1 else "Failure" if features.prediction == 0 else None,
            "result_ar": "ناجح" if features.prediction == 1 else "معرض للخطر" if features.prediction == 0 else None,
            "probability": features.prediction_probability
        },
        "axi_prediction": {
            "level": features.axi_prediction,
            "level_ar": "مرتفع" if features.axi_prediction == "H" else "متوسط" if features.axi_prediction == "M" else "منخفض" if features.axi_prediction == "L" else None,
            "prob_l": features.axi_probability_l,
            "prob_m": features.axi_probability_m,
            "prob_h": features.axi_probability_h
        } if features.axi_prediction else None,
        # AXI behavior data from StudentFeature (course-specific)
        "behavior": {
            "raised_hands": features.raised_hands,
            "visited_resources": features.visited_resources,
            "announcements_view": features.announcements_view,
            "discussion": features.discussion,
            "absence_days": features.absence_days,
            "parent_satisfaction": features.parent_satisfaction
        }
    }


@router.get("/me/semesters")
def get_my_semesters(current_user: models.User = Depends(get_student), db: Session = Depends(get_db)):
    """الحصول على الفصول الدراسية"""
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id
    ).all()
    
    semester_set = list(set([e.semester for e in enrollments]))
    
    # Return proper semester objects with IDs
    semesters = []
    for i, sem in enumerate(semester_set):
        parts = sem.split("-") if sem else ["2024", "1"]
        year = parts[0] if len(parts) > 0 else "2024"
        term = parts[1] if len(parts) > 1 else "1"
        name = "Fall" if term == "1" else "Spring" if term == "2" else f"Term {term}"
        semesters.append({
            "id": i + 1,
            "name": name,
            "year": int(year),
            "label": f"{name} {year}"
        })
    
    return semesters if semesters else [{"id": 1, "name": "Fall", "year": 2024, "label": "Fall 2024"}]


@router.get("/me/semesters/current")
def get_current_semester(current_user: models.User = Depends(get_student)):
    """الفصل الدراسي الحالي"""
    return {"id": 1, "name": "Spring", "year": 2025, "is_current": True}


@router.get("/me/courses/{course_id}/materials")
def get_course_materials(
    course_id: int,
    current_user: models.User = Depends(get_student),
    db: Session = Depends(get_db)
):
    """الحصول على مواد المقرر"""
    # التحقق من التسجيل
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    materials = db.query(models.CourseMaterial).filter(
        models.CourseMaterial.course_id == course_id
    ).all()
    
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "file_url": m.file_url,
            "created_at": str(m.created_at) if m.created_at else None
        }
        for m in materials
    ]


# ============ Missing Endpoints for Frontend ============

@router.get("/me/courses/{course_id}/grades-summary")
def get_course_grades_summary(
    course_id: int,
    current_user: models.User = Depends(get_student),
    db: Session = Depends(get_db)
):
    """ملخص درجات الطالب في مقرر معين - متوافق مع Frontend"""
    # التحقق من التسجيل
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    # جمع الدرجات
    grades = db.query(models.Grade).filter(
        models.Grade.student_id == current_user.id,
        models.Grade.course_id == course_id
    ).all()
    
    # Get features for AI predictions
    features = db.query(models.StudentFeature).filter(
        models.StudentFeature.student_id == current_user.id,
        models.StudentFeature.course_id == course_id
    ).first()
    
    # Calculate grades for frontend (mid_term, participation, final_exam, total)
    mid_term = None
    participation = None
    final_exam = None
    
    for g in grades:
        if g.assessment_type.lower() in ['midterm', 'mid', 'exam1']:
            mid_term = g.score
        elif g.assessment_type.lower() in ['participation', 'class', 'activity']:
            participation = g.score
        elif g.assessment_type.lower() in ['final', 'exam', 'final_exam']:
            final_exam = g.score
    
    # If we have features, use those values
    if features:
        if features.score_tma and mid_term is None:
            mid_term = features.score_tma
        if features.score_cma and participation is None:
            participation = features.score_cma
    
    # Calculate total
    total = 0
    if mid_term:
        total += mid_term * 0.3
    if participation:
        total += participation * 0.3
    if final_exam:
        total += final_exam * 0.4
    
    return {
        "course_id": course_id,
        # Frontend expected fields
        "mid_term_grade": mid_term,
        "participation_grade": participation,
        "final_exam_grade": final_exam,
        "total_grade": round(total, 2) if total else None,
        # Original grade list
        "grades": [
            {"type": g.assessment_type, "score": g.score, "max_score": g.max_score, "weight": g.weight}
            for g in grades
        ],
        "grades_count": len(grades),
        # AI Features from teacher
        "features": {
            "weighted_grade": features.weighted_grade if features else None,
            "pass_rate": features.pass_rate if features else None,
            "score_tma": features.score_tma if features else None,
            "score_cma": features.score_cma if features else None,
            "sum_click": features.sum_click if features else None
        } if features else None,
        # OULAD Prediction
        "oulad_prediction": {
            "result": "Success" if features and features.prediction == 1 else "Failure" if features and features.prediction == 0 else None,
            "result_ar": "ناجح" if features and features.prediction == 1 else "معرض للخطر" if features and features.prediction == 0 else None,
            "probability": features.prediction_probability if features else None
        } if features else None,
        # AXI Prediction
        "axi_prediction": {
            "level": features.axi_prediction if features else None,
            "level_ar": "مرتفع" if features and features.axi_prediction == "H" else "متوسط" if features and features.axi_prediction == "M" else "منخفض" if features and features.axi_prediction == "L" else None,
            "prob_l": features.axi_probability_l if features else None,
            "prob_m": features.axi_probability_m if features else None,
            "prob_h": features.axi_probability_h if features else None
        } if features else None
    }


@router.get("/me/courses/{course_id}/assessments")
def get_course_assessments(
    course_id: int,
    current_user: models.User = Depends(get_student),
    db: Session = Depends(get_db)
):
    """قائمة التقييمات للطالب في مقرر معين"""
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    # جمع الدرجات كتقييمات
    grades = db.query(models.Grade).filter(
        models.Grade.student_id == current_user.id,
        models.Grade.course_id == course_id
    ).all()
    
    return [
        {
            "id": g.id,
            "type": g.assessment_type,
            "title": f"{g.assessment_type} Assessment",
            "score": g.score,
            "max_score": g.max_score,
            "submitted": True,
            "graded": True,
            "created_at": str(g.created_at) if g.created_at else None
        }
        for g in grades
    ]


@router.get("/me/courses/{course_id}/attendance")
def get_course_attendance(
    course_id: int,
    current_user: models.User = Depends(get_student),
    db: Session = Depends(get_db)
):
    """سجل حضور الطالب في مقرر معين"""
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Not enrolled in this course")
    
    attendances = db.query(models.Attendance).filter(
        models.Attendance.student_id == current_user.id,
        models.Attendance.course_id == course_id
    ).all()
    
    present = sum(1 for a in attendances if a.status == "present")
    total = len(attendances) if attendances else 0
    
    return {
        "course_id": course_id,
        "records": [
            {"date": str(a.date), "status": a.status}
            for a in attendances
        ],
        "summary": {
            "total_classes": total,
            "present": present,
            "absent": total - present,
            "attendance_rate": round((present / total * 100), 2) if total > 0 else 100
        }
    }
