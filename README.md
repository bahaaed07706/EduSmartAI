<div align="center">

<img src=".github/assets/logo.svg#gh-light-mode-only" alt="EduSmartAI" width="300">
<img src=".github/assets/logo-dark.svg#gh-dark-mode-only" alt="EduSmartAI" width="300">

### Notice a struggling student while there is still time to help them.

An academic management platform that brings attendance, grades and quiz results
into one record per student — with a risk signal from a trained model and an
assistant grounded in each student's own course material.

[![Live frontend](https://img.shields.io/badge/Live_frontend-Vercel-000?logo=vercel)](https://edusmartai-frontend.vercel.app)
&nbsp;[![Live API](https://img.shields.io/badge/Live_API-Render-46E3B7?logo=render&logoColor=000)](https://edusmartai-api.onrender.com/health)
&nbsp;[![Documentation](https://img.shields.io/badge/Documentation-docs-1d4ed8)](#documentation)
&nbsp;[![Architecture](https://img.shields.io/badge/Architecture-diagram-0ea5e9)](#architecture)

[![CI](https://github.com/bahaaed07706/EduSmartAI/actions/workflows/ci.yml/badge.svg)](https://github.com/bahaaed07706/EduSmartAI/actions/workflows/ci.yml)
&nbsp;[![License: MIT](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)
&nbsp;![Python 3.12](https://img.shields.io/badge/python-3.12-blue)
&nbsp;![Node 24](https://img.shields.io/badge/node-24-green)

<br>

<img src="docs/screenshots/student-dashboard-1440.png" alt="EduSmartAI student dashboard" width="900">

</div>

> **Deployment status:** both halves are live. The API runs on Render at
> [`edusmartai-api.onrender.com`](https://edusmartai-api.onrender.com/health) and
> the interface on Vercel at
> [`edusmartai-frontend.vercel.app`](https://edusmartai-frontend.vercel.app).
>
> Both run on free plans, which is visible in two ways: the **first request after
> ~15 minutes idle takes about a minute** while the service wakes and
> deserialises the model, and the database is rebuilt on every boot — so anything
> you change, and any file you upload, is discarded when the service restarts.
> That reset is deliberate, not a defect: every visitor starts from the same
> clean dataset. Details and the durable-deployment upgrade path are in
> [release-handoff.md](docs/release-handoff.md).

---

## The problem

Students who fail a course rarely fail suddenly. The signals appear weeks
earlier: attendance drops, material goes unopened, an early assignment comes
back weak. Those signals exist — but they live in different systems, and nobody
assembles them until final grades are submitted. By then it is too late to act.

EduSmartAI puts those signals in one place and adds two things: a risk
classification from a trained model, and an assistant that answers a student's
questions using only the course material they are actually enrolled in.

## What it does

**Administrators** manage the academic structure — departments, semesters,
courses, lecturers, enrolments. Records are never destroyed: users are
deactivated, courses archived, enrolments withdrawn. Deleting something with
history attached returns a clear refusal rather than silently dropping rows.

**Lecturers** run their own courses: attendance, grades, materials, auto-graded
quizzes, and file-submission assessments with manual grading. The quiz results
page shows per-question difficulty, so a lecturer can see which concept the
class missed rather than only who scored badly.

**Students** see their own record, attempt quizzes with immediate results,
submit assessment files, and ask the assistant about their material.

## Product tour

Every image below is a real screenshot of the running application on synthetic
demo data — no mockups.

**Admin — the academic structure.** Departments, semesters, lecturers, students,
courses and enrolments in one place, with guards that refuse to destroy records.

<img src="docs/screenshots/admin-dashboard-1440.png" alt="Admin dashboard" width="900">

**Lecturer — teaching at a glance.** Each lecturer sees only their own courses,
with attendance, grades, materials and quiz results.

<img src="docs/screenshots/lecturer-dashboard-1440.png" alt="Lecturer dashboard" width="900">

**Student — where they stand, and what to do next.** Grades, attendance,
quizzes with immediate results, and the course assistant.

<img src="docs/screenshots/student-dashboard-1440.png" alt="Student dashboard" width="900">

### Built for the phone, not shrunk onto it

A designed mobile layout at 390px, including the accessible navigation drawer
(focus-trapped, Escape to close, backdrop dimming the page behind it).

<p>
  <img src="docs/screenshots/login-390.png" alt="Login on mobile" width="250">
  <img src="docs/screenshots/student-dashboard-390.png" alt="Student dashboard on mobile" width="250">
  <img src="docs/screenshots/mobile-navigation-390.png" alt="Mobile navigation drawer" width="250">
</p>

## The AI assistant, and what "RAG" means here

Many projects describe context injection as retrieval-augmented generation.
This one did too, until an audit caught it — the chatbot was pasting material
*titles* into the prompt and calling it retrieval. That was replaced with actual
retrieval.

```mermaid
flowchart LR
    subgraph index [Indexing &mdash; runs once, when a lecturer uploads material]
        direction LR
        A[Material<br/>PDF / DOCX / PPTX] --> B[Text extraction]
        B --> C[Chunking<br/>500 chars, 100 overlap]
        C --> D[(TF-IDF index<br/>char n-grams 3-5)]
    end

    subgraph query [Retrieval &amp; answer &mdash; runs on every student question]
        direction LR
        E[Student question] --> F{Authorization mask}
        F -->|allowed courses only| H[Cosine ranking]
        H --> I{Top score >= 0.25?}
        I -->|no| J[Abstain:<br/>nothing invented]
        I -->|yes| K[Grounded answer<br/>+ citations]
    end

    G[(Enrolment<br/>in database)] --> F
    D --> H
```

Two details matter more than the ranking method.

**The authorization mask is applied before scoring, not after.** The set of
courses a user may retrieve from is derived from the database — enrolment for
students, ownership for lecturers, empty for admins — and restricts candidates
before any similarity is computed. A student cannot surface content from a
course they are not enrolled in, regardless of how the question is phrased.
There are tests for exactly this, including prompt-injection attempts.

**It abstains.** Below a cosine score of 0.25 the system declines rather than
answering from weak evidence.

Retrieval is lexical — TF-IDF over character n-grams, not dense embeddings.
That is deliberate: the corpus is mixed Arabic and English, and Arabic is
morphologically rich enough that word-level tokenisation retrieves poorly. The
trade-off is that synonyms sharing no characters will not match. On a 12-query
bilingual evaluation set, precision@1, recall@3 and MRR are all 1.00 — a set
small enough that the honest reading is "the mechanism works," not "retrieval is
solved."

Details in [docs/rag.md](docs/rag.md).

## Machine learning, and an important caveat

| Model | Predicts | Accuracy | ROC-AUC | n |
|---|---|---|---|---|
| AXI | Performance class (3-way) | 0.7917 | 0.9219 | 96 |
| OULAD | Pass / fail | 0.9790 | 0.9937 | 2811 |

**The OULAD figure is inflated by target leakage and must not be read as
reliable early risk prediction.** A `Pass_rate` feature derived from the outcome
leaked into training, so the model is largely reading the answer rather than
predicting it. Presenting 97.9% as an early-warning capability would be wrong.
Fixing it properly — rebuilding features with a strict temporal cutoff — is the
top open item on the [roadmap](docs/roadmap.md). The number will fall
substantially, and that is the point.

Also found and fixed: a **training/serving skew**. `Days_Active` was computed as
`max(date)` during training but as a count of distinct days at inference, so the
deployed model was reading a feature that meant something different from the one
it learned. That class of defect produces quietly wrong predictions with no
error anywhere, which is why
[`scripts/evaluate_models.py`](scripts/evaluate_models.py) exists as a
reproducible, read-only check. Full detail in
[docs/ml-evaluation.md](docs/ml-evaluation.md).

## Architecture

```mermaid
flowchart TB
    subgraph client [Browser]
        R[React 18 + Tailwind<br/>React Router 7]
    end

    subgraph api [FastAPI backend]
        AUTH[JWT auth<br/>+ per-resource authorization]
        ROUTES[Admin / Lecturer / Student<br/>Quiz / Assessment routes]
        RAG[Retrieval layer<br/>TF-IDF + auth mask]
        ML[Prediction<br/>RandomForest]
    end

    subgraph data [Storage]
        DB[(SQLAlchemy 2<br/>SQLite / PostgreSQL)]
        FILES[/Uploads<br/>auth-gated download/]
        MODELS[/Saved models<br/>16 MB joblib/]
    end

    GROQ[Groq LLM<br/>optional]

    R -->|HTTPS + Bearer| AUTH
    AUTH --> ROUTES
    ROUTES --> DB
    ROUTES --> FILES
    ROUTES --> RAG
    ROUTES --> ML
    RAG --> DB
    RAG -.->|grounded prompt| GROQ
    GROQ -.->|local fallback if absent| RAG
    ML --> MODELS
```

The chatbot degrades gracefully: with no API key configured it falls back to
local responses and the API reports `ai_powered: false` rather than claiming
capability it does not have.

## How a risk signal becomes an action

```mermaid
flowchart LR
    A[Attendance<br/>Grades<br/>Quiz results] --> B[Per-student record]
    B --> C[Feature engineering]
    C --> D[Risk classification]
    D --> E[Lecturer / admin sees signal]
    E --> F[Intervention]
    F -.->|not yet built| G[Outcome tracked]
```

The dashed step is honest: the product surfaces the signal but does not record
what was done about it. Closing that loop is the highest-value institutional
feature not yet built.

## Security

Authorization is enforced per resource, not per role. Being a lecturer is not
sufficient to read a course — you must own it.

- Quiz option correctness (`is_correct`) is **never** serialised to a student
  before submission.
- A student's submitted `file_url` must reference a file that student uploaded,
  so a submission cannot point at course material or another student's folder.
- Withdrawn students lose access to course material immediately.
- Uploads are never publicly served. Download runs an ownership check first,
  then a path-traversal check.
- The application refuses to start on a weak or default `JWT_SECRET`, and
  refuses to start in production with a wildcard CORS origin.
- Rate limiting caps login attempts, chatbot queries and uploads.
- No secret is logged, not even a prefix.

An audit of this project found six critical issues, including an IDOR that
leaked student PII, grades and predictions to any authenticated lecturer. All
are fixed with regression tests. See [docs/security.md](docs/security.md).

## Verified results

Every number here comes from a command in this repository.

| Check | Result |
|---|---|
| Backend tests | 103 passing, on Windows and Linux |
| Lint (ruff) | clean |
| Production build | compiles |
| Accessibility (axe-core, WCAG 2.0/2.1/2.2 A+AA) | **0 violations**, 6 pages × 3 viewports |
| Responsive audit | **0 issues**, 9 pages × 5 breakpoints (360–1440) |
| Production dependency audit | 2 moderate, down from 59 (2 critical, 29 high) |
| Secret scan | clean |
| Migration idempotency | verified twice on a database copy |

Accessibility and responsiveness are measured, not asserted:
[`scripts/a11y-audit.js`](scripts/a11y-audit.js) runs axe-core against the real
application, and [`scripts/responsive-audit.js`](scripts/responsive-audit.js)
measures overflow, touch-target size and clipped text inside the page.

## Quick start

Requires Python 3.12 and Node 24.

```bash
git clone https://github.com/bahaaed07706/EduSmartAI.git
cd EduSmartAI
```

**Backend:**

```bash
cd backend
python -m venv venv
# Activate the virtual environment:
#   Linux / macOS:   source venv/bin/activate
#   Windows (PowerShell):  venv\Scripts\Activate.ps1
#   Windows (Git Bash):    source venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` — the app will not start without a strong `JWT_SECRET`:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Seeding a fresh database also requires `SEED_ADMIN_PASSWORD`,
`SEED_LECTURER_PASSWORD` and `SEED_STUDENT_PASSWORD`, 12+ characters each.
There are no default passwords, by design.

```bash
python migrate_schema.py
python seed_data.py          # fresh databases only — never over existing data
uvicorn main:app --reload
```

**Frontend** (from the repository root, in a second terminal):

```bash
cd edusmartai-frontend
npm ci
REACT_APP_API_BASE_URL=http://127.0.0.1:8000 npm start
```

Health checks: `/health` for liveness, `/ready` to confirm the database responds
and the models deserialised.

## How a deploy boots

Every push to `main` that Render picks up runs the same three commands, in this
order, before a single request is served. The order is not cosmetic — two of
these steps were in the wrong place until the sequence was actually run.

```mermaid
flowchart TB
    A[Render Blueprint<br/>render.yaml, free plan] --> B[Build<br/>pip install -r requirements.txt]
    B --> C[migrate_schema.py<br/>create tables, additive ALTERs]
    C --> D{seed_boot.py<br/>DEMO_RESET_ON_BOOT set?}
    D -->|no| G[uvicorn main:app<br/>existing data untouched]
    D -->|yes| E[Validate SEED_* passwords<br/>before anything is dropped]
    E --> F[reset_demo_data<br/>drop, reseed, then re-migrate]
    F --> G
    G --> H[Model load<br/>14.3 MB RandomForest, ~206 MB RSS]
    H --> I[/ready<br/>database: true, models: true/]
```

Two details that only surfaced by running it:

**Credentials are validated before the drop.** A missing `SEED_*_PASSWORD`
discovered *after* the tables were gone would leave the service with an empty
database and no way to refill it.

**The migration runs again after seeding.** Departments, semesters and their
foreign keys are backfilled onto rows that already exist — running it only
before the seed left every student with a `NULL` department.

The reset switch is deliberately independent of `ENVIRONMENT`. The demo needs
`ENVIRONMENT=production` for its security posture (no API docs, HSTS,
exact-origin CORS) *and* a rebuilt dataset; tying both to one variable would
force a choice between a seeded demo and a hardened one.
[`test_demo_seed_gating.py`](backend/tests/test_demo_seed_gating.py) holds that
line.

## Demo accounts

The seeded dataset is entirely synthetic — invented names, invented grades. No
real student appears anywhere in this repository.

| Role | Email | What it shows |
|---|---|---|
| Student | `ahmed@edu.com` | Own courses, grades, attendance, risk signal, chatbot |
| Lecturer | `dr.salem@edu.com` | Assigned courses, attendance and grade entry, materials, quizzes |
| Admin | `admin@edu.com` | Departments, semesters, users, courses, enrolments |

Passwords are not printed here, so this file cannot drift from whatever a given
deployment was seeded with. On a deployment that sets the `REACT_APP_DEMO_*`
variables, the student and lecturer sign-in details are shown on the login
screen itself. The admin account is deliberately never published — assessing the
project does not need destructive access.

> These accounts exist for evaluation only. On the free-tier demo the database is
> rebuilt on every boot, so anything you change is discarded when the service
> restarts, and uploaded files do not survive either.

## How a request is authenticated

Ownership is resolved from the database on every request, never from anything the
client sends. The token carries only an identity claim; what that identity is
allowed to read is looked up server-side each time.

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser<br/>LoginPage.jsx
    participant API as FastAPI<br/>main.py
    participant AUTH as routes/auth_routes.py
    participant DB as SQLAlchemy<br/>models.User
    participant R as routes/student_routes.py

    B->>API: POST /api/v1/auth/login
    API->>AUTH: LoginRequest (schemas.py)
    AUTH->>DB: SELECT user WHERE email = ?
    DB-->>AUTH: user + password_hash
    AUTH->>AUTH: verify_password() — passlib sha256_crypt
    alt bad credentials
        AUTH-->>B: 401 "Invalid email or password"
    else deactivated account
        AUTH-->>B: 403 "Account is deactivated"
    else valid
        AUTH->>AUTH: create_access_token({sub, role})
        AUTH-->>B: 200 TokenResponse + user
        B->>R: GET /api/v1/student/... (Bearer token)
        R->>DB: resolve enrolment for this user id
        DB-->>R: only rows this student owns
        R-->>B: 200 dashboard data
    end
```

The `is_active` check sits after password verification on purpose: answering
"that account is deactivated" before checking the password would confirm the
address exists to anyone who guesses it.

## Documentation

| Document | What it covers |
|---|---|
| [product-positioning.md](docs/product-positioning.md) | Who this is for; ready vs. roadmap |
| [roadmap.md](docs/roadmap.md) | What is next, with effort and rationale |
| [rag.md](docs/rag.md) | Retrieval design and evaluation |
| [ml-evaluation.md](docs/ml-evaluation.md) | Model metrics and the leakage problem |
| [security.md](docs/security.md) | Authorization model and audit findings |
| [design-system.md](docs/design-system.md) | Tokens, components, accessibility rules |
| [deployment-decision.md](docs/deployment-decision.md) | Why Render, and why not serverless |
| [reproducibility.md](docs/reproducibility.md) | Exact commands to regenerate every number |
| [evidence/public-claims-matrix.md](docs/evidence/public-claims-matrix.md) | Every public claim mapped to its evidence |
| [current-state.md](docs/current-state.md) | Verified state, branch, blockers |

Diagrams: [RAG pipeline](docs/diagrams/rag-pipeline.svg) ·
[risk to support](docs/diagrams/risk-to-support.svg) ·
[reproducibility workflow](docs/diagrams/reproducibility-workflow.svg).

## Honest limitations

- **The demo sleeps.** On the free plan the API spins down after ~15 minutes
  idle, so the first request afterwards takes about a minute. It is not broken;
  it is waking up and deserialising a 14.3 MB model.
- **The free-tier demo is not durable.** Uploads and any changes a visitor makes
  are discarded on restart, by design: the dataset is rebuilt on every boot so
  each visitor starts from the same clean state. Nothing here is suitable for
  real student records without the durable-deployment changes in
  [release-handoff.md](docs/release-handoff.md).
- **OULAD accuracy is leakage-inflated** and unusable for early prediction.
- **LLM answer quality is unverified** — no API key has been available. Only the
  retrieval layer and the local fallback are tested.
- **The RAG evaluation set is 12 queries** — enough to demonstrate the
  mechanism, not enough to claim retrieval quality.
- **Accessibility covers 6 of 37 pages.** Those six pass cleanly; the rest are
  unaudited.
- **RTL is partial.** The interface uses logical properties but has no language
  switcher, so full mirroring is unverified.
- **Two moderate advisories remain** in `quill`/`react-quill`, needing a
  breaking upgrade.
- **PostgreSQL support is implemented but unexercised** against a real instance;
  the test suite runs on SQLite.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). One rule up front: no change is "done"
without evidence — a test, command output, or a screenshot.

## License

MIT — see [LICENSE](LICENSE).

## Author

Built by [@bahaaed07706](https://github.com/bahaaed07706) as a graduation
project.

---

<div dir="rtl">

## نبذة بالعربية

**EduSmartAI** منصة لإدارة العملية الأكاديمية تساعد الجامعات على ملاحظة الطالب
المتعثر بينما ما زال الوقت متاحًا لمساعدته.

تجمع المنصة الحضور والدرجات ونتائج الاختبارات في سجل واحد لكل طالب، وتضيف إليه
تصنيفًا لمستوى الخطر الأكاديمي، ومساعدًا ذكيًا يجيب من مواد المقرر المسجَّل فيه
الطالب فقط — مع ذكر المصدر، ومع الامتناع عن الإجابة عند غياب دليل كافٍ.

ثلاثة أدوار: **المشرف** يدير الهيكل الأكاديمي دون أن تُحذف السجلات نهائيًا،
و**المحاضر** يدير مقرراته واختباراته وتقييماته، و**الطالب** يتابع سجله ويؤدي
اختباراته ويقدّم تكليفاته.

**ملاحظة مهمة عن النتائج:** دقة نموذج OULAD البالغة 97.9% **مضخَّمة بسبب تسرّب
الهدف (target leakage)**، ولا يصح تقديمها كتنبؤ مبكر موثوق. المشروع يوثّق هذا
القيد بوضوح بدل إخفائه، وإصلاحه هو البند الأول في خطة التطوير.

الواجهة تعمل من 360 بكسل حتى 1440 بكسل دون أي مشكلة مقاسة، وتجتاز فحص إمكانية
الوصول axe-core بصفر مخالفات على الصفحات المفحوصة.

</div>
