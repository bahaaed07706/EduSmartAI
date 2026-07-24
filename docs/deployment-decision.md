# Deployment decision record

Status: **decided, not yet executed.** Execution needs a platform account
(see "What is blocked" at the end).

Date: 2026-07-24
Branch: `release/v1-hardening` @ `abf747c`

---

## What this application actually requires

Measured from the repository, not assumed.

| Requirement | Measurement | Consequence |
|---|---|---|
| ML model artifacts | `Saved_Models/` = **16 MB**, of which `oulad_model_fixed.joblib` is **14.3 MB** | Must be loaded into memory at prediction time |
| Python dependency weight | pandas, numpy, scikit-learn 1.7.2, PyMuPDF, python-pptx | Installed footprint is several hundred MB |
| Database | SQLite, `backend/edusmart.db` = 300 KB | **Written at runtime** — every grade, attempt, submission |
| Uploaded files | `backend/uploads/` | **Written at runtime** by two endpoints |
| Retrieval index | TF-IDF built in-process on first chatbot query | Rebuilt from the database on boot; invalidated on material change |
| Frontend build | `build/` = 4.2 MB static | Trivially hostable anywhere |

Three of these — the database, the uploads directory, and the process-cached
index — assume **a writable filesystem that survives between requests**. That
single fact decides the architecture.

## Option A — Vercel

**Verdict: rejected for the backend. Viable for the frontend.**

Vercel Python Functions are serverless: each invocation gets an ephemeral
filesystem, and instances are recycled freely. Against the requirements above:

- **SQLite would silently lose data.** Writes land on an ephemeral disk; a
  student submits a quiz, the instance recycles, the attempt is gone. There is
  no safe way to keep SQLite here.
- **Uploads have nowhere to live.** `POST /files/upload` writes to disk. On
  Vercel that write succeeds and then disappears.
- **The 14.3 MB model plus pandas/numpy/scikit-learn pushes hard against the
  serverless function size limit,** and every cold start pays the joblib
  deserialisation cost. Prediction latency would be dominated by cold starts.
- The RAG index would rebuild on essentially every cold start.

Making Vercel work would mean migrating to managed Postgres *and* object
storage *and* accepting cold-start cost on the ML path. That is a real
architectural rewrite, not a deployment step.

Vercel remains a good host for the **static React frontend**.

## Option B — Render

**Verdict: chosen.**

- FastAPI runs as a normal long-lived Web Service — no cold start on the ML
  path, the model is deserialised once at boot and stays resident.
- A **persistent disk** can be mounted, which satisfies uploads directly.
- **Render Postgres** is available as a managed database.
- Native health checks and deploy-from-GitHub.
- The static frontend deploys as a Static Site in the same account.

This is the only option where the application's existing assumptions hold with
the *smallest* set of changes.

## Option C — Railway

**Verdict: viable, second choice.**

Functionally close to Render: long-lived service, managed Postgres, volumes,
GitHub deploys. It would also work. Render is chosen over it only because its
free/hobby static-site + web-service split maps more directly onto this repo's
two-app layout, and its persistent-disk model is the simpler of the two to
reason about for the uploads directory.

No strong technical argument separates them. If Render becomes unavailable,
Railway is a drop-in substitute for this decision.

---

## Chosen architecture

The two halves have genuinely different needs, so they are hosted differently.

```
React static bundle  ──HTTPS──>  FastAPI web service  ──>  Postgres (managed)
     (Vercel)                     (Render Web Service) ──>  Persistent disk
                                                              (uploads)
```

**Frontend on Vercel.** The build output is a 4.2 MB static bundle with no
server-side rendering and no server-side needs at all. That is exactly what a
CDN is for. Vercel also gives per-branch preview deployments for free, which is
useful for reviewing UI changes before merge. Config:
`edusmartai-frontend/vercel.json`.

**Backend on Render.** Long-lived service, persistent disk, managed Postgres.
Rationale in one sentence: **the API writes to disk and holds a 14 MB model in
memory, so it needs a persistent server, not a serverless function.** Config:
`render.yaml`.

Splitting them means the frontend redeploys in seconds without restarting the
API and reloading the model, and each side scales on its own terms. The cost is
one extra moving part: CORS must name the Vercel origin explicitly, and the app
refuses to boot in production if it is missing or a wildcard.

## Required changes before any public deploy

These are **not yet done**. They are the concrete work this decision creates.

1. **Database.** Move off SQLite to managed Postgres for the deployed instance.
   The local `backend/edusmart.db` must not be uploaded — it holds real
   coursework. Deployment gets its own database seeded with synthetic data only.
2. **Seed data.** `seed_data.py` now requires `SEED_*_PASSWORD` env vars with no
   defaults, so a deployment cannot accidentally create guessable accounts. A
   synthetic-only seed profile still needs writing.
3. **Uploads.** Point `UPLOAD_DIR` at the mounted persistent disk. The
   authorization and traversal guards already in place carry over unchanged.
4. **CORS.** `CORS_ORIGINS` must be set to the exact frontend origin. It is
   already env-driven; it must not be `*`.
5. **Secrets.** `JWT_SECRET` and `GROQ_API_KEY` come from the platform's
   encrypted variables. The startup guard already refuses weak secrets.
6. **Rate limiting.** Not currently implemented. Needed before exposing the
   login and chatbot endpoints publicly.
7. **Health endpoint.** Needs adding for the platform health check.
8. **Credential rotation.** The demo passwords that were previously committed
   remain in git history and in the local database. They must be treated as
   compromised and never reused for the public demo.

## What is blocked

Deployment itself cannot proceed from here. It requires signing in to Render,
authorising the GitHub repository, provisioning a database, and setting secret
values — all of which need the repository owner's account and none of which
should be done with credentials pasted into a chat.
