# routes/lecturer_routes.py - مسارات المعلم الكاملة المتوافقة مع Frontend
"""
Complete lecturer routes matching frontend lecturerApi.js expectations:
- /lecturers/me, /lecturers/me/profile
- /lecturers/me/semesters, /lecturers/me/semesters/current
- /lecturers/me/courses, /lecturers/courses/{id}/students
- /lecturers/courses/{id}/overview, /lecturers/courses/{id}/grades
- Plus all existing functionality
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from database import get_db
from auth import get_lecturer
import models
import schemas

router = APIRouter(prefix="/lecturers", tags=["Lecturers"])


# ============ Profile Endpoints ============

@router.get("/me")
def get_my_info(current_user: models.User = Depends(get_lecturer)):
    """معلومات المعلم الأساسية"""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "age": current_user.age,
        "gender": current_user.gender,
        "phone": current_user.phone,
        "city": current_user.city,
        "university": current_user.university,
        "department": current_user.department,
        "specialization": current_user.specialization
    }


@router.get("/me/profile")
def get_my_profile(current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    """معلومات المعلم الكاملة مع المقررات - للـ Frontend"""
    courses = db.query(models.Course).filter(
        models.Course.lecturer_id == current_user.id
    ).all()
    
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "age": current_user.age,
        "gender": current_user.gender,
        "phone": current_user.phone,
        "city": current_user.city,
        "university": current_user.university,
        "department": current_user.department,
        "specialization": current_user.specialization,
        "courses": [{"id": c.id, "name": c.name, "code": c.code} for c in courses],
        "total_courses": len(courses)
    }


# ============ Semester Endpoints ============

@router.get("/me/semesters")
def get_my_semesters(current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    """الفصول الدراسية للمعلم"""
    courses = db.query(models.Course).filter(
        models.Course.lecturer_id == current_user.id
    ).all()
    
    course_ids = [c.id for c in courses]
    
    if not course_ids:
        return []
    
    semesters_query = db.query(models.Enrollment.semester).filter(
        models.Enrollment.course_id.in_(course_ids)
    ).distinct().all()
    
    semesters = []
    for idx, (sem,) in enumerate(semesters_query):
        semesters.append({
            "id": idx + 1,
            "name": sem,
            "label": sem
        })
    
    # Add default semester if none found
    if not semesters:
        semesters = [
            {"id": 1, "name": "Fall 2024", "label": "Fall 2024"},
            {"id": 2, "name": "Spring 2025", "label": "Spring 2025"}
        ]
    
    return semesters


@router.get("/me/semesters/current")
def get_current_semester(current_user: models.User = Depends(get_lecturer)):
    """الفصل الدراسي الحالي"""
    return {"id": 1, "name": "Fall 2024", "label": "Fall 2024", "is_current": True}


# ============ Courses Endpoints ============

@router.get("/me/courses")
def get_my_courses(
    semester_id: Optional[int] = None,
    current_user: models.User = Depends(get_lecturer), 
    db: Session = Depends(get_db)
):
    """مقررات المعلم مع إحصائيات"""
    courses = db.query(models.Course).filter(
        models.Course.lecturer_id == current_user.id
    ).all()
    
    result = []
    for course in courses:
        enrollments = db.query(models.Enrollment).filter(
            models.Enrollment.course_id == course.id
        ).all()
        
        at_risk = 0
        success = 0
        for e in enrollments:
            features = db.query(models.StudentFeature).filter(
                models.StudentFeature.student_id == e.student_id,
                models.StudentFeature.course_id == course.id
            ).first()
            if features and features.prediction == 1:
                success += 1
            elif features and features.prediction == 0:
                at_risk += 1
        
        result.append({
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "department": course.department,
            "credit_hours": course.credit_hours,
            "description": course.description,
            "student_count": len(enrollments),
            "at_risk_count": at_risk,
            "success_count": success
        })
    
    return result


@router.get("/courses/{course_id}/overview")
def get_course_overview(
    course_id: int,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """نظرة عامة على المقرر"""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id
    ).all()
    
    at_risk = 0
    success = 0
    total_grade = 0
    count = 0
    
    for e in enrollments:
        features = db.query(models.StudentFeature).filter(
            models.StudentFeature.student_id == e.student_id,
            models.StudentFeature.course_id == course_id
        ).first()
        if features:
            if features.prediction == 1:
                success += 1
            else:
                at_risk += 1
            if features.weighted_grade:
                total_grade += features.weighted_grade
                count += 1
    
    return {
        "course": {"id": course.id, "name": course.name, "code": course.code},
        "students_count": len(enrollments),
        "at_risk_count": at_risk,
        "success_count": success,
        "average_grade": total_grade / count if count > 0 else 0
    }


@router.get("/courses/{course_id}/students")
def get_course_students(
    course_id: int,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """قائمة طلاب المقرر مع بيانات كاملة - للـ Frontend"""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id
    ).all()
    
    students = []
    for enrollment in enrollments:
        student = db.query(models.User).filter(models.User.id == enrollment.student_id).first()
        if student:
            features = db.query(models.StudentFeature).filter(
                models.StudentFeature.student_id == student.id,
                models.StudentFeature.course_id == course_id
            ).first()
            
            students.append({
                "id": student.id,
                "name": student.name,
                "email": student.email,
                "age": student.age,
                "gender": "ذكر" if student.gender == "male" else "أنثى" if student.gender == "female" else None,
                "city": student.city,
                "phone": student.phone,
                "specialization": student.specialization,
                "academic_year": student.academic_year,
                "enrollment_status": enrollment.status,
                "features": {
                    "weighted_grade": features.weighted_grade if features else None,
                    "pass_rate": features.pass_rate if features else None,
                    "score_tma": features.score_tma if features else None,
                    "score_cma": features.score_cma if features else None,
                    "sum_click": features.sum_click if features else None
                } if features else None,
                "oulad_prediction": {
                    "result": "ناجح" if features.prediction == 1 else "معرض للخطر" if features.prediction == 0 else None,
                    "probability": features.prediction_probability
                } if features else None,
                "axi_prediction": {
                    "level": features.axi_prediction,
                    "level_ar": "مرتفع" if features.axi_prediction == "H" else "متوسط" if features.axi_prediction == "M" else "منخفض" if features.axi_prediction == "L" else None,
                    "prob_l": features.axi_probability_l,
                    "prob_m": features.axi_probability_m,
                    "prob_h": features.axi_probability_h
                } if features else None,
                "behavior": {
                    "raised_hands": features.raised_hands if features else None,
                    "visited_resources": features.visited_resources if features else None,
                    "announcements_view": features.announcements_view if features else None,
                    "discussion": features.discussion if features else None,
                    "absence_days": features.absence_days if features else None,
                    "parent_satisfaction": features.parent_satisfaction if features else None
                } if features else None
            })
    
    return students


@router.get("/courses/{course_id}/grades")
def get_course_grades(
    course_id: int,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """درجات طلاب المقرر"""
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id
    ).all()
    
    grades_list = []
    for enrollment in enrollments:
        student = db.query(models.User).filter(models.User.id == enrollment.student_id).first()
        if student:
            grades = db.query(models.Grade).filter(
                models.Grade.student_id == student.id,
                models.Grade.course_id == course_id
            ).all()
            
            features = db.query(models.StudentFeature).filter(
                models.StudentFeature.student_id == student.id,
                models.StudentFeature.course_id == course_id
            ).first()
            
            grades_list.append({
                "student_id": student.id,
                "student_name": student.name,
                "grades": [{"type": g.assessment_type, "score": g.score, "max": g.max_score} for g in grades],
                "weighted_grade": features.weighted_grade if features else None,
                "prediction": "ناجح" if features and features.prediction == 1 else "معرض للخطر" if features and features.prediction == 0 else None
            })
    
    return grades_list


# ============ Legacy Endpoints (me/courses/{id}/...) ============

@router.get("/me/courses/{course_id}/students")
def get_my_course_students(
    course_id: int,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """قائمة طلاب المقرر - Legacy endpoint"""
    return get_course_students(course_id, current_user, db)


@router.post("/me/courses/{course_id}/students/{student_id}/features")
def update_student_features(
    course_id: int,
    student_id: int,
    features: schemas.StudentFeatureInput,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """تحديث خصائص طالب"""
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == student_id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Student not enrolled")
    
    existing = db.query(models.StudentFeature).filter(
        models.StudentFeature.student_id == student_id,
        models.StudentFeature.course_id == course_id
    ).first()
    
    if existing:
        existing.weighted_grade = features.weighted_grade
        existing.pass_rate = features.pass_rate
        existing.score_tma = features.score_tma
        existing.score_cma = features.score_cma
        existing.sum_click = features.sum_click
    else:
        new_features = models.StudentFeature(
            student_id=student_id,
            course_id=course_id,
            weighted_grade=features.weighted_grade,
            pass_rate=features.pass_rate,
            score_tma=features.score_tma,
            score_cma=features.score_cma,
            sum_click=features.sum_click
        )
        db.add(new_features)
    
    db.commit()
    return {"message": "Features updated"}


@router.post("/me/courses/{course_id}/grades")
def add_grade(
    course_id: int,
    grade_data: schemas.GradeCreate,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """إضافة درجة"""
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    existing = db.query(models.Grade).filter(
        models.Grade.student_id == grade_data.student_id,
        models.Grade.course_id == course_id,
        models.Grade.assessment_type == grade_data.assessment_type
    ).first()
    
    if existing:
        existing.score = grade_data.score
        existing.max_score = grade_data.max_score
        existing.weight = grade_data.weight
    else:
        new_grade = models.Grade(
            student_id=grade_data.student_id,
            course_id=course_id,
            assessment_type=grade_data.assessment_type,
            score=grade_data.score,
            max_score=grade_data.max_score,
            weight=grade_data.weight
        )
        db.add(new_grade)
    
    db.commit()
    return {"message": "Grade saved"}


@router.post("/me/courses/{course_id}/attendance")
def record_attendance(
    course_id: int,
    attendance_data: schemas.AttendanceCreate,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """تسجيل حضور"""
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    existing = db.query(models.Attendance).filter(
        models.Attendance.student_id == attendance_data.student_id,
        models.Attendance.course_id == course_id,
        models.Attendance.date == attendance_data.date
    ).first()
    
    if existing:
        existing.status = attendance_data.status
    else:
        new_attendance = models.Attendance(
            student_id=attendance_data.student_id,
            course_id=course_id,
            date=attendance_data.date,
            status=attendance_data.status
        )
        db.add(new_attendance)
    
    db.commit()
    return {"message": "Attendance recorded"}


@router.post("/me/courses/{course_id}/materials")
def upload_material(
    course_id: int,
    material: schemas.MaterialCreate,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """رفع مادة تعليمية"""
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    new_material = models.CourseMaterial(
        course_id=course_id,
        title=material.title,
        description=material.description,
        file_url=material.file_url,
        content_text=material.content_text,
        uploaded_by=current_user.id
    )
    db.add(new_material)
    db.commit()
    
    return {"message": "Material uploaded", "id": new_material.id}


@router.get("/courses/{course_id}/materials")
def get_course_materials(
    course_id: int,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """مواد المقرر"""
    materials = db.query(models.CourseMaterial).filter(
        models.CourseMaterial.course_id == course_id
    ).all()
    
    return [
        {
            "id": m.id,
            "title": m.title,
            "description": m.description,
            "file_url": m.file_url,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in materials
    ]


# ============ Unified Student Data Entry with AI Predictions ============

@router.post("/courses/{course_id}/students/{student_id}/full-features")
def save_full_features_and_predict(
    course_id: int,
    student_id: int,
    features: schemas.StudentFullFeatureInput,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """
    حفظ جميع خصائص الطالب (OULAD + AXI) وتشغيل التنبؤات
    Endpoint موحد لإدخال البيانات والتنبؤ - للدكتور
    """
    # التحقق من ملكية المقرر
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    # التحقق من تسجيل الطالب
    enrollment = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == student_id,
        models.Enrollment.course_id == course_id
    ).first()
    
    if not enrollment:
        raise HTTPException(status_code=404, detail="Student not enrolled in this course")
    
    # جلب الطالب (للتحقق فقط)
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # === 1. حفظ جميع الخصائص (OULAD + AXI) في جدول StudentFeature - مخصص للمادة ===
    student_feature = db.query(models.StudentFeature).filter(
        models.StudentFeature.student_id == student_id,
        models.StudentFeature.course_id == course_id
    ).first()
    
    if not student_feature:
        student_feature = models.StudentFeature(
            student_id=student_id,
            course_id=course_id
        )
        db.add(student_feature)
    
    # تحديث خصائص OULAD
    student_feature.num_of_prev_attempts = features.num_of_prev_attempts
    student_feature.weighted_grade = features.weighted_grade
    student_feature.pass_rate = features.pass_rate
    student_feature.score_tma = features.score_tma
    student_feature.score_cma = features.score_cma
    student_feature.sum_click = features.sum_click
    student_feature.date = features.days_active
    
    # === 2. تحديث خصائص AXI السلوكية في StudentFeature - مخصصة للمادة ===
    student_feature.raised_hands = features.raised_hands
    student_feature.visited_resources = features.visited_resources
    student_feature.announcements_view = features.announcements_view
    student_feature.discussion = features.discussion
    student_feature.absence_days = features.absence_days
    student_feature.parent_satisfaction = features.parent_satisfaction
    
    # === 3. تشغيل تنبؤ OULAD ===
    oulad_result = None
    try:
        # Import global models (loaded once at startup)
        from routes.prediction_routes import oulad_model, oulad_scaler
        import pandas as pd
        
        if oulad_model is not None:
            # Correct Feature Order (must match training notebook exactly)
            # Training: ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
            input_data = pd.DataFrame([{
                'Weighted_grade': features.weighted_grade,
                'Pass_rate': features.pass_rate,
                'Score_tma': features.score_tma,
                'Score_cma': features.score_cma,
                'Sum_click': features.sum_click,
                'Days_Active': features.days_active,
                'num_of_prev_attempts': features.num_of_prev_attempts
            }])
            
            feature_order = ['Weighted_grade', 'Pass_rate', 'Score_tma', 'Score_cma', 'Sum_click', 'Days_Active', 'num_of_prev_attempts']
            input_data = input_data[feature_order]
            
            # Apply Scaler (CRITICAL FIX)
            if oulad_scaler is not None:
                input_data = pd.DataFrame(oulad_scaler.transform(input_data), columns=feature_order)
            
            prediction = oulad_model.predict(input_data)[0]
            probabilities = oulad_model.predict_proba(input_data)[0]
            prob_success = float(probabilities[1]) if len(probabilities) > 1 else 0.5
            
            student_feature.prediction = int(prediction)
            student_feature.prediction_probability = prob_success
            
            oulad_result = {
                "prediction": int(prediction),
                "label": "Success" if prediction == 1 else "Failure",
                "label_ar": "ناجح" if prediction == 1 else "معرض للخطر",
                "probability": prob_success
            }
        else:
            oulad_result = {"error": "OULAD model not loaded"}
    except Exception as e:
        print(f"OULAD prediction error: {e}")
        oulad_result = {"error": str(e)}
    
    # === 4. تشغيل تنبؤ AXI ===
    axi_result = None
    try:
        import numpy as np
        # Import global models (loaded once at startup)
        from routes.prediction_routes import axi_model, axi_scaler
        
        if axi_model is not None and axi_scaler is not None:
            absence_val = 1 if features.absence_days.strip() == "Above-7" else 0
            satisfaction_val = 1 if features.parent_satisfaction.strip() == "Good" else 0
            
            axi_features = np.array([[
                features.raised_hands,
                features.visited_resources,
                features.announcements_view,
                features.discussion,
                absence_val,
                satisfaction_val
            ]])
            
            features_scaled = axi_scaler.transform(axi_features)
            prediction_probas = axi_model.predict_proba(features_scaled)
            predicted_class_idx = np.argmax(prediction_probas, axis=1)[0]
            
            idx_to_class = {0: 'L', 1: 'M', 2: 'H'}
            idx_to_class_ar = {0: 'منخفض', 1: 'متوسط', 2: 'مرتفع'}
            predicted_label = idx_to_class.get(predicted_class_idx, "Unknown")
            predicted_label_ar = idx_to_class_ar.get(predicted_class_idx, "غير معروف")
            
            # حفظ نتيجة AXI
            student_feature.axi_prediction = predicted_label
            student_feature.axi_probability_l = float(prediction_probas[0][0])
            student_feature.axi_probability_m = float(prediction_probas[0][1])
            student_feature.axi_probability_h = float(prediction_probas[0][2])
            
            axi_result = {
                "prediction": predicted_label,
                "label_ar": predicted_label_ar,
                "probabilities": {
                    "L": float(prediction_probas[0][0]),
                    "M": float(prediction_probas[0][1]),
                    "H": float(prediction_probas[0][2])
                }
            }
        else:
            axi_result = {"error": "AXI model not loaded"}
    except Exception as e:
        print(f"AXI prediction error: {e}")
        axi_result = {"error": str(e)}
    
    # === 5. حفظ جميع التغييرات ===
    db.commit()
    
    return {
        "message": "تم حفظ الخصائص والتنبؤات بنجاح",
        "student_id": student_id,
        "course_id": course_id,
        "features_saved": {
            "oulad": {
                "weighted_grade": features.weighted_grade,
                "pass_rate": features.pass_rate,
                "score_tma": features.score_tma,
                "score_cma": features.score_cma,
                "sum_click": features.sum_click,
                "date": features.days_active,
                "prev_attempts": features.num_of_prev_attempts
            },
            "axi": {
                "raised_hands": features.raised_hands,
                "visited_resources": features.visited_resources,
                "announcements_view": features.announcements_view,
                "discussion": features.discussion,
                "absence_days": features.absence_days,
                "parent_satisfaction": features.parent_satisfaction
            }
        },
        "oulad_prediction": oulad_result,
        "axi_prediction": axi_result
    }


# ============ PDF Upload with Text Extraction ============

from fastapi import UploadFile, File

@router.post("/courses/{course_id}/materials/upload-pdf")
async def upload_course_pdf(
    course_id: int,
    file: UploadFile = File(...),
    title: str = None,
    description: str = None,
    current_user: models.User = Depends(get_lecturer),
    db: Session = Depends(get_db)
):
    """
    رفع ملف PDF واستخراج النص منه للشات بوت
    Upload PDF and extract text for chatbot context
    """
    # التحقق من ملكية المقرر
    course = db.query(models.Course).filter(
        models.Course.id == course_id,
        models.Course.lecturer_id == current_user.id
    ).first()
    
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    
    # التحقق من نوع الملف
    if not file.filename.lower().endswith(('.pdf', '.txt', '.md')):
        raise HTTPException(status_code=400, detail="Only PDF, TXT, and MD files are allowed")
    
    try:
        import os
        from pathlib import Path
        
        # إنشاء مجلد التحميلات
        uploads_dir = Path("uploads/materials")
        uploads_dir.mkdir(parents=True, exist_ok=True)
        
        # حفظ الملف
        file_path = uploads_dir / f"course_{course_id}_{file.filename}"
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        # استخراج النص
        extracted_text = ""
        try:
            from utils.pdf_extractor import extract_text_from_file
            extracted_text = extract_text_from_file(str(file_path))
        except Exception as e:
            extracted_text = f"[Could not extract text: {str(e)}]"
        
        # حفظ المادة في قاعدة البيانات
        material = models.CourseMaterial(
            course_id=course_id,
            title=title or file.filename,
            description=description or f"ملف مرفوع: {file.filename}",
            file_url=str(file_path),
            content_text=extracted_text,
            uploaded_by=current_user.id
        )
        db.add(material)
        db.commit()
        db.refresh(material)
        
        return {
            "message": "تم رفع الملف واستخراج النص بنجاح",
            "material_id": material.id,
            "filename": file.filename,
            "text_length": len(extracted_text),
            "text_preview": extracted_text[:500] + "..." if len(extracted_text) > 500 else extracted_text
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")
