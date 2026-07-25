# Public claims matrix

Every claim the repository makes in public, mapped to the evidence behind it.
The point of this file is that nothing in the README should be un-checkable.

**Status key**

- **VERIFIED** — proven by code and an automated test that runs in CI.
- **LOCALLY VERIFIED** — proven by a command run locally (not yet in CI, or not automatable).
- **LIVE VERIFIED** — proven against the deployed production system.
- **LIMITED** — true, but with a stated scope or caveat that must travel with it.
- **BLOCKED** — cannot be verified yet; the reason is named.

| Public claim | Code evidence | Test evidence | Live evidence | Status |
|---|---|---|---|---|
| Authorization is enforced per resource, not per role | ownership/enrolment checks in every route module (`quiz_routes._owned_quiz`, `assessment_routes._owned_course`, `file_routes.download_material`) | `test_api_baseline.py`, `test_p1_regression.py`, `test_assessment_engine.py` — positive + negative authz | not deployed | **VERIFIED** |
| Quiz answer keys (`is_correct`) never reach a student before submission | `quiz_routes._attempt_payload` omits `is_correct` | `test_quiz_engine.py` | not deployed | **VERIFIED** |
| A student's submission must reference a file that student uploaded | `assessment_routes._validate_own_upload` | `test_assessment_engine.py::test_submit_rejects_file_the_student_did_not_upload` | not deployed | **VERIFIED** |
| Assessment download works cross-platform (Windows + Linux) | `file_routes._resolve_within_uploads` strips the `/uploads` prefix before the absolute-path decision | `test_upload_path_resolution.py` (both separator styles) + CI on ubuntu-latest | not deployed | **VERIFIED** |
| Deletes are soft; history-bearing rows return 409 | `admin_crud_routes`, `quiz_routes.delete_quiz/question/option`, `assessment_routes.delete_assessment` | `test_data_protection.py`, `test_quiz_engine.py::test_attempted_quiz_cannot_be_hard_deleted` | not deployed | **VERIFIED** |
| Withdrawn students lose material access | `file_routes` enrolment checks add `status != "withdrawn"` | `test_p1_regression.py` | not deployed | **VERIFIED** |
| RAG authorization mask is applied before ranking | `rag/retriever.py` restricts candidate rows before scoring | `test_rag_retrieval.py`, `test_rag_evaluation.py` (cross-course + cross-user isolation) | not deployed | **VERIFIED** |
| Retrieval is lexical TF-IDF over char n-grams (not embeddings) | `rag/retriever.py` `TfidfVectorizer(analyzer="char_wb", ngram_range=(3,5))` | `test_rag_evaluation.py` | n/a | **VERIFIED** |
| Retrieval quality: P@1 = recall@3 = MRR = 1.00 on 12 bilingual queries | — | `test_rag_evaluation.py` prints `n=12 P@1=1.00 recall@3=1.00 MRR=1.00` | n/a | **LIMITED** (n=12 shows the mechanism, not production quality; threshold calibrated on the same set) |
| The assistant abstains below the relevance threshold | `retriever.py` `MIN_RELEVANCE_SCORE = 0.25` | `test_rag_evaluation.py::test_abstains_on_off_topic` | not deployed | **VERIFIED** |
| Prompt injection cannot widen access | mask precedes ranking; retrieved text treated as data | `test_rag_evaluation.py` injection cases | not deployed | **VERIFIED** |
| Chatbot degrades gracefully without an API key (`ai_powered: false`) | `chatbot_routes._has_valid_key`, `get_groq_client` | `test_chatbot_eval.py` | not deployed | **VERIFIED** |
| Live LLM answer quality | — | — | none | **BLOCKED** (no Groq key; only retrieval + local fallback exercised) |
| AXI: accuracy 0.7917, ROC-AUC 0.9219, n=96 | `scripts/evaluate_models.py` | held-out run (`docs/evidence/ml-evaluation.json`) | n/a | **LOCALLY VERIFIED** |
| OULAD: accuracy 0.9790 — **inflated by target leakage** | `scripts/evaluate_models.py` leakage diagnostic | `docs/evidence/ml-evaluation.json` | n/a | **LIMITED** (must never be presented as reliable early prediction) |
| Training/serving skew found and fixed (`Days_Active`) | `prediction_routes` uses `max(date)` to match training | `test_ml_golden.py` | not deployed | **VERIFIED** |
| App refuses to start on a weak `JWT_SECRET` | `config.py` startup guard | `test_api_baseline.py` fixtures require a strong secret | not deployed | **VERIFIED** |
| App refuses a wildcard CORS origin in production | `main.py` production guard | — | not deployed | **LOCALLY VERIFIED** |
| Rate limiting on login/chatbot/uploads | `main.py` in-process limiter | `test_rate_limit.py` | not deployed | **VERIFIED** |
| No secret is logged or committed | secret scan; `_has_valid_key` never prints | `git grep` secret scan (clean) | n/a | **LOCALLY VERIFIED** |
| 103 backend tests pass on Windows and Linux | whole suite | `pytest -q`; CI on ubuntu-latest | n/a | **VERIFIED** |
| 0 accessibility violations (WCAG 2.0/2.1/2.2 A+AA), 6 pages × 3 viewports | — | `scripts/a11y-audit.js` (axe-core) | not deployed | **LOCALLY VERIFIED** |
| 0 responsive issues, 9 pages × 5 breakpoints (360–1440) | — | `scripts/responsive-audit.js` | not deployed | **LOCALLY VERIFIED** |
| Production dependency audit: 2 moderate | `edusmartai-frontend/package.json` | `npm audit --omit=dev` | n/a | **VERIFIED** |
| Migration builds a fresh database and is idempotent | `migrate_schema.run` creates ORM tables first | `test_migration_fresh_database.py` | not deployed | **VERIFIED** |
| Frontend deployed to Vercel | `edusmartai-frontend/vercel.json` | — | https://edusmartai-frontend.vercel.app (Ready) | **LIVE VERIFIED** (UI only; no backend) |
| Backend / PostgreSQL / uploads live end to end | `render.yaml` | — | none | **BLOCKED** (Render not provisioned; needs account authorization) |

## How to reproduce every row

See [`../reproducibility.md`](../reproducibility.md). The JSON artifacts in this
folder (`rag-evaluation.json`, `ml-evaluation.json`, `environment.txt`) are the
outputs of the commands listed there, captured on 2026-07-24.
