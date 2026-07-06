# routes/chatbot_routes.py - الدردشة الذكية مع Groq AI (Llama 3.3)
"""
Intelligent Chatbot with:
1. Groq API Integration (Llama 3.3 70B)
2. Works for ALL users (Students AND Lecturers)
3. Student Context Awareness
4. Lecturer can ask about specific students
5. Dual Model Predictions (OULAD + AXI)
6. Course-Specific RAG
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
import os
from pathlib import Path
from database import get_db
from auth import get_current_user, get_student
import models
import schemas

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

# Groq client - loaded from environment variable
groq_client = None
GROQ_API_KEY = os.getenv("GROQ_API_KEY")  # Must be set in .env


def get_groq_client():
    """Get or initialize Groq client - handles missing API key gracefully"""
    global groq_client
    
    # Check if key is missing or empty
    if GROQ_API_KEY is None or GROQ_API_KEY.strip() == "":
        print("[WARNING] GROQ_API_KEY not set or empty in .env - chatbot will use fallback responses")
        return None
    
    if groq_client is None:
        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY)
            print(f"[OK] Groq client initialized (key starts with: {GROQ_API_KEY[:10]}...)")
        except ImportError:
            print("[WARNING] groq package not installed. Run: pip install groq")
        except Exception as e:
            print(f"[WARNING] Groq initialization error: {e}")
    return groq_client


def get_student_context(student_id: int, course_id: Optional[int], db: Session) -> dict:
    """Build student context for AI prompt"""
    context = {
        "student_name": None,
        "student_profile": {},
        "courses": [],
        "features": None,
        "oulad_prediction": None,
        "axi_prediction": None,
        "materials": [],
        "grades": [],
        "attendance_summary": None
    }
    
    student = db.query(models.User).filter(models.User.id == student_id).first()
    if student:
        context["student_name"] = student.name
        context["student_profile"] = {
            "age": student.age,
            "gender": "ذكر" if student.gender == "male" else "أنثى" if student.gender == "female" else None,
            "city": student.city,
            "university": student.university,
            "specialization": student.specialization,
            "academic_year": student.academic_year,
            "phone": student.phone
        }
    
    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == student_id
    ).all()
    
    for enrollment in enrollments:
        course = db.query(models.Course).filter(models.Course.id == enrollment.course_id).first()
        if course:
            lecturer = db.query(models.User).filter(models.User.id == course.lecturer_id).first()
            context["courses"].append({
                "id": course.id,
                "name": course.name,
                "code": course.code,
                "lecturer_name": lecturer.name if lecturer else None
            })
    
    target_course_id = course_id
    if not target_course_id and context["courses"]:
        target_course_id = context["courses"][0]["id"]
    
    if target_course_id:
        features = db.query(models.StudentFeature).filter(
            models.StudentFeature.student_id == student_id,
            models.StudentFeature.course_id == target_course_id
        ).first()
        
        if features:
            context["features"] = {
                "weighted_grade": features.weighted_grade,
                "pass_rate": features.pass_rate,
                "score_tma": features.score_tma,
                "score_cma": features.score_cma,
                "sum_click": features.sum_click,
                "num_of_prev_attempts": features.num_of_prev_attempts
            }
            context["oulad_prediction"] = {
                "result": "ناجح" if features.prediction == 1 else "معرض للخطر" if features.prediction == 0 else "غير معروف",
                "probability": features.prediction_probability
            }
            context["axi_prediction"] = {
                "level": features.axi_prediction,
                "level_ar": "مرتفع" if features.axi_prediction == "H" else "متوسط" if features.axi_prediction == "M" else "منخفض",
                "prob_l": features.axi_probability_l,
                "prob_m": features.axi_probability_m,
                "prob_h": features.axi_probability_h
            }
            # AXI behavior from StudentFeature (course-specific)
            context["axi_behavior"] = {
                "raised_hands": features.raised_hands,
                "visited_resources": features.visited_resources,
                "announcements_view": features.announcements_view,
                "discussion": features.discussion,
                "absence_days": features.absence_days,
                "parent_satisfaction": features.parent_satisfaction
            }
        
        # Load course materials for RAG context
        materials = db.query(models.CourseMaterial).filter(
            models.CourseMaterial.course_id == target_course_id
        ).all()
        context["materials"] = [{"title": m.title, "content": m.content_text or ""} for m in materials]
        
        grades = db.query(models.Grade).filter(
            models.Grade.student_id == student_id,
            models.Grade.course_id == target_course_id
        ).all()
        context["grades"] = [{"type": g.assessment_type, "score": g.score} for g in grades]
        
        attendances = db.query(models.Attendance).filter(
            models.Attendance.student_id == student_id,
            models.Attendance.course_id == target_course_id
        ).all()
        if attendances:
            present = sum(1 for a in attendances if a.status == "present")
            total = len(attendances)
            context["attendance_summary"] = f"{present}/{total} ({present/total*100:.0f}%)"
    
    return context


def get_lecturer_context(lecturer_id: int, db: Session) -> dict:
    """Build lecturer context with their courses and students"""
    context = {
        "lecturer_name": None,
        "lecturer_profile": {},
        "courses": [],
        "students_summary": []
    }
    
    lecturer = db.query(models.User).filter(models.User.id == lecturer_id).first()
    if lecturer:
        context["lecturer_name"] = lecturer.name
        context["lecturer_profile"] = {
            "specialization": lecturer.specialization,
            "department": lecturer.department,
            "university": lecturer.university
        }
    
    courses = db.query(models.Course).filter(models.Course.lecturer_id == lecturer_id).all()
    
    for course in courses:
        enrollments = db.query(models.Enrollment).filter(
            models.Enrollment.course_id == course.id
        ).all()
        
        students_in_course = []
        at_risk_count = 0
        success_count = 0
        
        for enrollment in enrollments:
            student = db.query(models.User).filter(models.User.id == enrollment.student_id).first()
            features = db.query(models.StudentFeature).filter(
                models.StudentFeature.student_id == enrollment.student_id,
                models.StudentFeature.course_id == course.id
            ).first()
            
            if student:
                student_info = {
                    "id": student.id,
                    "name": student.name,
                    "email": student.email,
                    "weighted_grade": features.weighted_grade if features else None,
                    "oulad_result": "ناجح" if features and features.prediction == 1 else "معرض للخطر" if features and features.prediction == 0 else None,
                    "axi_level": features.axi_prediction if features else None
                }
                students_in_course.append(student_info)
                
                if features:
                    if features.prediction == 1:
                        success_count += 1
                    else:
                        at_risk_count += 1
        
        context["courses"].append({
            "id": course.id,
            "name": course.name,
            "code": course.code,
            "students_count": len(students_in_course),
            "at_risk_count": at_risk_count,
            "success_count": success_count,
            "students": students_in_course
        })
    
    return context


def build_system_prompt(context: dict, is_lecturer: bool = False) -> str:
    """Build AI system prompt based on user role"""
    
    if is_lecturer:
        prompt = """أنت EduSmartAI، مساعد ذكي للمعلمين الجامعيين.

