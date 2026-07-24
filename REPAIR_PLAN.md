# خطة الإصلاح الشاملة لمشروع EduSmartAI

الحالة: جاهزة للتنفيذ المرحلي  
النطاق: Backend، Frontend، قاعدة البيانات، المصادقة والصلاحيات، رفع الملفات، الاختبارات والواجبات، نماذج OULAD وAXI، والـ Chatbot  
قاعدة التنفيذ: لا تبدأ مرحلة تعتمد على مخطط أو عقد API قبل اجتياز بوابة المرحلة السابقة.

## 1. الهدف ومعيار الانتهاء

الهدف ليس إخفاء أخطاء `404` أو جعل الصفحات تُبنى فقط، بل جعل كل وظيفة ظاهرة في الواجهة مدعومة بعقد API موثّق، ونموذج بيانات حقيقي، وصلاحيات واختبارات تمنع رجوع الخطأ.

يُعد الإصلاح كاملًا فقط عندما تتحقق الشروط التالية معًا:

- كل استدعاء في `edusmartai-frontend/src/api/` يقابله endpoint حقيقي مطابق في method/path/body/response، أو تُحذف الميزة من الواجهة بقرار موثّق.
- لا يبقى أي endpoint يعيد نجاحًا وهميًا من `skeleton_routes.py`.
- كل عملية على course/student/material/assessment/quiz/attempt تتحقق من ملكية المورد أو enrollment، وليس من role فقط.
- لا يعمل التطبيق بمفتاح JWT افتراضي، ولا تُخزن كلمات مرور جديدة بخوارزمية قديمة.
- لا يستطيع اسم ملف أو حجمه أو نوعه الخروج من مجلد الرفع أو استنزاف الخادم.
- قاعدة البيانات تُبنى وتُرقّى بواسطة migrations، مع مسار ترقية مجرّب لقاعدة SQLite الحالية.
- حساب خصائص ML وترتيبها وتسميات الاحتمالات يطابق artifact التدريب ويجتاز golden tests.
- اختبارات backend وfrontend وintegration وE2E كلها خضراء، وproduction build ينجح بلا تحذيرات من كود المشروع.
- توثيق التشغيل يصف الواقع، ولا يعلن ميزات placeholder على أنها مكتملة.

### Baseline مثبت قبل التنفيذ

- Python source اجتاز `compileall`، لكن لم توجد أي اختبارات backend.
- production build للواجهة نجح بتحذير متغير غير مستخدم في `LecturerQuizResults.jsx`.
- اختبار الواجهة الوحيد فشل قبل تشغيل assertions لأن Jest/CRA لم يحل `react-router-dom`؛ والاختبار نفسه ما زال يبحث عن `learn react`.
- ملفات API في الواجهة تطلب مجموعات Admin/Quiz/Assessment/Attendance غير موجودة في FastAPI، بينما `skeleton_routes.py` يعيد نجاحات placeholder لمسارات مختلفة.
- قاعدة البيانات الحالية و`.env` غير متتبعتين في Git ويجب عدم قراءتهما أو استبدالهما ضمن التخطيط؛ أي migration تُجرّب على نسخة.
- يوجد تعديل سابق للمستخدم في `README.md` ويجب حفظه ومواءمة ادعاءاته مع الواقع في PR توثيق مستقل، لا الكتابة فوقه.

## 2. جذور المشكلات وخريطة الاعتماديات

