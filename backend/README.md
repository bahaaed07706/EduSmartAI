# 🔧 Backend - EduSmartAI Server

## 📋 الوصف
خادم FastAPI للمنصة التعليمية مع دعم الذكاء الاصطناعي.

## 📁 هيكل الملفات
```
backend/
├── main.py              ← نقطة الدخول + تحميل النماذج
├── config.py            ← إعدادات من .env
├── database.py          ← اتصال SQLite
├── models.py            ← نماذج SQLAlchemy
├── schemas.py           ← مخططات Pydantic مع validation
├── auth.py              ← مصادقة JWT
├── seed_data.py         ← بيانات افتراضية كاملة
├── requirements.txt     ← المتطلبات
├── .env                 ← متغيرات البيئة (لا ترفعه لـ git)
├── .env.example         ← قالب متغيرات البيئة
│
├── utils/               ← أدوات مساعدة
│   └── pdf_extractor.py     ← استخراج نص من PDF
│
└── routes/              ← مسارات API
    ├── auth_routes.py       ← تسجيل الدخول/الخروج
    ├── student_routes.py    ← مسارات الطالب
    ├── lecturer_routes.py   ← مسارات المعلم
    ├── admin_routes.py      ← مسارات المشرف
    ├── chatbot_routes.py    ← الشات بوت الذكي
    ├── prediction_routes.py ← تنبؤات AI
    ├── file_routes.py       ← رفع الملفات
    └── skeleton_routes.py   ← endpoints إضافية
```

## ⚙️ الإعداد

### 1. إنشاء ملف .env
```bash
cp .env.example .env
# ثم عدّل القيم حسب بيئتك
```

### 2. تثبيت المتطلبات
```bash
pip install -r requirements.txt
```

### 3. إنشاء قاعدة البيانات والبيانات الافتراضية
```bash
python seed_data.py
```

### 4. تشغيل الخادم
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## 🧪 الاختبارات

(الاختبارات الخاصة بالـ backend غير متوفرة حالياً في هذا الإصدار)

## 🔗 API Endpoints الرئيسية

### المصادقة
| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| POST | `/api/v1/auth/login` | تسجيل الدخول |
| POST | `/api/v1/auth/logout` | تسجيل الخروج |

### الطالب
| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| GET | `/api/v1/students/me` | معلومات الطالب |
| GET | `/api/v1/students/me/courses` | مقررات الطالب |
| GET | `/api/v1/students/me/features/{course_id}` | تنبؤات AI |
| GET | `/api/v1/students/me/courses/{id}/grades-summary` | الدرجات |

### المعلم
| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| GET | `/api/v1/lecturers/me/profile` | معلومات المعلم |
| GET | `/api/v1/lecturers/me/courses` | مقررات المعلم |
| GET | `/api/v1/lecturers/courses/{id}/students` | طلاب المقرر |

### الشات بوت
| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| POST | `/api/v1/chatbot/query` | إرسال سؤال |
| POST | `/api/v1/chatbot/upload-file` | رفع ملف للتحليل |

### التنبؤات
| Method | Endpoint | الوظيفة |
|--------|----------|---------|
| POST | `/api/v1/predictions/student/{id}/course/{id}` | تنبؤ ثنائي |

## 🤖 النماذج المستخدمة

من مجلد `../Saved_Models/`:
- `oulad_model_fixed.joblib` - نموذج OULAD (Random Forest)
- `oulad_scaler_fixed.joblib` - معايرة بيانات OULAD
- `axi_rf_model.joblib` - نموذج AXI (Random Forest)
- `axi_scaler.joblib` - معايرة بيانات AXI

## 📊 قاعدة البيانات
SQLite: `edusmart.db`

### الجداول
- `users` - المستخدمين (طلاب، معلمين، مشرفين)
- `courses` - المقررات
- `enrollments` - التسجيلات
- `grades` - الدرجات
- `attendance` - الحضور
- `student_features` - خصائص الطالب + تنبؤات AI (per-course)
- `course_materials` - مواد المقرر
