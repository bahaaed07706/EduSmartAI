# CLAUDE.md — EduSmartAI Shared Team Source of Truth

> This file is the single source of truth for every teammate (human or agent).
> Read it before touching the repo. Update it when facts change.

## 0. Start here — live state

**`docs/current-state.md` is the authoritative snapshot.** Read it first; it
carries the branch, remote SHA, commit list, review dispositions, verification
results, blockers, and the exact next task. This file holds the durable rules;
that file holds the changing facts.

At the last verification (2026-07-24):
- Branch `release/v1-hardening`, HEAD == remote == `abf747c`, tree clean.
- PR #1 open to `main`, **CI green**, not merged.
- 94 backend tests pass on Windows *and* ubuntu-latest; ruff clean; build compiles.
- All 10 code-review findings fixed in `0f567e6`.
- Deployment decided (Render) in `docs/deployment-decision.md`, **not executed**.

### Compact instructions

When compacting this session, always preserve:
- Current branch, HEAD, and confirmed **remote** SHA.
- Completed vs. remaining tasks, and the exact next action.
- Agent file ownership (§8) — no two agents edit one file.
- Test, build, a11y and audit results **with their numbers**.
- Data-protection decisions (§5) and why each was made.
- RAG and ML limitations — especially that **OULAD 97.9% is leakage-inflated**
  and is never to be presented as reliable early prediction.
- GitHub PR and CI status.
- The prohibitions: no force push, no `reset --hard`, no history rewrite, no
  deleting data or secrets.

Discard: superseded plans, resolved exploration, repeated command logs, and
failed attempts that were already corrected.

## 1. Project purpose & target users
EduSmartAI is an AI-assisted educational management platform (graduation project,
portfolio-grade). Three roles:
- **Admin** — manages departments, semesters, lecturers, students, courses, enrollments.
- **Lecturer** — manages assigned courses: attendance, grades, students, materials, (planned) quizzes.
- **Student** — views own courses, grades, attendance, materials, predictions; uses the chatbot.

Core value: early academic-risk signals (ML) + a context-grounded academic chatbot.

## 2. Architecture
- **Backend:** FastAPI (`backend/`), SQLAlchemy 2 ORM, SQLite (`backend/edusmart.db`),
  JWT auth (`python-jose`), routers under `/api/v1`.
- **Frontend:** React 18 (CRA) + Tailwind (`edusmartai-frontend/`), Axios client, React Router 7.
- **AI/ML:** scikit-learn RandomForest models in `Saved_Models/*.joblib` (OULAD + AXI);
  chatbot via Groq (`llama-3.3-70b-versatile`) with graceful local fallback.