| الخطة الرئيسية | العيب المعماري | أمثلة الأعراض | تعتمد على |
|---|---|---|---|
| P1 | حدود ثقة وصلاحيات موزعة وغير مكتملة | IDOR بين المدرسين، chatbot يقرأ طالبًا عشوائيًا، secret افتراضي، رفع غير آمن | P0 |
| P2 | مخطط بيانات غير ممثل للمجال ولا يملك migrations | غياب Department/Semester/Quiz/Attempt، حذف قد يفشل أو يترك سجلات يتيمة | P0، P1 |
| P3 | لا يوجد عقد API واحد بين الواجهة والخلفية | عشرات 404، مسارات رفع مختلفة، response shapes متباينة | P0، P2 |
| P4 | دورة التقييم والاختبار غير منفذة كمعاملة واحدة | صفحات كاملة بلا backend، autosave/submit/results غير موجودة | P2، P3 |
| P5 | عقد ميزات ML غير مثبت | weighted grade قد يتجاوز 100، ربط احتمالات AXI بترتيب مفترض | P1، P2 |
| P6 | RAG/Chatbot بلا طبقة خدمة وحدود سياق صلبة | كشف سياق مقرر آخر، prompt/material injection، أخطاء provider | P1، P3 |
| P7 | Toolchain واختبارات الواجهة لا يطابقان الحزم الحالية | Jest لا يحل React Router، اختبار CRA الافتراضي، CRA منتهي | P0، ويمكن بدءه بالتوازي ثم دمجه بعد P3–P6 |
| P8 | غياب بوابات الجودة والإصدار | لا backend tests ولا contract tests ولا CI | يبدأ في P0 ويُغلق أخيرًا |

## 3. المرحلة P0 — تثبيت التوثيق والعقد قبل التعديل

### ما يُنفذ

1. إنشاء جدول آلي method + path لكل FastAPI route ومقارنته بكل استدعاء Axios.
2. تصنيف كل API إلى: موجود ومتوافق، موجود وغير متوافق، مفقود مطلوب، أو UI غير مدعوم يجب إخفاؤه مؤقتًا.
3. حفظ نسخة baseline من OpenAPI ومن نتائج الاختبارات/build الحالية.
4. اتخاذ القرارات التالية وتثبيتها في ADR قصير:
   - `/api/v1` هو prefix الوحيد.
   - الموارد الأكاديمية تستخدم أسماء جمع ثابتة: `/admin/students`، `/lecturers/courses/{id}`، `/students/...`.
   - SQLite للتطوير مع Alembic الآن؛ PostgreSQL ترقية منفصلة وليست شرطًا لإغلاق هذا الإصلاح.
   - الواجهة تبقى SPA؛ تُنقل من CRA إلى Vite بدل تثبيت toolchain منتهي.
   - JavaScript يبقى كما هو في هذه الدورة؛ التحويل الشامل إلى TypeScript خارج النطاق حتى لا يختلط إصلاح السلوك بإعادة كتابة الواجهة.

### APIs وأنماط مسموح بها

- FastAPI: `Depends` للـ authentication/resource authorization، `HTTPException`، `UploadFile`، `TestClient`، و`app.dependency_overrides`.
- SQLAlchemy 2: `Session.begin()`، علاقات `cascade`/`delete-orphan`، و`ForeignKey(..., ondelete=...)` مع تفعيل foreign keys في SQLite.
- React Router 7 declarative: `BrowserRouter`, `Routes`, `Route`, `Navigate`, `Outlet`؛ وReact Testing Library مع MSW لاختبارات الشبكة.
- scikit-learn: `Pipeline` أو artifact موحّد، `feature_names_in_` إن توفر، و`classes_` لربط الاحتمالات بالتسميات.

### مراجع التنفيذ

- `backend/main.py`, `backend/models.py`, `backend/schemas.py`, وجميع `backend/routes/*.py`.
- جميع `edusmartai-frontend/src/api/*.js` و`src/routing/routes.jsx` والصفحات المستهلكة لها.
- توثيق FastAPI الرسمي: Security/JWT، Dependencies، UploadFile، Testing، Dependency Overrides.
- توثيق SQLAlchemy 2 الرسمي: Session، Transactions، Cascades، SQLite foreign keys؛ وتوثيق Alembic للمigrations.
- توثيق React الرسمي لإيقاف CRA، وتوثيق React Router 7 وTesting Library/MSW.
- توثيق scikit-learn الرسمي لـ Pipeline وmodel persistence وclassifier `classes_`.

مراجع النسخ والتحقق المعتمدة:

