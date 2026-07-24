# routes/admin_routes.py - مسارات المشرف مع بيانات كاملة
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_admin, hash_password
import models
import schemas

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/users")
def get_all_users(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """جميع المستخدمين مع بيانات كاملة"""
    users = db.query(models.User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "age": u.age,
            "gender": u.gender,
            "city": u.city,
            "university": u.university,
            "specialization": u.specialization
        }
        for u in users
    ]


@router.get("/users/students")
def get_all_students(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """جميع الطلاب مع بياناتهم الكاملة وتنبؤاتهم"""
    students = db.query(models.User).filter(models.User.role == "student").all()
    result = []
    for s in students:
        # Get enrollments
        enrollments = db.query(models.Enrollment).filter(
            models.Enrollment.student_id == s.id
        ).all()
        
        courses_info = []
        for e in enrollments:
            course = db.query(models.Course).filter(models.Course.id == e.course_id).first()
            features = db.query(models.StudentFeature).filter(
                models.StudentFeature.student_id == s.id,
                models.StudentFeature.course_id == e.course_id
            ).first()
            
            lecturer_name = None
            if course and course.lecturer_id:
                lecturer = db.query(models.User).filter(models.User.id == course.lecturer_id).first()
                lecturer_name = lecturer.name if lecturer else None
            
            courses_info.append({
                "course_id": course.id if course else None,
                "course_name": course.name if course else None,
                "lecturer_name": lecturer_name,
                "oulad_prediction": features.prediction if features else None,
                "axi_prediction": features.axi_prediction if features else None,
                "weighted_grade": features.weighted_grade if features else None
            })
        
        result.append({
            "id": s.id,
            "name": s.name,
            "email": s.email,
            "age": s.age,
            "gender": "ذكر" if s.gender == "male" else "أنثى" if s.gender == "female" else None,
            "city": s.city,
            "specialization": s.specialization,
            "academic_year": s.academic_year,
            "courses": courses_info
        })
    return result


@router.get("/users/lecturers")
def get_all_lecturers(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """جميع المعلمين مع مقرراتهم وعدد طلابهم"""
    lecturers = db.query(models.User).filter(models.User.role == "lecturer").all()
    result = []
    for l in lecturers:
        courses = db.query(models.Course).filter(models.Course.lecturer_id == l.id).all()
        
        courses_info = []
        total_students = 0
        for c in courses:
            student_count = db.query(models.Enrollment).filter(
                models.Enrollment.course_id == c.id
            ).count()
            total_students += student_count
            
            # Count at-risk students
            at_risk = db.query(models.StudentFeature).filter(
                models.StudentFeature.course_id == c.id,
                models.StudentFeature.prediction == 0
            ).count()
            
            courses_info.append({
                "id": c.id,
                "name": c.name,
                "code": c.code,
                "student_count": student_count,
                "at_risk_count": at_risk
            })
        
        result.append({
            "id": l.id,
            "name": l.name,
            "email": l.email,
            "specialization": l.specialization,
            "department": l.department,
            "city": l.city,
            "courses": courses_info,
            "total_students": total_students
        })
    return result


@router.post("/users")
def create_user(user_data: schemas.UserCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """إنشاء مستخدم جديد"""
    # التحقق من عدم وجود الإيميل
    existing = db.query(models.User).filter(models.User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    new_user = models.User(
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created", "id": new_user.id}


@router.delete("/users/{user_id}")
def delete_user(user_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """حذف مستخدم"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


# NOTE: GET/POST /admin/courses are now served by admin_crud_routes.py with the
# normalized rich shape the frontend expects (course_code, department_id,
# semester_id, days_and_times, …). The older minimal versions were removed to
# avoid a route collision.


@router.post("/enrollments")
def enroll_student(enrollment_data: schemas.EnrollmentCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """تسجيل طالب في مقرر"""
    # التحقق من وجود الطالب والمقرر
    student = db.query(models.User).filter(
        models.User.id == enrollment_data.student_id,
        models.User.role == "student"
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    course = db.query(models.Course).filter(models.Course.id == enrollment_data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # التحقق من عدم التكرار
    existing = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == enrollment_data.student_id,
        models.Enrollment.course_id == enrollment_data.course_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled")
    
    new_enrollment = models.Enrollment(
        student_id=enrollment_data.student_id,
        course_id=enrollment_data.course_id,
        semester=enrollment_data.semester
    )
    db.add(new_enrollment)
    db.commit()
    
    return {"message": "Student enrolled"}


@router.get("/stats")
def get_stats(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """إحصائيات النظام"""
    return {
        "total_students": db.query(models.User).filter(models.User.role == "student").count(),
        "total_lecturers": db.query(models.User).filter(models.User.role == "lecturer").count(),
        "total_courses": db.query(models.Course).count(),
        "total_enrollments": db.query(models.Enrollment).count()
    }