- **Runtime env:** Python **3.12** (numpy 1.26.3 won't build on 3.13+); Node 18+.
  Backend venv at `backend/venv` (created with `uv venv --python 3.12`).

## 3. Completed work (verified this project)
- P0 security: chatbot IDOR fixed; API-key log leak removed; honest `ai_powered`;
  provider errors fall back without leaking config; `JWT_SECRET` weak-secret guard
  (startup fails on default/short); open `/uploads` static mount removed →
  protected `GET /files/{id}/download` with path-traversal guard.
- ML: target-leakage fix (exclude `Final`/`Exam`), weighted-grade normalized 0–100,
  `scikit-learn==1.7.2` pinned to match artifacts (no InconsistentVersionWarning),
  `debug_values` removed. Chatbot injects bounded material-text snippets.
- Schema migration (`backend/migrate_schema.py`): additive + idempotent; adds
  departments/semesters/notifications + FK columns; backfills student/lecturer
  numbers, dept links, final grades. Verified idempotent, row-counts preserved.
- Admin CRUD (`routes/admin_crud_routes.py`), lecturer attendance/grades-summary +
  ownership IDOR fix, notifications (`routes/notification_routes.py`).
- Tests: 11 passing (`backend/tests/`). Frontend production build green.
- Fixed real 500: `student_routes` `int('Fall 2024')`.

## 4. Status (Phases A–H) — all achievable work done + verified
- **Phase A (data protection): DONE** — admin deletes are soft (deactivate/archive/withdraw); historical data never removed; deactivated users blocked from login. 3 tests.
- **Phase B (quiz/assessment engine): DONE** — full MCQ quiz (auto-graded, is_correct never leaked pre-submit) + file-submission assessments (manual grade) + multi-file materials + /files/upload. 10 tests. Consumed contract gap = 0 (4 dead frontend methods remain, no page calls them).
- **Phase C (frontend quiz + states): DONE** — student quiz flow verified E2E in browser (100% auto-graded); axios 401 auto-logout + console-noise cleanup.
- **Phase E (chatbot): DONE** — honest classification (context injection, NOT RAG), safety rules in prompt, injection/authz/resilience eval (8 tests). Live-Groq quality BLOCKED (no key).
- **Phase F (ML): DONE** — feature order/scale/class-mapping proven == training; golden tests (5). AXI argmax vs notebook threshold documented.
- **Phase G (security/quality/CI): DONE** — ruff clean, CI workflow, secret scan clean, security review (no HIGH/MEDIUM). pip-audit blocked by non-ASCII path.
- **Phase H (release verification): DONE** — 37 tests, build, all-role smoke, fresh-clone reproducibility verified, data integrity intact.

### Genuinely remaining (NOT done — honest)
- **Phase D: product/UX redesign + WCAG 2.2 AA accessibility audit** — not performed.
- **Live-Groq answer quality** — unverified (needs a real gsk_ key).
- Submitted assessment files have no serving/download endpoint yet.
- `datetime.utcnow()` deprecation warnings (tech debt, non-blocking).
- `pip-audit` / security-review diff extraction fail on the non-ASCII OneDrive path (run in CI/ASCII path).

## 5. Data-preservation rules (HARD CONSTRAINTS)
- **NEVER** delete or overwrite `backend/edusmart.db`, `Saved_Models/*`, `backend/uploads/*`,
  training data, or historical records.
- **NEVER** re-seed over the live DB. `seed_data.py` is for fresh setups only.
- Any schema change: back up first, test twice on a copy, verify idempotency,
  verify row counts + IDs unchanged. Migrations are additive only (no DROP).
- User-facing deletes must be soft (archive/deactivate) or blocked when history exists.
  Hard deletes allowed ONLY in disposable in-memory test DBs.
- Baseline row counts (must stay constant): users=14, courses=4, enrollments=40,
  grades=240, attendances=560, course_materials=6, student_features=40, student_vle=363.

## 6. Security constraints
- No secret ever printed/logged (not even a prefix). `.env` stays untracked.
- Every resource endpoint enforces ownership/enrollment, not just role.
- JWT secret must be strong; app refuses weak/default at startup.
- Uploads: validated extension, size cap, path-traversal-safe, auth-gated download.
- CORS origins come from env; production must not use `*`.
- Chatbot: authorized context only, minimize PII, treat retrieved text as untrusted data.

## 7. Coding & testing standards
- Backend: keep FastAPI dependency-injection style; explicit Pydantic schemas for new
  endpoints; ownership checks via shared helpers; no bare `except:`; no silent pass.
- Response shapes MUST match what the consuming React page reads (verify in the page, not just api/*.js).
- Every new endpoint gets a positive + negative (authz) test.
- Run `pytest -q` (from `backend/`) after backend changes; `CI=true npm run build` after frontend.
- No task is "done" without evidence (diff / command output / test / API response / screenshot).

## 8. Agent file ownership (no two agents edit the same file)
- **Lead (this session)** — integration owner. EXCLUSIVELY owns shared foundation:
  `models.py`, `schemas.py`, `database.py`, `config.py`, `main.py` (router registration),
  `migrate_schema.py`, and all cross-cutting merges.
- **Backend/Data** — `routes/*_routes.py` for its feature (quiz/assessment), new route modules.
- **Frontend/UI** — `edusmartai-frontend/src/**` only.
- **AI/ML** — `routes/chatbot_routes.py`, `routes/prediction_routes.py`, ML eval scripts/tests.
- **QA/Security** — `backend/tests/**`, eval datasets; read-only elsewhere; runs verification.
- **Product/Domain reviewer** — read-only; reviews usefulness, flags fake analytics.
- Subagents dispatched by Lead are **read-only recon/review** unless Lead serializes a write slice.

## 9. Definition of Done (per task)
1. Implemented with matching request/response contract.
2. Positive + negative automated tests added and passing.
3. No new console/network 4xx-5xx on the affected page (browser-verified where UI).
4. Data-preservation rules respected (verified counts).
5. Evidence captured (diff/output/screenshot). QA independently re-verifies.

## 10. Release acceptance criteria (final gate)
- No unresolved Critical/High security issue.
- No destructive data path violating the preservation policy.
- Quiz/Assessment works end-to-end (create→publish→attempt→submit→grade→results).
- No critical frontend request returns 404/500; all three roles complete primary flows.
- Production build passes; required tests pass; browser E2E passes.
- Chatbot honestly classified; ML runtime matches training; migrations idempotent.
- README matches implementation; fresh clone runs per README; no secrets tracked; data integrity intact.
- Any un-verifiable item is recorded with the exact blocker + evidence needed (not claimed done).
