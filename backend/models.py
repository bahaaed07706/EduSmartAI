# models.py - جداول قاعدة البيانات مع بيانات كاملة
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, DateTime, UniqueConstraint, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """جدول المستخدمين - طلاب/معلمين/مشرفين - مع بيانات شخصية كاملة"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # student, lecturer, admin
    
    # بيانات شخصية كاملة
    age = Column(Integer, nullable=True)
    gender = Column(String(10), nullable=True)  # male, female
    phone = Column(String(20), nullable=True)
    city = Column(String(50), nullable=True)  # مدينة السكن
    university = Column(String(100), nullable=True)
    department = Column(String(100), nullable=True)  # القسم (نص قديم - محفوظ للمرجع)
    specialization = Column(String(100), nullable=True)  # التخصص
    academic_year = Column(String(20), nullable=True)  # السنة الدراسية (للطلاب)

    # Normalized academic identity (added additively; old string fields kept)
    student_number = Column(String(30), unique=True, nullable=True)   # e.g. STU0005
    lecturer_number = Column(String(30), unique=True, nullable=True)  # e.g. LEC0002
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    gpa = Column(Float, nullable=True)
    region = Column(String(80), nullable=True)          # student region/city of record
    highest_education = Column(String(80), nullable=True)
    # Soft-delete flag. Deactivated users keep ALL historical records but cannot
    # log in and are hidden from admin lists. Never hard-delete a user.
    is_active = Column(Integer, default=1, nullable=False)

    # NOTE: AXI behavioral fields moved to StudentFeature (per-course tracking)
    # Old fields removed to avoid duplication

    created_at = Column(DateTime, server_default=func.now())
    
    # العلاقات
    courses_teaching = relationship("Course", back_populates="lecturer")
    enrollments = relationship("Enrollment", back_populates="student")
    grades = relationship("Grade", back_populates="student")
    attendances = relationship("Attendance", back_populates="student")


class Course(Base):
    """جدول المقررات"""
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    code = Column(String(20), unique=True, nullable=False)  # exposed to API as course_code
    description = Column(Text, nullable=True)
    credit_hours = Column(Integer, default=3)
    department = Column(String(100), nullable=True)  # legacy string, kept for reference
    lecturer_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Normalized links (added additively)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    days_and_times = Column(Text, nullable=True)  # JSON string e.g. {"mon":"10:00-12:00"}
    # Soft-delete flag. Archived courses keep all enrollments/grades/attendance
    # but are hidden from admin lists. Never hard-delete a course with history.
    is_archived = Column(Integer, default=0, nullable=False)

    # العلاقات
    lecturer = relationship("User", back_populates="courses_teaching")
    enrollments = relationship("Enrollment", back_populates="course")
    grades = relationship("Grade", back_populates="course")
    attendances = relationship("Attendance", back_populates="course")
    materials = relationship("CourseMaterial", back_populates="course")


class Enrollment(Base):
    """جدول تسجيل الطلاب في المقررات"""
    __tablename__ = "enrollments"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester = Column(String(20), default="2024-1")
    status = Column(String(20), default="active")  # active, completed, withdrawn

    # Added additively
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)
    final_grade = Column(Float, nullable=True)

    # منع التكرار: طالب + مقرر فريد
    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', name='uq_student_course'),
    )
    
    # العلاقات
    student = relationship("User", back_populates="enrollments")
    course = relationship("Course", back_populates="enrollments")


class Grade(Base):
    """جدول الدرجات - مع منع التكرار"""
    __tablename__ = "grades"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    assessment_type = Column(String(50), nullable=False)  # TMA, CMA, Exam, Quiz
    score = Column(Float, nullable=False)
    max_score = Column(Float, default=100.0)
    weight = Column(Float, default=1.0)  # وزن الدرجة
    created_at = Column(DateTime, server_default=func.now())
    
    # منع التكرار: طالب + مقرر + نوع التقييم فريد
    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', 'assessment_type', name='uq_student_course_assessment'),
    )
    
    # العلاقات
    student = relationship("User", back_populates="grades")
    course = relationship("Course", back_populates="grades")


class Attendance(Base):
    """جدول الحضور - مع منع التكرار"""
    __tablename__ = "attendances"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(String(20), default="present")  # present, absent, late
    
    # منع التكرار: طالب + مقرر + تاريخ فريد
    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', 'date', name='uq_student_course_date'),
    )
    
    # العلاقات
    student = relationship("User", back_populates="attendances")
    course = relationship("Course", back_populates="attendances")


class CourseMaterial(Base):
    """جدول مواد المقرر - للـ Chatbot"""
    __tablename__ = "course_materials"
    
    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    file_url = Column(String(500), nullable=True)   # legacy single-file link
    files_json = Column(Text, nullable=True)         # JSON array of {file_name, file_url, ...}
    content_text = Column(Text, nullable=True)  # محتوى نصي للـ Chatbot
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # العلاقات
    course = relationship("Course", back_populates="materials")


class StudentFeature(Base):
    """جدول خصائص الطالب للتنبؤ OULAD + AXI - يدخلها المعلم - مرتبط بالمادة"""
    __tablename__ = "student_features"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    
    # خصائص OULAD
    num_of_prev_attempts = Column(Integer, default=0)
    weighted_grade = Column(Float, default=0.0)
    pass_rate = Column(Float, default=0.0)
    score_tma = Column(Float, default=0.0)
    score_cma = Column(Float, default=0.0)
    sum_click = Column(Integer, default=0)
    date = Column(Integer, default=0)
    
    # نتيجة تنبؤ OULAD
    prediction = Column(Integer, nullable=True)  # 0 = Fail, 1 = Success
    prediction_probability = Column(Float, nullable=True)
    
    # نتيجة تنبؤ AXI
    axi_prediction = Column(String(5), nullable=True)  # L, M, H
    axi_probability_l = Column(Float, nullable=True)
    axi_probability_m = Column(Float, nullable=True)
    axi_probability_h = Column(Float, nullable=True)
    
    # خصائص AXI السلوكية - مخصصة للمادة وليست عامة
    raised_hands = Column(Integer, default=0)
    visited_resources = Column(Integer, default=0)
    announcements_view = Column(Integer, default=0)
    discussion = Column(Integer, default=0)
    absence_days = Column(String(20), default="Under-7")  # Under-7 or Above-7
    parent_satisfaction = Column(String(20), default="Good")  # Good or Bad
    
    # منع التكرار
    __table_args__ = (
        UniqueConstraint('student_id', 'course_id', name='uq_student_course_features'),
    )


class StudentVle(Base):
    """جدول تفاعل الطالب مع المواد (VLE) - لحساب Days_Active و Sum_Click"""
    __tablename__ = "student_vle"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    date = Column(Integer, nullable=False)  # اليوم الدراسي (مثلاً -10, 0, 10...)
    sum_click = Column(Integer, default=0)

    # Relationships
    student = relationship("User")
    course = relationship("Course")


class Department(Base):
    """Academic department (normalized). department_id is the human code (CS, IT...)."""
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(String(20), unique=True, nullable=False)  # human code
    name = Column(String(120), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Semester(Base):
    """Academic semester/term."""
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), nullable=False)        # e.g. Fall, Spring
    year = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    is_current = Column(Integer, default=0)          # 0/1 flag
    created_at = Column(DateTime, server_default=func.now())


class Notification(Base):
    """Per-user notification."""
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(160), nullable=True)
    message = Column(Text, nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    is_read = Column(Integer, default=0)             # 0/1 flag
    created_at = Column(DateTime, server_default=func.now())


# ============ Quiz engine (interactive MCQ, auto-graded) ============

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)   # null/0 => no time limit
    max_marks = Column(Float, default=0.0)
    weight_from_participation = Column(Float, default=0.0)
    file_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    questions = relationship(
        "QuizQuestion", back_populates="quiz",
        cascade="all, delete-orphan", order_by="QuizQuestion.position",
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)   # sanitized HTML
    marks = Column(Float, default=1.0)
    position = Column(Integer, default=0)

    quiz = relationship("Quiz", back_populates="questions")
    options = relationship(
        "QuizOption", back_populates="question",
        cascade="all, delete-orphan", order_by="QuizOption.position",
    )


class QuizOption(Base):
    __tablename__ = "quiz_options"

    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False, index=True)
    option_text = Column(String(500), nullable=False)
    is_correct = Column(Integer, default=0)   # 0/1 — NEVER exposed to students pre-submit
    position = Column(Integer, default=0)

    question = relationship("QuizQuestion", back_populates="options")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    started_at = Column(DateTime, server_default=func.now())
    end_time = Column(DateTime, nullable=True)     # server-authoritative deadline
    submitted_at = Column(DateTime, nullable=True)
    status = Column(String(20), default="in_progress")  # in_progress | submitted
    score = Column(Float, nullable=True)

    __table_args__ = (
        UniqueConstraint("quiz_id", "student_id", name="uq_quiz_student_attempt"),
    )

    answers = relationship(
        "QuizAnswer", back_populates="attempt", cascade="all, delete-orphan",
    )


class QuizAnswer(Base):
    __tablename__ = "quiz_answers"

    id = Column(Integer, primary_key=True, index=True)
    attempt_id = Column(Integer, ForeignKey("quiz_attempts.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("quiz_questions.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("quiz_options.id"), nullable=True)
    saved_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question"),
    )

    attempt = relationship("QuizAttempt", back_populates="answers")


# ============ Assessment engine (file submission, manual grade) ============

class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False, index=True)
    type = Column(String(20), default="assignment")   # assignment | project | quiz
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    max_marks = Column(Float, default=100.0)
    weight_from_participation = Column(Float, default=0.0)
    file_url = Column(String(500), nullable=True)   # lecturer's attached brief
    created_at = Column(DateTime, server_default=func.now())

    submissions = relationship(
        "Submission", back_populates="assessment", cascade="all, delete-orphan",
    )


class Submission(Base):
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(Integer, ForeignKey("assessments.id"), nullable=False, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    file_url = Column(String(500), nullable=True)
    submitted_at = Column(DateTime, server_default=func.now())
    marks_obtained = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    graded_at = Column(DateTime, nullable=True)

    __table_args__ = (
        UniqueConstraint("assessment_id", "student_id", name="uq_assessment_student"),
    )

    assessment = relationship("Assessment", back_populates="submissions")

