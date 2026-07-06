# seed_data.py - بيانات افتراضية كاملة (درجات + حضور + تنبؤات)
"""
Complete Jordanian Educational Data:
- 10 students with full profiles
- 3 lecturers with specializations  
- 1 admin
- 4 courses
- Full grades (midterm, assignments, projects, final)
- Attendance records
- OULAD + AXI predictions for all
- Everything connected!
"""
from database import SessionLocal, init_db
from auth import hash_password
import models
from datetime import date, timedelta
import random

def seed_all():
    """Seed complete realistic data"""
    db = SessionLocal()
    
    try:
        print("🔄 Creating complete educational data...")
        
        # ============ المستخدمين ============
        
        # المشرف
        admin = db.query(models.User).filter(models.User.email == "admin@edu.com").first()
        if not admin:
            admin = models.User(
                name="عبدالله الخالدي",
                email="admin@edu.com",
                password_hash=hash_password("admin123"),
                role="admin",
                age=45,
                gender="male",
                phone="0799123456",
                city="عمان",
                university="جامعة الأردن",
                department="إدارة النظام",
                specialization="تقنية المعلومات"
            )
            db.add(admin)
            print("✅ Admin added")
        
        # المعلمين
        lecturers_data = [
            {
                "name": "د. سالم العبادي",
                "email": "dr.salem@edu.com",
                "age": 42,
                "gender": "male",
                "phone": "0787654321",
                "city": "عمان",
                "university": "جامعة الأردن",
                "department": "علوم الحاسوب",
                "specialization": "الذكاء الاصطناعي"
            },
            {
                "name": "د. نورة القاسم",
                "email": "dr.noura@edu.com",
                "age": 38,
                "gender": "female",
                "phone": "0791234567",
                "city": "إربد",
                "university": "جامعة اليرموك",
                "department": "علوم الحاسوب",
                "specialization": "قواعد البيانات"
            },
            {
                "name": "د. علي المصري",
                "email": "dr.ali@edu.com",
                "age": 50,
                "gender": "male",
                "phone": "0795551234",
                "city": "الزرقاء",
                "university": "الجامعة الهاشمية",
                "department": "الرياضيات",
                "specialization": "الإحصاء والتحليل"
            }
        ]
        
        for ldata in lecturers_data:
            lecturer = db.query(models.User).filter(models.User.email == ldata["email"]).first()
            if not lecturer:
                lecturer = models.User(
                    name=ldata["name"],
                    email=ldata["email"],
                    password_hash=hash_password("lecturer123"),
                    role="lecturer",
                    age=ldata["age"],
                    gender=ldata["gender"],
                    phone=ldata["phone"],
                    city=ldata["city"],
                    university=ldata["university"],
                    department=ldata["department"],
                    specialization=ldata["specialization"]
                )
                db.add(lecturer)
                print(f"✅ Lecturer: {ldata['name']}")
        
        db.commit()
        
        # الطلاب - 10 طلاب بمستويات متنوعة
        students_data = [
            # ممتاز
            {"name": "أحمد علي الطراونة", "email": "ahmed@edu.com", "age": 21, "gender": "male", "city": "عمان",
             "phone": "0781112233", "academic_year": "السنة الثالثة", "specialization": "علوم الحاسوب",
             "raised_hands": 75, "visited_resources": 80, "announcements_view": 85, "discussion": 70,
             "absence_days": "Under-7", "parent_satisfaction": "Good",
             "grade_profile": "excellent"},
            
            {"name": "سارة محمد الشمايلة", "email": "sara@edu.com", "age": 20, "gender": "female", "city": "إربد",
             "phone": "0792223344", "academic_year": "السنة الثانية", "specialization": "علوم الحاسوب",
             "raised_hands": 85, "visited_resources": 90, "announcements_view": 80, "discussion": 75,
             "absence_days": "Under-7", "parent_satisfaction": "Good",
             "grade_profile": "excellent"},
             
            # جيد جداً
            {"name": "محمد خالد العمري", "email": "mohammed@edu.com", "age": 22, "gender": "male", "city": "الزرقاء",
             "phone": "0783334455", "academic_year": "السنة الرابعة", "specialization": "هندسة البرمجيات",
             "raised_hands": 60, "visited_resources": 65, "announcements_view": 55, "discussion": 50,
             "absence_days": "Under-7", "parent_satisfaction": "Good",
             "grade_profile": "very_good"},
             
            {"name": "فاطمة أحمد البطاينة", "email": "fatima@edu.com", "age": 21, "gender": "female", "city": "عمان",
             "phone": "0794445566", "academic_year": "السنة الثالثة", "specialization": "نظم المعلومات",
             "raised_hands": 55, "visited_resources": 60, "announcements_view": 65, "discussion": 45,
             "absence_days": "Under-7", "parent_satisfaction": "Good",
             "grade_profile": "very_good"},
             
            # جيد
            {"name": "عمر يوسف الحياري", "email": "omar@edu.com", "age": 23, "gender": "male", "city": "مادبا",
             "phone": "0785556677", "academic_year": "السنة الرابعة", "specialization": "علوم الحاسوب",
             "raised_hands": 40, "visited_resources": 45, "announcements_view": 35, "discussion": 30,
             "absence_days": "Under-7", "parent_satisfaction": "Good",
             "grade_profile": "good"},
             
            {"name": "نور حسن الزعبي", "email": "noor@edu.com", "age": 20, "gender": "female", "city": "عجلون",
             "phone": "0796667788", "academic_year": "السنة الثانية", "specialization": "علوم الحاسوب",
             "raised_hands": 35, "visited_resources": 40, "announcements_view": 45, "discussion": 38,
             "absence_days": "Under-7", "parent_satisfaction": "Bad",
             "grade_profile": "good"},
             
            # متوسط
            {"name": "يوسف سامي النعيمات", "email": "yousef@edu.com", "age": 24, "gender": "male", "city": "الكرك",
             "phone": "0787778899", "academic_year": "السنة الخامسة", "specialization": "علوم الحاسوب",
             "raised_hands": 20, "visited_resources": 25, "announcements_view": 15, "discussion": 10,
             "absence_days": "Above-7", "parent_satisfaction": "Bad",
             "grade_profile": "average"},
             
            {"name": "ليلى عبدالله الرواشدة", "email": "layla@edu.com", "age": 22, "gender": "female", "city": "جرش",
             "phone": "0798889900", "academic_year": "السنة الثالثة", "specialization": "نظم المعلومات",
             "raised_hands": 25, "visited_resources": 30, "announcements_view": 20, "discussion": 15,
             "absence_days": "Above-7", "parent_satisfaction": "Bad",
             "grade_profile": "average"},
             
            # ضعيف - معرض للخطر
            {"name": "كريم محمود الغرايبة", "email": "kareem@edu.com", "age": 25, "gender": "male", "city": "معان",
             "phone": "0781119900", "academic_year": "السنة السادسة", "specialization": "هندسة البرمجيات",
             "raised_hands": 10, "visited_resources": 15, "announcements_view": 8, "discussion": 5,
             "absence_days": "Above-7", "parent_satisfaction": "Bad",
             "grade_profile": "weak"},
             
            {"name": "هدى سليمان العدوان", "email": "huda@edu.com", "age": 21, "gender": "female", "city": "السلط",
             "phone": "0792220011", "academic_year": "السنة الثانية", "specialization": "علوم الحاسوب",
             "raised_hands": 15, "visited_resources": 18, "announcements_view": 12, "discussion": 8,
             "absence_days": "Above-7", "parent_satisfaction": "Bad",
             "grade_profile": "weak"}
        ]
        
        for sdata in students_data:
            student = db.query(models.User).filter(models.User.email == sdata["email"]).first()
            if not student:
                student = models.User(
                    name=sdata["name"],
                    email=sdata["email"],
                    password_hash=hash_password("student123"),
                    role="student",
                    age=sdata["age"],
                    gender=sdata["gender"],
                    phone=sdata["phone"],
                    city=sdata["city"],
                    university="جامعة الأردن",
                    department="علوم الحاسوب",
                    specialization=sdata["specialization"],
                    academic_year=sdata["academic_year"]
                    # NOTE: AXI behavioral fields now in StudentFeature (per-course)
                )
                db.add(student)
                print(f"✅ Student: {sdata['name']}")
        
        db.commit()
        
        # Reload data
        lecturers = db.query(models.User).filter(models.User.role == "lecturer").all()
        students_db = db.query(models.User).filter(models.User.role == "student").all()
        
        # ============ المقررات ============
        courses_data = [
            {"name": "البرمجة بلغة بايثون", "code": "CS101", "dept": "علوم الحاسوب", "credits": 3, "lecturer_idx": 0},
            {"name": "قواعد البيانات", "code": "CS201", "dept": "علوم الحاسوب", "credits": 3, "lecturer_idx": 1},
            {"name": "الذكاء الاصطناعي", "code": "CS301", "dept": "علوم الحاسوب", "credits": 3, "lecturer_idx": 0},
            {"name": "الإحصاء والاحتمالات", "code": "MATH201", "dept": "الرياضيات", "credits": 3, "lecturer_idx": 2},
        ]
        
        for cdata in courses_data:
            course = db.query(models.Course).filter(models.Course.code == cdata["code"]).first()
            if not course:
                course = models.Course(
                    name=cdata["name"],
                    code=cdata["code"],
                    description=f"مقرر {cdata['name']} - قسم {cdata['dept']}",
                    department=cdata["dept"],
                    credit_hours=cdata["credits"],
                    lecturer_id=lecturers[cdata["lecturer_idx"]].id if len(lecturers) > cdata["lecturer_idx"] else None
                )
                db.add(course)
                print(f"✅ Course: {cdata['name']}")
        
        db.commit()
        
        # Reload courses
        courses = db.query(models.Course).all()
        
        # Grade profiles
        grade_profiles = {
            "excellent": {"mid": (85, 95), "part": (90, 100), "assign": (88, 98), "project": (85, 95), "final": (80, 95),
                         "wg": (85, 95), "pr": (90, 100), "tma": (85, 95), "cma": (88, 98), "click": (1500, 2000),
                         "oulad": 1, "oulad_prob": (0.85, 0.95), "axi": "H"},
            "very_good": {"mid": (75, 84), "part": (78, 89), "assign": (75, 87), "project": (72, 84), "final": (70, 82),
                         "wg": (75, 84), "pr": (78, 89), "tma": (75, 84), "cma": (72, 84), "click": (1000, 1499),
                         "oulad": 1, "oulad_prob": (0.70, 0.85), "axi": "H"},
            "good": {"mid": (65, 74), "part": (60, 77), "assign": (62, 74), "project": (58, 72), "final": (55, 70),
                    "wg": (65, 74), "pr": (60, 77), "tma": (65, 74), "cma": (58, 72), "click": (700, 999),
                    "oulad": 1, "oulad_prob": (0.55, 0.70), "axi": "M"},
            "average": {"mid": (50, 64), "part": (45, 59), "assign": (48, 64), "project": (45, 58), "final": (45, 58),
                       "wg": (50, 64), "pr": (45, 59), "tma": (50, 64), "cma": (45, 58), "click": (300, 699),
                       "oulad": 0, "oulad_prob": (0.35, 0.50), "axi": "M"},
            "weak": {"mid": (30, 49), "part": (25, 44), "assign": (28, 47), "project": (25, 44), "final": (25, 44),
                    "wg": (30, 49), "pr": (25, 44), "tma": (30, 49), "cma": (25, 44), "click": (50, 299),
                    "oulad": 0, "oulad_prob": (0.10, 0.35), "axi": "L"}
        }
        
        # ============ تسجيل الطلاب + الدرجات + الحضور ============
        print("\n📊 Adding enrollments, grades, attendance, and predictions...")
        
        for i, student in enumerate(students_db):
            # Get student grade profile
            sdata = students_data[i] if i < len(students_data) else students_data[0]
            profile_name = sdata.get("grade_profile", "average")
            profile = grade_profiles[profile_name]
            
            # Enroll in 2-3 courses
            num_courses = random.randint(2, min(3, len(courses)))
            selected_courses = random.sample(courses, num_courses)
            
            for course in selected_courses:
                # Check/create enrollment
                enrollment = db.query(models.Enrollment).filter(
                    models.Enrollment.student_id == student.id,
                    models.Enrollment.course_id == course.id
                ).first()
                
                if not enrollment:
                    enrollment = models.Enrollment(
                        student_id=student.id,
                        course_id=course.id,
                        semester="Fall 2024",
                        status="active"
                    )
                    db.add(enrollment)
                    db.flush()
                
                # ===== Add Grades =====
                grade_types = [
                    ("Midterm", profile["mid"]),
                    ("Participation", profile["part"]),
                    ("Assignment1", profile["assign"]),
                    ("Assignment2", profile["assign"]),
                    ("Project", profile["project"]),
                    ("Final", profile["final"])
                ]
                
                for gtype, grange in grade_types:
                    existing_grade = db.query(models.Grade).filter(
                        models.Grade.student_id == student.id,
                        models.Grade.course_id == course.id,
                        models.Grade.assessment_type == gtype
                    ).first()
                    
                    if not existing_grade:
                        score = round(random.uniform(*grange), 1)
                        grade = models.Grade(
                            student_id=student.id,
                            course_id=course.id,
                            assessment_type=gtype,
                            score=score,
                            max_score=100,
                            weight=1.0
                        )
                        db.add(grade)
                
                # ===== Add Attendance =====
                # 14 sessions per semester
                start_date = date(2024, 9, 1)
                absent_count = 2 if profile_name in ["excellent", "very_good"] else 4 if profile_name == "good" else 8
                
                for day_offset in range(0, 14 * 7, 7):  # Every week
                    session_date = start_date + timedelta(days=day_offset)
                    
                    existing_att = db.query(models.Attendance).filter(
                        models.Attendance.student_id == student.id,
                        models.Attendance.course_id == course.id,
                        models.Attendance.date == session_date
                    ).first()
                    
                    if not existing_att:
                        if day_offset // 7 < (14 - absent_count):
                            status = "present"
                        else:
                            status = random.choice(["absent", "late"])
                        
                        attendance = models.Attendance(
                            student_id=student.id,
                            course_id=course.id,
                            date=session_date,
                            status=status
                        )
                        db.add(attendance)
                
                # ===== Add StudentFeature with Predictions =====
                existing_feat = db.query(models.StudentFeature).filter(
                    models.StudentFeature.student_id == student.id,
                    models.StudentFeature.course_id == course.id
                ).first()
                
                if not existing_feat:
                    wg = round(random.uniform(*profile["wg"]), 2)
                    pr = round(random.uniform(*profile["pr"]), 2)
                    tma = round(random.uniform(*profile["tma"]), 2)
                    cma = round(random.uniform(*profile["cma"]), 2)
                    click = random.randint(*profile["click"])
                    days_active = random.randint(100, 250)
                    
                    feature = models.StudentFeature(
                        student_id=student.id,
                        course_id=course.id,
                        num_of_prev_attempts=random.randint(0, 2) if profile_name in ["weak", "average"] else 0,
                        weighted_grade=wg,
                        pass_rate=pr,
                        score_tma=tma,
                        score_cma=cma,
                        sum_click=click,
                        date=days_active,
                        # OULAD prediction
                        prediction=profile["oulad"],
                        prediction_probability=round(random.uniform(*profile["oulad_prob"]), 3),
                        # AXI prediction
                        axi_prediction=profile["axi"],
                        axi_probability_l=0.1 if profile["axi"] == "H" else 0.25 if profile["axi"] == "M" else 0.65,
                        axi_probability_m=0.2 if profile["axi"] == "H" else 0.55 if profile["axi"] == "M" else 0.25,
                        axi_probability_h=0.7 if profile["axi"] == "H" else 0.2 if profile["axi"] == "M" else 0.1,
                        # AXI Behavioral Features (per-course)
                        raised_hands=sdata.get("raised_hands", 50),
                        visited_resources=sdata.get("visited_resources", 50),
                        announcements_view=sdata.get("announcements_view", 50),
                        discussion=sdata.get("discussion", 50),
                        absence_days=sdata.get("absence_days", "Under-7"),
                        parent_satisfaction=sdata.get("parent_satisfaction", "Good")
                    )
                    db.add(feature)
                    
                    # === Add StudentVle data (for Days_Active calculation) ===
                    for day_offset in range(0, days_active, random.randint(1, 5)):
                        vle_entry = models.StudentVle(
                            student_id=student.id,
                            course_id=course.id,
                            date=day_offset,
                            sum_click=random.randint(5, 50)
                        )
                        db.add(vle_entry)
            
            print(f"   ✓ {student.name}: {num_courses} courses with grades, attendance, predictions, VLE")
        
        db.commit()
        
        # ============ مواد المقررات ============
        print("\n📚 Adding course materials...")
        for course in courses:
            existing = db.query(models.CourseMaterial).filter(
                models.CourseMaterial.course_id == course.id
            ).first()
            
            if not existing:
                materials = [
                    models.CourseMaterial(
                        course_id=course.id,
                        title=f"ملخص الوحدة الأولى - {course.name}",
                        description="ملخص شامل للمفاهيم الأساسية",
                        content_text=f"محتوى تعليمي لمقرر {course.name}. يتضمن المفاهيم والأمثلة.",
                        uploaded_by=course.lecturer_id or 1
                    ),
                    models.CourseMaterial(
                        course_id=course.id,
                        title=f"تمارين الفصل الأول - {course.name}",
                        description="تمارين متنوعة للتدريب",
                        content_text=f"تمارين متنوعة لتعزيز الفهم في {course.name}.",
                        uploaded_by=course.lecturer_id or 1
                    ),
                    models.CourseMaterial(
                        course_id=course.id,
                        title=f"مراجعة منتصف الفصل - {course.name}",
                        description="مراجعة شاملة للامتحان النصفي",
                        content_text=f"مراجعة لجميع المواضيع حتى منتصف الفصل.",
                        uploaded_by=course.lecturer_id or 1
                    )
                ]
                for m in materials:
                    db.add(m)
                print(f"   ✓ {course.name}: 3 materials")
        
        db.commit()
        
        # ============ Summary ============
        total_students = db.query(models.User).filter(models.User.role == "student").count()
        total_lecturers = db.query(models.User).filter(models.User.role == "lecturer").count()
        total_courses = db.query(models.Course).count()
        total_grades = db.query(models.Grade).count()
        total_attendance = db.query(models.Attendance).count()
        total_features = db.query(models.StudentFeature).count()
        
        print("\n" + "="*50)
        print("🎉 COMPLETE DATA SEEDED SUCCESSFULLY!")
        print("="*50)
        print(f"👤 Admin: 1")
        print(f"👨‍🏫 Lecturers: {total_lecturers}")
        print(f"👨‍🎓 Students: {total_students}")
        print(f"📚 Courses: {total_courses}")
        print(f"📝 Grades: {total_grades}")
        print(f"📅 Attendance Records: {total_attendance}")
        print(f"🤖 AI Predictions: {total_features}")
        print("="*50)
        print("\n✅ All students have:")
        print("   - Complete grades (Midterm, Participation, Assignments, Project, Final)")
        print("   - Attendance records (14 sessions)")
        print("   - OULAD predictions (Pass/Fail)")
        print("   - AXI predictions (High/Medium/Low)")
        print("   - Behavior data for AI analysis")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🔄 Initializing database...")
    init_db()
    print("🌱 Seeding complete data...")
    seed_all()