You are EduSmartAI, an intelligent assistant for university lecturers.

Your role:
1. Help lecturers understand their students' performance
2. Provide analysis of at-risk students
3. Answer questions about specific students
4. Give recommendations for improving student outcomes

"""
        if context.get("lecturer_name"):
            prompt += f"المعلم: {context['lecturer_name']}\n"
            if context.get("lecturer_profile", {}).get("specialization"):
                prompt += f"التخصص: {context['lecturer_profile']['specialization']}\n"
        
        if context.get("courses"):
            prompt += "\n📚 المقررات التي تُدرّسها:\n"
            for course in context["courses"]:
                prompt += f"\n**{course['name']}** ({course['code']})\n"
                prompt += f"  - عدد الطلاب: {course['students_count']}\n"
                prompt += f"  - طلاب ناجحين: {course['success_count']}\n"
                prompt += f"  - طلاب معرضين للخطر: {course['at_risk_count']}\n"
                
                if course.get("students"):
                    prompt += "  - الطلاب:\n"
                    for s in course["students"][:10]:  # Limit
                        prompt += f"    • {s['name']}: {s['oulad_result'] or 'N/A'} (AXI: {s['axi_level'] or 'N/A'})\n"
        
    else:
        prompt = """أنت EduSmartAI، مساعد تعليمي ذكي للطلاب الجامعيين.

You are EduSmartAI, an intelligent educational assistant for university students.

Your role:
1. Help students understand their academic performance
2. Show dual model predictions (OULAD + AXI)
3. Provide personalized recommendations
4. Answer course questions

