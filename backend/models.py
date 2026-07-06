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
    department = Column(String(100), nullable=True)  # القسم
    specialization = Column(String(100), nullable=True)  # التخصص
    academic_year = Column(String(20), nullable=True)  # السنة الدراسية (للطلاب)
    
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
    code = Column(String(20), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    credit_hours = Column(Integer, default=3)
    department = Column(String(100), nullable=True)
    lecturer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
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
    file_url = Column(String(500), nullable=True)
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

