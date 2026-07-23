# routes/admin_crud_routes.py - Normalized Admin CRUD (departments, semesters,
# lecturers, students, courses, enrollments). Response shapes match the existing
# React admin pages exactly (see frontend src/api/adminApi.js + pages/Admin).
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from auth import get_admin, hash_password
import models
import schemas

router = APIRouter(prefix="/admin", tags=["Admin CRUD"])


# ---------- helpers ----------
def _dept_name(db: Session, department_id):
    if not department_id:
        return None
    d = db.query(models.Department).filter(models.Department.id == department_id).first()
    return d.name if d else None


def _email_taken(db: Session, email: str, exclude_id: int | None = None) -> bool:
    q = db.query(models.User).filter(models.User.email == email)
    if exclude_id is not None:
        q = q.filter(models.User.id != exclude_id)
    return q.first() is not None


# ============ Dashboard ============
@router.get("/dashboard")
def admin_dashboard(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    return {
        "departments_count": db.query(models.Department).count(),
        "lecturers_count": db.query(models.User).filter(
            models.User.role == "lecturer", models.User.is_active == 1).count(),
        "students_count": db.query(models.User).filter(
            models.User.role == "student", models.User.is_active == 1).count(),
        "courses_count": db.query(models.Course).filter(models.Course.is_archived == 0).count(),
        "semesters_count": db.query(models.Semester).count(),
    }


# ============ Departments ============
@router.get("/departments")
def list_departments(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.query(models.Department).order_by(models.Department.id).all()
    return [{"id": d.id, "department_id": d.department_id, "name": d.name} for d in rows]


@router.post("/departments", status_code=201)
def create_department(data: schemas.DepartmentCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    if db.query(models.Department).filter(models.Department.department_id == data.department_id).first():
        raise HTTPException(status_code=409, detail="Department code already exists")
    d = models.Department(department_id=data.department_id, name=data.name)
    db.add(d)
    db.commit()
    db.refresh(d)
    return {"id": d.id, "department_id": d.department_id, "name": d.name}


@router.put("/departments/{dept_id}")
def update_department(dept_id: int, data: schemas.DepartmentCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    d = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")
    clash = db.query(models.Department).filter(
        models.Department.department_id == data.department_id, models.Department.id != dept_id
    ).first()
    if clash:
        raise HTTPException(status_code=409, detail="Department code already exists")
    d.department_id = data.department_id
    d.name = data.name
    db.commit()
    return {"id": d.id, "department_id": d.department_id, "name": d.name}


@router.delete("/departments/{dept_id}")
def delete_department(dept_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    d = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Department not found")
    # Both courses and users carry department_id; checking only courses would
    # leave every student in the department pointing at a deleted row.
    courses_in_use = db.query(models.Course).filter(models.Course.department_id == dept_id).count()
    users_in_use = db.query(models.User).filter(models.User.department_id == dept_id).count()
    if courses_in_use or users_in_use:
        raise HTTPException(
            status_code=409,
            detail="Department is still linked to courses or users and cannot be deleted",
        )
    db.delete(d)
    db.commit()
    return {"message": "Department deleted"}


# ============ Semesters ============
@router.get("/semesters")
def list_semesters(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.query(models.Semester).order_by(models.Semester.id).all()
    return [
        {
            "id": s.id, "name": s.name, "year": s.year,
            "start_date": str(s.start_date) if s.start_date else None,
            "end_date": str(s.end_date) if s.end_date else None,
        }
        for s in rows
    ]


@router.post("/semesters", status_code=201)
def create_semester(data: schemas.SemesterCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    s = models.Semester(name=data.name, year=data.year, start_date=data.start_date, end_date=data.end_date)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name, "year": s.year,
            "start_date": str(s.start_date) if s.start_date else None,
            "end_date": str(s.end_date) if s.end_date else None}


@router.put("/semesters/{sem_id}")
def update_semester(sem_id: int, data: schemas.SemesterCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    s = db.query(models.Semester).filter(models.Semester.id == sem_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Semester not found")
    s.name, s.year, s.start_date, s.end_date = data.name, data.year, data.start_date, data.end_date
    db.commit()
    return {"id": s.id, "name": s.name, "year": s.year,
            "start_date": str(s.start_date) if s.start_date else None,
            "end_date": str(s.end_date) if s.end_date else None}


@router.delete("/semesters/{sem_id}")
def delete_semester(sem_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    s = db.query(models.Semester).filter(models.Semester.id == sem_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Semester not found")
    in_use = db.query(models.Course).filter(models.Course.semester_id == sem_id).count()
    if in_use:
        raise HTTPException(status_code=409, detail="Semester is used by courses and cannot be deleted")
    db.delete(s)
    db.commit()
    return {"message": "Semester deleted"}


# ============ Lecturers ============
@router.get("/lecturers")
def list_lecturers(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.query(models.User).filter(
        models.User.role == "lecturer", models.User.is_active == 1
    ).order_by(models.User.id).all()
    return [
        {"id": u.id, "lecturer_id": u.lecturer_number, "name": u.name, "email": u.email,
         "department_id": u.department_id}
        for u in rows
    ]


@router.post("/lecturers", status_code=201)
def create_lecturer(data: schemas.AdminLecturerCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    if _email_taken(db, data.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    u = models.User(
        name=data.name, email=data.email, role="lecturer",
        password_hash=hash_password(data.password),
        lecturer_number=data.lecturer_id, department_id=data.department_id,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return {"id": u.id, "lecturer_id": u.lecturer_number, "name": u.name, "email": u.email,
            "department_id": u.department_id}


@router.put("/lecturers/{user_id}")
def update_lecturer(user_id: int, data: schemas.AdminLecturerUpdate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id, models.User.role == "lecturer").first()
    if not u:
        raise HTTPException(status_code=404, detail="Lecturer not found")
    if _email_taken(db, data.email, exclude_id=user_id):
        raise HTTPException(status_code=409, detail="Email already exists")
    u.name, u.email, u.department_id = data.name, data.email, data.department_id
    if data.password:
        u.password_hash = hash_password(data.password)
    db.commit()
    return {"id": u.id, "lecturer_id": u.lecturer_number, "name": u.name, "email": u.email,
            "department_id": u.department_id}


@router.delete("/lecturers/{user_id}")
def delete_lecturer(user_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """Deactivate a lecturer (SOFT delete). Their courses and history are preserved."""
    u = db.query(models.User).filter(models.User.id == user_id, models.User.role == "lecturer").first()
    if not u:
        raise HTTPException(status_code=404, detail="Lecturer not found")
    u.is_active = 0
    db.commit()
    return {"message": "Lecturer deactivated", "id": u.id, "is_active": False}


# ============ Students ============
def _student_out(db: Session, u: models.User) -> dict:
    return {
        "id": u.id, "student_number": u.student_number, "name": u.name, "email": u.email,
        "gender": u.gender, "department_id": u.department_id, "department_name": _dept_name(db, u.department_id),
        "gpa": u.gpa, "region": u.region, "highest_education": u.highest_education,
    }


@router.get("/students")
def list_students(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.query(models.User).filter(
        models.User.role == "student", models.User.is_active == 1
    ).order_by(models.User.id).all()
    return [_student_out(db, u) for u in rows]


@router.get("/students/search")
def search_students(query: str = "", current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    q = db.query(models.User).filter(models.User.role == "student", models.User.is_active == 1)
    if query:
        like = f"%{query}%"
        q = q.filter(or_(models.User.name.like(like), models.User.email.like(like),
                         models.User.student_number.like(like)))
    rows = q.order_by(models.User.id).limit(50).all()
    return [{"id": u.id, "student_number": u.student_number, "name": u.name, "email": u.email} for u in rows]


@router.get("/students/{user_id}")
def get_student(user_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id, models.User.role == "student").first()
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
    return _student_out(db, u)


@router.post("/students", status_code=201)
def create_student(data: schemas.AdminStudentCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    if _email_taken(db, data.email):
        raise HTTPException(status_code=409, detail="Email already exists")
    u = models.User(
        name=data.name, email=data.email, role="student",
        password_hash=hash_password(data.password),
        student_number=data.student_number, gender=data.gender,
        department_id=data.department_id, gpa=data.gpa, region=data.region,
        highest_education=data.highest_education,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    return _student_out(db, u)


@router.put("/students/{user_id}")
def update_student(user_id: int, data: schemas.AdminStudentUpdate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.id == user_id, models.User.role == "student").first()
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
    if _email_taken(db, data.email, exclude_id=user_id):
        raise HTTPException(status_code=409, detail="Email already exists")
    u.name, u.email, u.gender = data.name, data.email, data.gender
    u.department_id, u.gpa, u.region = data.department_id, data.gpa, data.region
    u.highest_education = data.highest_education
    if data.student_number:
        u.student_number = data.student_number
    db.commit()
    return _student_out(db, u)


@router.delete("/students/{user_id}")
def delete_student(user_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """Deactivate a student (SOFT delete). Historical records are preserved."""
    u = db.query(models.User).filter(models.User.id == user_id, models.User.role == "student").first()
    if not u:
        raise HTTPException(status_code=404, detail="Student not found")
    # SOFT delete: never remove grades/attendance/features/enrollments/VLE.
    u.is_active = 0
    db.commit()
    return {"message": "Student deactivated", "id": u.id, "is_active": False}


# ============ Courses ============
def _course_out(db: Session, c: models.Course) -> dict:
    sem = db.query(models.Semester).filter(models.Semester.id == c.semester_id).first() if c.semester_id else None
    return {
        "id": c.id, "course_code": c.code, "name": c.name,
        "department_id": c.department_id, "lecturer_id": c.lecturer_id, "semester_id": c.semester_id,
        "days_and_times": c.days_and_times,
        "department_name": _dept_name(db, c.department_id),
        "semester_name": sem.name if sem else None,
        "semester_year": sem.year if sem else None,
    }


@router.get("/courses")
def list_courses_full(current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    rows = db.query(models.Course).filter(models.Course.is_archived == 0).order_by(models.Course.id).all()
    return [_course_out(db, c) for c in rows]


@router.post("/courses", status_code=201)
def create_course_full(data: schemas.AdminCourseCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    if db.query(models.Course).filter(models.Course.code == data.course_code).first():
        raise HTTPException(status_code=409, detail="Course code already exists")
    c = models.Course(
        code=data.course_code, name=data.name, department_id=data.department_id,
        lecturer_id=data.lecturer_id, semester_id=data.semester_id, days_and_times=data.days_and_times,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _course_out(db, c)


@router.put("/courses/{course_id}")
def update_course_full(course_id: int, data: schemas.AdminCourseCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    clash = db.query(models.Course).filter(models.Course.code == data.course_code, models.Course.id != course_id).first()
    if clash:
        raise HTTPException(status_code=409, detail="Course code already exists")
    c.code, c.name = data.course_code, data.name
    c.department_id, c.lecturer_id, c.semester_id = data.department_id, data.lecturer_id, data.semester_id
    c.days_and_times = data.days_and_times
    db.commit()
    return _course_out(db, c)


@router.delete("/courses/{course_id}")
def delete_course_full(course_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    """Archive a course (SOFT delete). Enrollments/grades/attendance are preserved."""
    c = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Course not found")
    c.is_archived = 1
    db.commit()
    return {"message": "Course archived", "id": c.id, "is_archived": True}


# ============ Enrollments (per course) ============
@router.get("/courses/{course_id}/enrollments")
def list_course_enrollments(course_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    rows = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == course_id,
        models.Enrollment.status != "withdrawn",
    ).all()
    out = []
    for e in rows:
        s = db.query(models.User).filter(models.User.id == e.student_id).first()
        out.append({
            "id": e.id, "student_id": e.student_id, "final_grade": e.final_grade,
            "student": {"student_number": s.student_number, "name": s.name, "email": s.email} if s else None,
        })
    return out


@router.post("/courses/{course_id}/enrollments", status_code=201)
def add_course_enrollment(course_id: int, data: schemas.AdminEnrollmentCreate, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    course = db.query(models.Course).filter(models.Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    student = db.query(models.User).filter(models.User.id == data.student_id, models.User.role == "student").first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    exists = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == data.student_id, models.Enrollment.course_id == course_id
    ).first()
    if exists:
        if exists.status == "withdrawn":
            # Reactivate a previously withdrawn enrollment (preserves final_grade).
            exists.status = "active"
            db.commit()
            db.refresh(exists)
            return {"id": exists.id, "student_id": exists.student_id, "final_grade": exists.final_grade,
                    "student": {"student_number": student.student_number, "name": student.name, "email": student.email}}
        raise HTTPException(status_code=409, detail="Student already enrolled")
    e = models.Enrollment(
        student_id=data.student_id, course_id=course_id,
        semester_id=data.semester_id or course.semester_id,
    )
    db.add(e)
    db.commit()
    db.refresh(e)
    return {"id": e.id, "student_id": e.student_id, "final_grade": e.final_grade,
            "student": {"student_number": student.student_number, "name": student.name, "email": student.email}}


@router.delete("/courses/{course_id}/enrollments/{enrollment_id}")
def remove_course_enrollment(course_id: int, enrollment_id: int, current_user: models.User = Depends(get_admin), db: Session = Depends(get_db)):
    e = db.query(models.Enrollment).filter(
        models.Enrollment.id == enrollment_id, models.Enrollment.course_id == course_id
    ).first()
    if not e:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    # SOFT withdraw: keep the row (and any final_grade) for historical integrity.
    e.status = "withdrawn"
    db.commit()
    return {"message": "Enrollment withdrawn"}