"""
        if context.get("student_name"):
            prompt += f"الطالب: {context['student_name']}\n"
        
        profile = context.get("student_profile", {})
        if profile:
            if profile.get("age"):
                prompt += f"العمر: {profile['age']} سنة\n"
            if profile.get("city"):
                prompt += f"السكن: {profile['city']}\n"
            if profile.get("specialization"):
                prompt += f"التخصص: {profile['specialization']}\n"
            if profile.get("academic_year"):
                prompt += f"السنة الدراسية: {profile['academic_year']}\n"
        
        if context.get("courses"):
            courses_str = ", ".join([f"{c['name']} (مع {c['lecturer_name']})" for c in context["courses"]])
            prompt += f"المقررات: {courses_str}\n"
        
        if context.get("features"):
            f = context["features"]
            prompt += f"""
📊 مقاييس الأداء:
- الدرجة المرجحة: {f['weighted_grade']:.1f}%
- معدل النجاح: {f['pass_rate']:.1f}%
- درجة TMA: {f['score_tma']:.1f}
- درجة CMA: {f['score_cma']:.1f}
- التفاعل: {f['sum_click']} نقرة
"""
        
        if context.get("oulad_prediction"):
            p = context["oulad_prediction"]
            prob = p["probability"] * 100 if p["probability"] else 0
            prompt += f"\n🔮 تنبؤ OULAD: {p['result']} (احتمالية: {prob:.0f}%)\n"
        
        if context.get("axi_prediction") and context["axi_prediction"].get("level"):
            a = context["axi_prediction"]
            prompt += f"📈 تنبؤ AXI (السلوك): {a['level_ar']} ({a['level']})\n"
        
        if context.get("axi_behavior"):
            b = context["axi_behavior"]
            prompt += f"""
🎯 السلوك الأكاديمي (AXI):
- رفع اليد: {b['raised_hands']} مرة
- زيارة الموارد: {b['visited_resources']} مرة
- مشاهدة الإعلانات: {b['announcements_view']} مرة
- المشاركة في النقاش: {b['discussion']} مرة
- الغياب: {b['absence_days']}
"""
        
        if context.get("materials"):
            prompt += "\n📚 المواد المتاحة:\n"
            for m in context["materials"][:5]:
                prompt += f"- {m['title']}\n"
    
    prompt += "\nأجب باللغة العربية أو الإنجليزية حسب لغة السؤال. كن مفيداً ومشجعاً."
    return prompt


def generate_ai_response(user_message: str, context: dict, is_lecturer: bool = False) -> str:
    """Generate response using Groq Llama 3.3"""
    client = get_groq_client()
    
    if client:
        try:
            system_prompt = build_system_prompt(context, is_lecturer)
            
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            error_msg = str(e).lower()
            print(f"Groq API error: {e}")
            
            # Return informative error message based on error type
            if "invalid_api_key" in error_msg or "authentication" in error_msg:
                return """⚠️ **خطأ في مفتاح API**

مفتاح Groq API غير صالح أو منتهي الصلاحية.

**للإصلاح:**
1. احصل على مفتاح جديد من: https://console.groq.com
2. حدّث `GROQ_API_KEY` في ملف `.env`
3. أعد تشغيل الخادم

في الوقت الحالي، سأستخدم الردود المحلية."""
            elif "rate_limit" in error_msg:
                return """⚠️ **تجاوز حد الاستخدام**

تم تجاوز حد الطلبات لـ Groq API. حاول مرة أخرى بعد دقيقة."""
            elif "model" in error_msg:
                return """⚠️ **خطأ في النموذج**

النموذج المطلوب غير متاح. جاري استخدام الردود المحلية."""
    
    # Fallback with notice
    fallback_notice = "\n\n---\n*💡 هذا رد محلي. للحصول على ردود AI ذكية، تأكد من إعداد GROQ_API_KEY.*"
    
    if is_lecturer:
        return generate_lecturer_fallback(user_message, context) + fallback_notice
    return generate_student_fallback(user_message, context) + fallback_notice


def generate_student_fallback(message: str, context: dict) -> str:
    """Student fallback response"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["تقييم", "evaluation", "درجات", "grades", "أدائي"]):
        if context.get("oulad_prediction") and context.get("features"):
            oulad = context["oulad_prediction"]
            axi = context.get("axi_prediction", {})
            f = context["features"]
            prob = oulad["probability"] * 100 if oulad["probability"] else 0
            
            return f"""📊 **تقييمك الأكاديمي الكامل**

👤 **معلوماتك:**
- التخصص: {context.get('student_profile', {}).get('specialization', 'غير محدد')}
- السنة: {context.get('student_profile', {}).get('academic_year', 'غير محدد')}

📈 **نتائج النموذج الأول (OULAD):**
- التنبؤ: **{oulad['result']}**
- احتمالية النجاح: **{prob:.0f}%**
- الدرجة المرجحة: {f['weighted_grade']:.1f}%

📊 **نتائج النموذج الثاني (AXI - السلوكي):**
- المستوى: **{axi.get('level_ar', 'غير متوفر')}** ({axi.get('level', 'N/A')})

💡 هل تريد نصائح للتحسين؟"""
    
    return """👋 **مرحباً! أنا مساعدك الذكي**

يمكنني مساعدتك في:
• 📊 عرض التقييم (نموذجين: OULAD + AXI)
• 💡 نصائح للتحسين
• 📚 أسئلة عن المقررات

اسألني أي شيء!"""


