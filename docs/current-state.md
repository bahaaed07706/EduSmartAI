# EduSmartAI — current state

Last verified: 2026-07-24

## Branch and SHA

| | |
|---|---|
| Branch | `release/v1-hardening` |
| HEAD (local == remote) | `abf747c23ba8e95a760cb3b3ee864e20b11bb310` |
| Base | `main` (untouched, not merged) |
| Pull request | https://github.com/bahaaed07706/EduSmartAI/pull/1 |
| CI | **green** — both jobs, run `30053534105` |
| Working tree | clean |

## Commits on this branch

12 commits ahead of `main`. Most recent first:

| SHA | Purpose |
|---|---|
| `abf747c` | CI: align frontend Node to 24 (lockfile mismatch), skip Chromium download |
| `0f567e6` | Fix all 10 code-review findings |
| `c40c942` | axe-core remediation, 26 violating nodes → 0 |
| `1c5fa97` | npm dependency fix, 59 → 2 production advisories |
| `b32af04`, `3aae14f`, `d36fd5d`, `531ea19`, `b1312c5`, `5c6549a`, `89f4614`, `85e6d54` | Earlier phases: RAG, ML evaluation, design system, quiz/assessment engine, data protection, P0 security |

## Verification results

All re-run at `abf747c`.

| Gate | Result | Where |
|---|---|---|
| Backend tests | **94 passed** | locally (Windows) and CI (ubuntu-latest) |
| ruff | clean | CI |
| Production build | compiles, 218.63 kB gzip | CI |
| axe-core | 0 violations, 6 pages × 3 viewports (360/768/1440) | local, `scripts/a11y-audit.js` |
| npm audit `--omit=dev` | 2 moderate (quill, react-quill) | CI, non-blocking |
| Secret scan | clean; no `.env`, `.db`, uploads or backups tracked | local |
| Migration idempotency | verified twice on a DB copy, 0 columns added on re-run | local |
| Row counts | unchanged: users=14, courses=4, enrollments=40, grades=240, attendances=560 | local |

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
5. **Rate limiting and `/health` are not implemented** — both required before a
   public demo.
6. **a11y scope** — 6 representative pages, not all 37. No Lighthouse. RTL has no
   language switcher, so full mirroring is unverified.

## Exact next task

Merge is gated on staging verification, which cannot run until the deployment
account exists. In order:

1. Owner provisions Render (or Railway) and authorises the GitHub repo.
2. Implement the eight prerequisites in `docs/deployment-decision.md`
   (Postgres, synthetic seed, uploads path, CORS, secrets, rate limiting,
   health endpoint, credential rotation) on a separate deployment branch.
3. Deploy staging from the PR branch, verify end to end from a clean browser.
4. Only then merge PR #1 to `main`, and deploy production from `main`.

## Commands to resume safely

```bash
git fetch --all --prune
git switch release/v1-hardening
git status                      # expect clean
git rev-parse HEAD              # expect abf747c...
gh pr view 1
gh run list --branch release/v1-hardening --limit 1

cd backend && ./venv/Scripts/python.exe -m pytest -q     # expect 94 passed
cd backend && ./venv/Scripts/python.exe -m ruff check .  # expect clean
cd edusmartai-frontend && CI=true npm run build          # expect compiled
```
