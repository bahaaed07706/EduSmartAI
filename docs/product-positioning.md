# Product positioning

Who this is for, what it currently does, and — just as important — what it does
not yet do. Every capability below is marked against what the code actually
implements. Nothing here is aspirational unless labelled roadmap.

---

## Part 1 — Institutional buyers

The people who would decide to adopt something like this.

### Academic leadership (deans, vice-deans)

**Their problem.** Students who fail a course rarely fail suddenly. The signals —
missed classes, unopened material, a weak first assignment — exist weeks earlier,
but they sit in separate systems and nobody assembles them until grades are
final. By then the intervention window has closed.

**What EduSmartAI does today.** Brings attendance, grades, quiz performance and
engagement into one record per student, and surfaces a risk signal from it.

**What it does not do.** It does not track whether an intervention happened or
whether it worked. That loop is a roadmap item, and without it the product
informs a decision rather than managing a process.

### Academic affairs / registry

**Their problem.** Departments, semesters, enrolments and course assignments are
often maintained across spreadsheets, so the same student exists three times with
three different statuses.

**What EduSmartAI does today.** One admin surface for departments, semesters,
lecturers, students, courses and enrolments, with referential guards: a
department in use cannot be deleted, an enrolment is withdrawn rather than
erased, a user is deactivated rather than removed.

**Why that matters commercially.** Academic records are legally retained. A
system that hard-deletes them is not adoptable. This one is built so history
survives — proven by tests, not by policy.

### Department heads

**Their problem.** They are accountable for outcomes across several courses but
usually see only end-of-term aggregates.

**What EduSmartAI does today.** Per-course rosters, attendance, grade summaries
and quiz difficulty breakdowns, scoped to the courses they own.

### Student-success and retention teams

**Their problem.** They need to know which students to contact this week, not
which cohort underperformed last year.

**What EduSmartAI does today.** A per-student risk classification from the AXI
model (held-out accuracy 0.7917, ROC-AUC 0.9219, n=96).

**The honest caveat.** The second model, OULAD, reports 0.9790 accuracy — and
that number is inflated by target leakage. It must not be used to justify
contacting or not contacting a student. This is documented in
[ml-evaluation.md](ml-evaluation.md) and repeated wherever the number appears.

---

## Part 2 — End users

### Administrator

| | |
|---|---|
| **Primary goal** | Keep the academic structure correct and current |
| **Key workflow** | Create a semester → add courses → assign lecturers → enrol students |
| **Data that matters most** | Enrolment status, course-to-lecturer assignment |
| **Main pain point** | Fear of destroying records with one wrong click |
| **Main screen** | Admin dashboard → Students |
| **Main action** | Enrol or withdraw a student |
| **Trust expectation** | That nothing they do is irreversible. Met: deletes are soft, and destructive paths return a 409 explaining why. |

### Lecturer

| | |
|---|---|
| **Primary goal** | Teach effectively and see who is falling behind |
| **Key workflow** | Take attendance → author a quiz → review results → grade submissions |
| **Data that matters most** | Which questions the class got wrong |
| **Main pain point** | Grading and record-keeping consume preparation time |
| **Main screen** | Course → Quizzes → Results |
| **Main action** | Publish a quiz; read the difficulty breakdown |
| **Trust expectation** | That they see their own courses and no one else's. Enforced by ownership checks on every endpoint, with negative tests. |

### Student

| | |
|---|---|
| **Primary goal** | Know where they stand and what to do next |
| **Key workflow** | Check grades → attempt a quiz → ask the assistant about material |
| **Data that matters most** | Their own marks and attendance |
| **Main pain point** | Feedback arrives too late to act on |
| **Main screen** | Student dashboard |
| **Main action** | Attempt a quiz; get an immediate auto-graded result |
| **Trust expectation** | That classmates cannot see their marks, and that the assistant cannot leak another student's data. Enforced: the chatbot's retrieval allowlist is derived from enrolment in the database and applied before ranking. |

---

## Part 3 — The GitHub audience

### What each reader needs, and when

**Within 10 seconds** — anyone landing on the repository should know: this is an
academic management platform with retrieval-grounded AI assistance and academic
risk prediction, built as a graduation project, with every claim evidenced.

**Within 30 seconds:**

- *Technical recruiter* — real stack (FastAPI, React, scikit-learn), real
  verification (103 tests, CI green, 0 accessibility violations), and evidence
  the author understands security rather than only features.
- *Software engineer* — the architecture diagram, and that authorization is
  enforced per resource rather than per role.
- *AI/ML reviewer* — that "RAG" here means genuine query-dependent retrieval
  with an authorization mask applied before ranking, not context injection; and
  that the ML section leads with a leakage limitation rather than a headline
  accuracy.
- *University supervisor* — that the academic claims are evidenced and the
  limitations are stated.

**Within 2 minutes** — a reader should be able to run it locally from the README
alone, and should have encountered at least three honest limitations. A project
that lists none is either trivial or not being truthful.

### The positioning risk worth naming

The single most attackable claim in this project is the OULAD accuracy figure.
Presented as "97.9% accurate early risk prediction" it would be impressive and
wrong, and any competent reviewer would find the leakage in minutes. Presented
as "we found target leakage inflating this number, here is the evidence, here is
why it must not be used for early prediction," the same finding becomes the
strongest signal of engineering judgement in the repository.

That is the positioning: **honesty as the differentiator.** Most student AI
projects overclaim. This one documents where it is weak.

---

## Production-ready vs. roadmap

**Ready now** — role-based authentication and per-resource authorization; admin
CRUD with preserved history; attendance and grades; auto-graded MCQ quizzes;
file-submission assessments with authorized download; retrieval-grounded chatbot
with citations and abstention; reproducible ML evaluation; WCAG 2.2 AA on the
audited pages; responsive 360–1440.

**Not ready** — production deployment (architecture decided, not executed);
Postgres migration (code supports it, unexercised against a real instance);
intervention tracking; full RTL; live LLM answer-quality evaluation (needs an
API key); accessibility sweep beyond the 6 audited pages.

See [roadmap.md](roadmap.md) for sequencing and rationale.