def generate_lecturer_fallback(message: str, context: dict) -> str:
    """Lecturer fallback response"""
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["طلاب", "students", "مقرر", "course"]):
        if context.get("courses"):
            response = "📊 **ملخص طلابك:**\n\n"
            for course in context["courses"]:
                response += f"**{course['name']}** ({course['code']})\n"
                response += f"  - عدد الطلاب: {course['students_count']}\n"
                response += f"  - ناجحين: {course['success_count']} ✅\n"
                response += f"  - معرضين للخطر: {course['at_risk_count']} ⚠️\n\n"
            return response
    
    return """👋 **مرحباً دكتور/ة!**

يمكنني مساعدتك في:
• 📊 عرض إحصائيات طلابك
• 🔍 البحث عن طالب معين
• ⚠️ عرض الطلاب المعرضين للخطر
• 📈 تحليل أداء المقررات

اسألني عن أي طالب أو مقرر!"""


@router.post("/query", response_model=schemas.ChatbotResponse)
def chatbot_query(
    query: schemas.ChatbotQuery,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Main chatbot endpoint - works for students AND lecturers"""
    
    if current_user.role == "lecturer":
        context = get_lecturer_context(current_user.id, db)
        answer = generate_ai_response(query.message, context, is_lecturer=True)
        suggested = ["عرض طلابي", "الطلاب المعرضين للخطر", "إحصائيات المقررات"]
    else:
        context = get_student_context(current_user.id, query.course_id, db)
        answer = generate_ai_response(query.message, context, is_lecturer=False)
        suggested = ["عرض تقييمي", "كيف أتحسن؟", "المواد المتاحة"]
    
    return schemas.ChatbotResponse(
        answer=answer,
        suggested_actions=suggested,
        data={
            "user_role": current_user.role,
            "ai_model": "llama-3.3-70b-versatile",
            "ai_powered": get_groq_client() is not None
        }
    )


@router.post("/ask")
async def ask_chatbot(
    question: str,
    course_id: Optional[int] = None,
    student_id: Optional[int] = None,  # للمعلم: يسأل عن طالب معين
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Simple chat endpoint - lecturers can ask about specific students"""
    
    if current_user.role == "lecturer" and student_id:
        # المعلم يسأل عن طالب معين
        context = get_student_context(student_id, course_id, db)
        context["asking_as_lecturer"] = True
        answer = generate_ai_response(f"[المعلم يسأل عن الطالب] {question}", context, is_lecturer=False)
    elif current_user.role == "lecturer":
        context = get_lecturer_context(current_user.id, db)
        answer = generate_ai_response(question, context, is_lecturer=True)
    else:
        context = get_student_context(current_user.id, course_id, db)
        answer = generate_ai_response(question, context, is_lecturer=False)
    
    return {"question": question, "answer": answer, "model": "llama-3.3-70b-versatile"}


# Student file upload
STUDENT_UPLOADS_DIR = Path(__file__).parent.parent / "uploads" / "student_files"
STUDENT_UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/upload-file")
async def student_upload_file(
    file: UploadFile = File(...),
    message: str = Form(""),
    course_id: Optional[int] = Form(None),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Student file upload with chat"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file")
    
    allowed_ext = {".pdf", ".docx", ".txt", ".png", ".jpg", ".jpeg"}
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in allowed_ext:
        raise HTTPException(status_code=400, detail=f"Not allowed: {file_ext}")
    
    student_folder = STUDENT_UPLOADS_DIR / f"user_{current_user.id}"
    student_folder.mkdir(exist_ok=True)
    
    from datetime import datetime
    import shutil
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = student_folder / f"{timestamp}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    response = ""
    if message:
        context = get_student_context(current_user.id, course_id, db)
        response = generate_ai_response(message, context)
    
    return {"message": "Uploaded", "filename": file.filename, "chatbot_response": response}


@router.post("/tts")
def text_to_speech(text: str, current_user: models.User = Depends(get_current_user)):
    return {"audio_url": None, "message": "Coming soon"}