- [FastAPI JWT وArgon2](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)، [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)، [UploadFile](https://fastapi.tiangolo.com/tutorial/request-files/)، [Testing](https://fastapi.tiangolo.com/tutorial/testing/)، و[Dependency overrides](https://fastapi.tiangolo.com/advanced/testing-dependencies/).
- [SQLAlchemy Session basics](https://docs.sqlalchemy.org/en/20/orm/session_basics.html)، [Cascades](https://docs.sqlalchemy.org/en/20/orm/cascades.html)، و[SQLite dialect](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html).
- [Alembic batch migrations لـSQLite](https://alembic.sqlalchemy.org/en/latest/batch.html).
- [React: إيقاف Create React App](https://react.dev/blog/2025/02/14/sunsetting-create-react-app)، [React Router declarative routing](https://reactrouter.com/start/declarative/routing)، و[Testing Library + MSW example](https://testing-library.com/docs/react-testing-library/example-intro/).
- [scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html)، [Pipeline](https://scikit-learn.org/stable/modules/generated/sklearn.pipeline.Pipeline.html)، و[Model persistence](https://scikit-learn.org/stable/model_persistence.html).
- [OWASP BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)، [File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)، و[Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).

### بوابة التحقق

- تقرير contract inventory بلا مسارات مجهولة.
- ADRs موقعة داخل المشروع ولا قرارات API ضمنية.
- baseline محفوظ ويمكن مقارنة كل مرحلة به.

### ممنوع

- اختراع endpoint لتناسب صفحة واحدة دون إضافته إلى العقد.
- إرجاع `200 []` أو `id: 0` لإخفاء ميزة غير منفذة.
- ترقية جميع الحزم دفعة واحدة قبل اختبارات baseline.

## 4. المرحلة P1 — إغلاق ثغرات الصلاحيات والمصادقة والملفات

### ما يُنفذ

1. إضافة dependencies مركزية قابلة لإعادة الاستخدام:
   - `require_course_owner(course_id)` للمدرس.
   - `require_course_enrollment(course_id)` للطالب.
   - `require_student_in_owned_course(course_id, student_id)`.
   - `require_material_access(material_id)`.
2. تطبيقها على overview/students/grades/materials/predictions/chatbot وكل endpoint جديد، وحذف فحوصات الملكية المنسوخة والمتفاوتة.
3. منع chatbot من قبول `student_id` أو `course_id` لا يقع ضمن نطاق المستخدم؛ الدور `admin` لا يمر بمسار الطالب الافتراضي.
4. استبدال إعداد JWT الافتراضي بإعدادات typed عبر `pydantic-settings`; يفشل startup إذا كان secret مفقودًا/قصيرًا أو إعداد production غير آمن.
5. استخدام وقت UTC aware، مدة access قصيرة، refresh token دوّار في HttpOnly/Secure/SameSite cookie، وإبطال refresh عند logout. لا يبقى access token طويل العمر في `localStorage`.
6. ترحيل hash كلمات المرور تدريجيًا إلى Argon2: التحقق من hash القديم عند أول login ثم إعادة hash، مع dummy verification لمستخدم غير موجود.
7. بناء `FileStorageService` واحد لكل uploads:
   - UUID كاسم تخزين و`Path(filename).name` للاسم المعروض فقط.
   - streaming size limit، allowlist extension + MIME/signature validation.
   - مسار resolved يجب أن يبقى داخل upload root.
   - حفظ URL نسبي ومفتاح تخزين، لا absolute filesystem path.
   - حذف الملف وقيد DB ضمن تسلسل متعافٍ، وتسجيل فشل الحذف بدل `except: pass`.
   - إزالة mount العام لـ`/uploads`؛ تنزيل الملفات يتم من endpoint محمي يعيد `FileResponse` بعد فحص enrollment/ownership.
8. تحديد rate limits للمصادقة/chatbot/upload وتوحيد رسائل الأخطاء دون تسريب exception داخلي أو API key prefix.
9. تقييد role/status/assessment types بـEnums، والتحقق من email ودرجات `score/max_score/weight` ومن تطابق IDs الموجودة في path/body.

### الملفات الأساسية

- `backend/auth.py`, `backend/config.py`, `backend/database.py`.
- `backend/routes/lecturer_routes.py`, `student_routes.py`, `prediction_routes.py`, `chatbot_routes.py`, `file_routes.py`, `admin_routes.py`.
- `edusmartai-frontend/src/context/AuthContext.jsx`, `src/api/axiosClient.js`.

### اختبارات إلزامية

| المستخدم | المورد | المتوقع |
|---|---|---|
| Lecturer A | Course A | 2xx حسب العملية |
| Lecturer A | Course B المملوك لـ B | 403/404 دون بيانات |
| Student A | Course مسجل به | قراءة فقط حسب العقد |
| Student A | Course غير مسجل به | 403/404 |
| Student/Lecturer | Student ID خارج النطاق عبر chatbot | 403/404 |
| Admin | Admin endpoints | مسموح |
| Role غير معروف | أي مسار محمي | 403 |

- اختبارات traversal بأسماء `../`, absolute paths، Unicode separators، واسم مكرر.
- اختبارات ملف أكبر من الحد، extension مضلل، MIME غير مطابق، ورفع متزامن.
- app startup test يرفض secret الافتراضي أو المفقود في production.

### بوابة التحقق

- جميع اختبارات authorization السلبية خضراء.
- grep لا يجد `fallback-secret-key`, `except: pass`, أو كتابة `file.filename` مباشرة إلى مسار.
- token rotation/logout واختبارات انتهاء الصلاحية خضراء.

## 5. المرحلة P2 — مخطط البيانات وAlembic مع حفظ البيانات الحالية

### ما يُنفذ

1. إضافة Alembic وجعل migrations المصدر الوحيد لتغيير schema؛ يبقى `create_all` للاختبارات المؤقتة فقط أو يُزال من startup الإنتاجي.
2. جعل SQLite URL مبنيًا من `BASE_DIR` لا من current working directory، وتفعيل `PRAGMA foreign_keys=ON` عبر SQLAlchemy event.
3. إضافة/تطبيع الكيانات والقيود:
   - `Department(id, code/department_id, name)`.
   - `Semester(id, name, year, start_date, end_date, is_current)` مع قيد فصل حالي واحد.
   - User: `student_number`/`lecturer_number` unique nullable حسب الدور، `department_id`, `is_active`, timestamps.
   - Course: `department_id`, `semester_id`, credit hours، schedule fields إذا أكّدها العقد.
   - Enrollment: semester FK/status/timestamps وقيد uniqueness الصحيح.
   - قيود score/max_score/weight/status/role/gender والتواريخ باستخدام Pydantic + DB checks حيث يلزم.
4. تعريف `ondelete` وORM cascades لكل علاقة، مع قرار صريح: حذف المستخدم hard-delete أم deactivate. التوصية: deactivate للمستخدمين، ومنع حذف Department/Semester/Course المرتبط إلا بسياسة موثّقة.
5. migration بيانات من الحقول النصية الحالية (`department`, `semester`) إلى FKs مع سجل unmapped rows.
6. أخذ نسخة احتياطية من `backend/edusmart.db` قبل أي ترقية فعلية؛ التجربة أولًا على نسخة مؤقتة.
7. جعل `seed_data.py` idempotent وحتميًا عبر seed ثابت، وعدم احتوائه كلمات مرور افتراضية صالحة للإنتاج.

### بوابة التحقق

- `alembic upgrade head` يعمل من قاعدة فارغة ومن نسخة قاعدة المشروع.
- downgrade/upgrade لدورة واحدة يعمل على قاعدة اختبار.
- لا سجلات يتيمة؛ `PRAGMA foreign_key_check` فارغ.
- تشغيل backend من root أو `backend/` يصل إلى نفس DB المحددة.
- seed مرتان لا يكرر البيانات.

### ممنوع

- تعديل قاعدة البيانات الحالية يدويًا.
- حذفها وإعادة seed باعتبار ذلك migration.
- جمع FK cascade وORM cascade بلا اختبار deletion policy.

## 6. المرحلة P3 — توحيد عقد API وإكمال الإدارة والسجل الأكاديمي

### ما يُنفذ

1. إنشاء request/response schemas صريحة لكل endpoint وعدم إرجاع dicts غير موثقة للوظائف الأساسية.
2. تنفيذ Admin CRUD الذي تطلبه الواجهة: dashboard، departments، semesters، lecturers، students، courses، enrollments، search، وإزالة enrollment.
3. تنفيذ lecturer academic endpoints الناقصة: تفاصيل طالب مقرر، grade summary update، assessments list/CRUD، submissions/grade، attendance summary/by-date/bulk، وmaterials CRUD/upload.
4. إصلاح student upload/submit/material-detail paths أو تعديل العميل وفق العقد المعتمد؛ لا تبقى نسختان متعارضتان لمسار materials.
5. توحيد pagination/filter/sort، codes 201/204/400/403/404/409/422، وشكل الخطأ.
6. حذف `skeleton_routes.py` بعد استبدال كل وظيفة؛ health يبقى route مستقلًا، وميزة غير مقررة تعيد 501 أو تُخفى من UI بدل نجاح وهمي.
7. إضافة OpenAPI contract snapshot واختبار آلي يفشل إذا استدعت ملفات API method/path غير موجود.

### بوابة التحقق

- مطابقة 100% بين `src/api` وOpenAPI للوظائف المتاحة.
- Admin smoke flow: إنشاء قسم → فصل → مدرس/طالب → مقرر → enrollment → تعديل → deactivate/remove.
- Lecturer flow: رؤية مقرراته فقط، تحديث حضور ودرجات طالب مسجل، ورفع/حذف مادة.
- Student flow: يرى فقط مقرراته ودرجاته وحضوره ومواده.
- لا يحتوي backend على كلمة `placeholder` في route إنتاجي.

## 7. المرحلة P4 — تنفيذ assessments والواجبات والمشاريع والاختبارات

### نموذج المجال

- `Assessment`: course, type (`assignment|project|quiz`), title, description, start/end/due times, max_score, status, timestamps.
- `Submission`: assessment, student, file/storage key, submitted_at, marks, feedback, graded_by/at، uniqueness حسب سياسة المحاولات.
- `QuizQuestion`: quiz assessment, sanitized rich text, marks, position.
- `QuizOption`: question, text, is_correct, position؛ ويجب وجود خيار صحيح وفق نوع السؤال.
- `QuizAttempt`: quiz, student, started/end/submitted timestamps, status, score, version؛ قيد attempt المفتوح.
- `QuizAnswer`: attempt, question, selected_option, saved_at؛ unique لكل attempt/question.

### سلوك المعاملات

1. إنشاء quiz/questions/options ضمن معاملات واضحة.
2. start يعيد attempt القائم أو ينشئ واحدًا بشكل idempotent، ويحسب deadline من الخادم.
3. autosave يعمل upsert ويتحقق أن option يتبع question وأن attempt للطالب وحالته مفتوحة.
4. submit يستخدم transaction/locking مناسب، idempotent، يحسب العلامة مرة واحدة، ولا يقبل إجابات بعد الموعد.
5. لا تُرسل `is_correct` أو الإجابات الصحيحة للطالب قبل submit/سياسة نشر النتيجة.
6. حذف quiz له سياسة صريحة عندما توجد attempts؛ التوصية archive بدل hard-delete.
7. نتائج المدرس والتحليلات تُحسب من submitted attempts فقط؛ نتائج الطالب لا تكشف بيانات غيره.

### بوابة التحقق

- كل API في مقاطع quiz/assessment داخل `studentApi.js` و`lecturerApi.js` يعمل بعقد موثق.
- اختبارات سباق: start مرتان، autosave متزامن، submit مرتان، submit عند deadline.
- مجموع marks للأسئلة متوافق مع max_marks أو تُشتق max_marks منه بمصدر واحد للحقيقة.
- E2E: المدرس ينشئ اختبارًا، الطالب يبدأ/يستأنف/يجيب/يسلم، ثم تظهر النتيجة والتحليلات الصحيحة.

## 8. المرحلة P5 — تصحيح خط ML والتنبؤات

### ما يُنفذ

1. تعريف schema/version واحد لميزات OULAD وAXI، مع ranges ووحدات ومصدر كل ميزة.
2. نقل اشتقاق الميزات إلى service نقي قابل للاختبار؛ لا تُحسب بصيغ مختلفة في route وseed وnotebook.
3. إصلاح weighted grade إلى صيغة موثقة تطابق التدريب: `normalized_score = 100 * score / max_score` ثم `weighted_grade += normalized_score * weight_percent / 100`. يجب أولًا تثبيت أن الوزن نسبة مئوية وأن المجموع تراكمي؛ إذا اختير weighted average بدلًا منه فإعادة التدريب إلزامية.
4. استبدال استبعاد الامتحان المبني على النص (`Exam` مقابل `Final`) بحقل category/`include_in_prediction`؛ الاختبارات النهائية لا تدخل ميزات التنبؤ إطلاقًا.
5. حسم تعريف `Days_Active`: التدريب الحالي يستخدم أكبر قيمة `date` بينما الإنتاج يعد الأيام المختلفة. القرار الموصى به هو unique active days مع إعادة تدريب OULAD، وإعادة تسمية `StudentFeature.date` إلى `days_active` عبر migration.
6. إعادة تسمية `Pass_rate` إلى `assessment_submission_rate` لأن notebook يحسب assessments taken / total، وحسابه آليًا من التقييمات المتوقعة بدل قيمة يدوية/صفر افتراضي.
7. ربط TMA/CMA بـassessment category ثابت لا بعناوين مثل `Midterm` أو `Assignment1`.
8. تغليف preprocessing + model في Pipeline واحد أو تخزين manifest يحوي feature order، dtypes، sklearn version، classes، decision policy، dataset/version، checksum.
9. تصحيح تدريب OULAD: split قبل scaler fit، `stratify=y` وrandom seed؛ أي scaling يبقى داخل Pipeline. القياس المنشور حاليًا لا يُعتمد لأنه fit قبل split.
10. توحيد سياسة AXI: notebook يفرض H عند probability ≥ 0.40 بينما الإنتاج يستخدم argmax. تُخزن threshold في manifest وتُطبق نفسها أو يُعاد تقييم argmax وتوثيق metrics الجديدة.
11. ربط `predict_proba` بـ `model.classes_` لا بفهرس ثابت، والتحقق من `n_features_in_`/`feature_names_in_` ومنع التنبؤ غير المقيس إذا فشل scaler.
12. تحميل artifacts موثوقة محليًا فقط مع SHA-256 allowlist؛ `joblib` لا يُستخدم لملف يرفعه مستخدم، ولا تُخلط model/scaler من إصدارين.
13. readiness endpoint يعرض جاهزية كل model دون كشف paths/secrets؛ prediction يرجع 503 منظمًا إن لم يحمّل artifact.
14. كل prediction لطالب/مقرر يتطلب lecturer ownership + enrollment؛ batch prediction يرفض IDs خارج النطاق.
15. نقل inference المكرر من `prediction_routes.py` و`lecturer_routes.py` إلى `PredictionService` واحد.
16. تحويل notebook-only training إلى scripts حتمية ببيئة وdata checksums مثبتة؛ إصلاح مسار إخراج AXI ليصل إلى root `Saved_Models`.
17. جعل seed حتميًا بـlocal seeded RNG وعدم استخدام تنبؤات مختلقة كـgolden truth.

### بوابة التحقق

- golden feature vectors تنتج القيم نفسها بين notebook وbackend.
- اختبارات حدود ونواقص وfeature order وclass-probability mapping خضراء.
- weighted_grade يطابق أمثلة notebook/golden المتفق عليها ولا يتضمن final exam.
- تعريف Days_Active وسياسة AXI في التدريب والإنتاج متطابقان.
- model manifest/checksum/version مسجل، ولا warning عدم تطابق sklearn عند التحميل.
- لا تُقبل نتيجة ML كحقيقة أكاديمية؛ UI يوضح أنها مؤشر احتمالي مع زمن إصدار النموذج.

## 9. المرحلة P6 — خدمة Chatbot/RAG آمنة وقابلة للاختبار

### ما يُنفذ

1. فصل `ChatContextService`, `MaterialRetrievalService`, و`LLMProvider` عن routes.
2. بناء السياق من resource-authorized queries فقط؛ `course_id` مطلوب عندما قد يكون الاختيار ملتبسًا، ولا اختيار صامت لأول مقرر.
3. اعتبار نص المواد ومحتوى المستخدم بيانات غير موثوقة: delimiting واضح، تعليمات system ثابتة، وعدم السماح للنص المسترجع بتغيير الصلاحيات أو طلب أسرار.
4. اتخاذ قرار خصوصية موثق قبل إرسال الاسم/العمر/المدينة/الدرجات والسلوك إلى Groq؛ تطبيق data minimization، disclosure/consent وسياسة retention، واستخدام معرفات مستعارة حيث لا تحتاج الإجابة الهوية.
5. إصلاح RAG فعليًا: الكود الحالي يجمع النص المستخرج لكن prompt يستخدم عناوين المواد فقط. تُسترجع مقاطع المحتوى المرتبطة بالسؤال مع citation داخلية للمادة بدل الادعاء بأن كل المادة دخلت السياق.
6. تحديد حد المواد/tokens واسترجاع مقاطع مرتبطة بدل حقن كل النص؛ تخزين extraction status/error منفصلًا عن content.
7. إعداد provider model/timeout/retry من Settings، وعدم طباعة جزء من API key، وتحويل أخطاء provider إلى أخطاء مستقرة أو fallback معلن بوضوح.
8. rate limiting، audit metadata بلا prompt/PII كامل، وسياسة retention للملفات والمحادثات.
9. TTS إما تنفيذ حقيقي بعقد واضح أو إزالة زر/endpoint placeholder.

### بوابة التحقق

- اختبارات context isolation بين طالبين ومدرسين ومقررين.
- اختبارات prompt injection من material ومن user query لا تتجاوز scope.
- اختبارات provider timeout/429/5xx/no-key والفallback.
- logs لا تحتوي API keys أو نصوص طلاب كاملة.

## 10. المرحلة P7 — تحديث الواجهة وربطها بالعقد الحقيقي

### ما يُنفذ

1. نقل SPA من `react-scripts`/CRA إلى Vite طبقًا لدليل الهجرة الرسمي، مع Node LTS مثبت وlockfile نظيف.
2. تحويل env من `REACT_APP_API_BASE_URL` إلى `VITE_API_BASE_URL`، وتحديث scripts إلى `dev/build/test/lint` باستخدام Vitest + jsdom.
3. إبقاء React Router 7 declarative واتباع imports/API الموثقة؛ إضافة route-level error/loading states وعدم استخدام redirects لإخفاء أخطاء API.
4. بناء test render wrapper يضم Router وAuthProvider، واستخدام MSW لمحاكاة API بدل mock Axios internals.
5. إصلاح `App.test.js` الافتراضي واستبداله باختبارات login/guards/role routing/401/403/network errors.
6. توحيد API client: refresh مرة واحدة، queue للطلبات أثناء refresh، logout منظم عند الفشل، `AbortController` للطلبات الملغاة، ورسالة خطأ موحدة للمستخدم.
7. ربط صفحات Admin/Lecturer/Student بالعقد المنفذ وحذف dead APIs/components والصفحات التي لا قرار لها.
8. إضافة accessibility checks أساسية، sanitization لكل rich HTML، ومنع عرض HTML غير منقّى.

### بوابة التحقق

- `npm run lint`, `npm test`, `npm run build` خضراء بلا تحذيرات من كود المشروع.
- اختبارات role guards لا تعتمد على نصوص تنفيذية هشة.
- MSW يغطي success/validation/401/403/404/409/422/500/network timeout.
- لا request في browser يذهب إلى endpoint خارج OpenAPI.

## 11. المرحلة P8 — التحقق النهائي وCI والإصدار

### طبقات الاختبار المطلوبة

- Backend unit: services، validators، authorization dependencies، feature engineering.
- Backend integration: FastAPI `TestClient` + DB منفصلة + dependency overrides ومعاملات اختبار.
- Database migration: empty/current-copy upgrade وforeign-key integrity.
- Frontend component/integration: Vitest + React Testing Library + MSW.
- Contract: OpenAPI مقابل كل API client call وresponse fixtures.
- ML golden/regression: feature vectors، class mapping، checksum، metrics tolerance.
- E2E: Playwright لثلاثة أدوار والسيناريوهات الأكاديمية الحرجة.
- Security regression: IDOR matrix، JWT، traversal، upload limits، HTML/prompt injection، rate limits.

### CI gates

1. Python compile + lint/format/type check المتفق عليه.
2. `pytest` مع حد تغطية يبدأ 70% ويرتفع إلى 85% للـ services/auth/domain الحرجة.
3. Frontend lint/test/build.
4. Migration checks وOpenAPI contract check.
5. Dependency audit (`pip-audit`, `npm audit`) وsecret scan وartifact checksum verification.
6. E2E على قاعدة مؤقتة وبدون اتصال Groq حقيقي؛ provider mock إلزامي.

### اختبار قبول الإصدار

1. تثبيت المشروع من clone نظيف حسب README.
2. إعداد env من examples مع secrets اختبار مولدة.
3. migration + seed + backend startup + readiness.
4. build وتشغيل الواجهة.
5. تنفيذ flows: Admin setup، Lecturer attendance/grades/material/quiz، Student course/attempt/result/chatbot.
6. تجربة مستخدم من كل دور للوصول إلى IDs خارج نطاقه والتأكد من الرفض.
7. ترقية نسخة من DB الحالية والتحقق من counts والعينات قبل/بعد.
8. توثيق rollback: استعادة DB، الرجوع إلى artifact checksums، وإعادة نشر النسخة السابقة.

## 12. تقسيم التنفيذ إلى Pull Requests قابلة للمراجعة

1. `test: baseline harness and contract inventory` — P0 وبداية P8.
2. `security: centralized resource authorization and auth hardening` — P1 auth/RBAC.
3. `security: unified safe file storage` — بقية P1.
4. `db: alembic and normalized academic schema` — P2.
5. `api: admin and academic contract completion` — P3.
6. `feat: transactional assessments and quizzes` — P4.
7. `fix: versioned ML feature and inference pipeline` — P5.
8. `fix: scoped chatbot context and provider service` — P6.
9. `build: migrate frontend from CRA to Vite and restore tests` — P7.
10. `ci: full contract/security/e2e release gates` — إغلاق P8.

لا يُدمج PR إذا كان يخفي فشلًا بـ placeholder، يعطّل اختبارًا، يغيّر schema بلا migration، أو يغيّر API بلا تحديث OpenAPI والعميل والاختبارات في نفس PR.

## 13. عناصر خارج النطاق المقصود

- الانتقال إلى PostgreSQL أو cloud deployment يُخطط بعد استقرار العقد على SQLite؛ لكنه لا يمنع كتابة schema portable.
- إعادة تصميم UI بصريًا ليست جزءًا من إصلاح السلوك.
- تحويل المشروع كاملًا إلى TypeScript ليس شرطًا.
- إعادة تدريب النموذج ليست تلقائية؛ تبدأ فقط إذا أثبتت golden/metrics checks أن artifact الحالي غير صالح أو أن تعريف الميزات تغير.
- حذف بيانات المستخدم أو قاعدة البيانات الحالية ممنوع؛ أي migration تُختبر على نسخة وتملك rollback.
