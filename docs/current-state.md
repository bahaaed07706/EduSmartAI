# EduSmartAI — current state

Last verified: 2026-08-14 (post-merge of PR #2)

## Branch and SHA

PR #2 has been merged. Development is on `main`.

| | |
|---|---|
| Branch | `main` |
| HEAD | latest on `main` (run `git rev-parse HEAD`; local == remote verified) |
| Latest merge | PR #2 — free-tier deployment and the demo-seed switch |
| Earlier merge | `0639a12` (squash of `release/v1-hardening`, PR #1) |
| Release | [v1.0.0](https://github.com/bahaaed07706/EduSmartAI/releases/tag/v1.0.0) → `0639a12` |
| CI | **green** on `main` — ubuntu and windows |
| Working tree | clean |

## Commit history (most recent first)

| SHA | Purpose |
|---|---|
| `5faa757` | docs: mobile navigation drawer screenshot |
| `1c95714` | docs: record the live Vercel frontend deployment |
| `0639a12` | **merge** — Security, correctness and accessibility hardening (v1) |
| `d4b8536` | initial commit |

The squashed merge folded in: 10 code-review fixes, the fresh-database
migration fix, the Vercel/Render deployment config, the quiz/assessment engine,
genuine RAG, ML evaluation, the design system, and the P0 security fixes.

## Verification results

All re-run on `main`, 2026-08-14.

| Gate | Result | Where |
|---|---|---|
| Backend tests | **124 passed** (103 + 21 demo-seed gating) | CI on ubuntu **and** windows; locally in a venv built from `requirements.txt` alone |
| Coverage | **61.81%**, gate 60% (`backend/.coveragerc`) | CI (ubuntu) |
| mypy | 180 errors, **non-blocking** — almost all SQLAlchemy `Column[...]` false positives | CI, report only |
| ruff | clean | local + CI |
| Production build | compiles, ~218 kB gzip | local + CI |
| axe-core | 0 violations, 6 pages × 3 viewports | local, `scripts/a11y-audit.js` |
| Responsive | 0 issues, 9 pages × 5 breakpoints (360–1440) | local, `scripts/responsive-audit.js` |
| npm audit `--omit=dev` | 2 moderate (quill, react-quill) | local + CI, non-blocking |
| Secret scan | clean; no `.env`, `.db`, uploads or backups tracked | local |
| Migration idempotency | verified fresh + twice on a DB copy, row counts preserved | local |
| Frontend deploy | **live** — https://edusmartai-frontend.vercel.app (Vercel, production, Ready) | Vercel API |
| Backend deploy | **pending** — the blueprint is free-tier and the boot sequence is rehearsed, but the Render service has not been created | — |
| Boot sequence | migrate → seed → uvicorn, all exit 0; `/ready` = `{"database":true,"models":true}`; `/docs` 404 in production; student and lecturer logins HTTP 200 | local rehearsal against a clean tree |
| Demo dataset | deterministic across resets: 14 users, 4 courses, 26 enrollments, 3 departments, 0 students missing a department | local rehearsal |
| Backend memory | 205.8 MB RSS, 214.3 MB peak — fits a 512 MB free instance | local rehearsal |
| Row counts | local development DB unchanged: users=14, courses=4, enrollments=40, grades=240, attendances=560 | local |

The Linux test run matters specifically: it is what proves the file-path fix,
which was previously masked by a test that asserted the failure.

## Code review — all 10 findings fixed in `0f567e6`

| # | Finding | Fix |
|---|---|---|
| 1 | `_resolve_within_uploads` treated `/uploads/...` as absolute on POSIX → every submission download 404'd on Linux | Strip the URL prefix before any `is_absolute()` decision; new `test_upload_path_resolution.py` covers 6 shapes and 11 traversal rejections |
| 2 | `delete_quiz` orphaned `QuizAttempt` rows → later reads 500 | 409 when attempts/answers exist, on quiz, question and option |
| 3 | RAG index cached per-process, never invalidated | Upload and delete now invalidate it |
| 4 | Live passwords hardcoded in `a11y-audit.js` | Moved to env vars — **and two further instances found**: `LoginPage.jsx` printed all three to every visitor, `seed_data.py` hardcoded them |
| 5 | Submission `file_url` was unvalidated client input | Must match the caller's own upload prefix; traversal rejected |
| 6 | Withdrawn students kept material access; unhandled roles fell through | `status != "withdrawn"` added; explicit deny-by-default |
| 7 | `delete_department` ignored linked users | Counts users as well as courses |
| 8 | Inline `onClose` stole focus from the mobile drawer | `useCallback`; also added the Tab focus trap the file claimed but lacked |
| 9 | `update_assessment` bypassed the type allowlist | Same 422 check as create |
| 10 | `quiz_results` N+1 (~1,640 queries) | Bulk loads; three queries |

## Architecture

- **Backend** — FastAPI, SQLAlchemy 2, SQLite, JWT (`python-jose`), routers under `/api/v1`. Python 3.12.
- **Frontend** — React 18 (CRA), Tailwind, Axios, React Router 7. Node 24.
- **ML** — scikit-learn 1.7.2 RandomForest, `Saved_Models/*.joblib` (16 MB).
- **Chatbot** — Groq `llama-3.3-70b-versatile` with a local fallback.

## Retrieval

Lexical, not dense: TF-IDF over character n-grams (3,5), `char_wb`, cosine
ranking. Character n-grams are deliberate — the corpus is mixed Arabic/English
and word tokenisation retrieves poorly on Arabic.

The authorization allowlist is applied **as a mask before scoring** and is
derived from the database (enrolment for students, ownership for lecturers,
empty for admins) — never from request input.

Evaluation, 12-query bilingual set: P@1 = recall@3 = MRR = 1.00. Plus
abstention, cross-course isolation, citation, groundedness and prompt-injection
tests. Abstention threshold 0.25, calibrated because Arabic character n-grams
share more mass across unrelated text than English does.

## ML evaluation and its limits

Read-only. No model was retrained, tuned or overwritten.

- **AXI** — accuracy 0.7917, ROC-AUC 0.9219 (n=96).
- **OULAD** — accuracy 0.9790, ROC-AUC 0.9937 (n=2811).

**The OULAD number is inflated by `Pass_rate` target leakage and must never be
presented as reliable early risk prediction.** This is documented rather than
hidden, and is the honest headline for that model.

A training/serving skew was also found and fixed: `Days_Active` was a count of
distinct days at serving time but `max(date)` in training.

## Data-protection rules (do not violate)

- Never delete or overwrite `backend/edusmart.db`, `Saved_Models/*`,
  `backend/uploads/*`, `Training_Data/*`, or `_backup_*`.
- Never re-seed over the live database.
- Migrations are additive only. Back up, test twice on a copy, verify row counts.
- User-facing deletes are soft (deactivate/archive/withdraw) or blocked with 409
  when history exists.
- Never force-push, never `reset --hard`, never rewrite history.

## Remaining blockers

1. **Deployment is unexecuted.** Architecture chosen (Render — see
   `docs/deployment-decision.md`); running it needs the owner's platform account.
2. **Credential rotation outstanding.** The previously committed demo passwords
   are still valid in the local database and remain in git history. Treat as
   compromised.
3. **Live Groq quality unverified** — no API key. Only the local fallback path
   has been exercised.
4. **`quill` / `react-quill`** — 2 moderate advisories needing a breaking upgrade.
5. **PostgreSQL path unexercised against a real instance** — implemented
   (`database.py` selects engine options per dialect), but the test suite runs
   on SQLite.
6. **a11y scope** — 6 representative pages, not all 37. No Lighthouse. RTL has no
   language switcher, so full mirroring is unverified.

Rate limiting, security headers, `/health` and `/ready` are now implemented
(`backend/main.py`), so the earlier "not implemented" note no longer applies.

## Exact next task

The backend is not yet deployed. In order:

1. Owner provisions Render — render.com → New → Blueprint → connect the repo →
   Render reads `render.yaml` (Postgres 16 + 1 GB disk) → set the `sync:false`
   env values (`CORS_ORIGINS` = the Vercel origin, three `SEED_*_PASSWORD`).
2. Set `REACT_APP_API_BASE_URL` on the Vercel project to the Render origin and
   redeploy the frontend so it talks to the API.
3. Verify login/quiz/assessment/RAG end to end from a clean browser at
   360/390/768/1024/1440.
4. Rotate the previously committed demo passwords (still valid in the local DB
   and in git history).

## Commands to resume safely

```bash
git fetch --all --prune
git switch main
git status                      # expect clean
git rev-parse HEAD              # local == remote
gh pr view 1                    # MERGED
gh run list --branch main --limit 1

cd backend && ./venv/Scripts/python.exe -m pytest -q     # expect 103 passed
cd backend && ./venv/Scripts/python.exe -m ruff check .  # expect clean
cd edusmartai-frontend && CI=true npm run build          # expect compiled
```
