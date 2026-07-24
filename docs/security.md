# Security

How authorization works here, what an audit found, and what is still open.

## The authorization model

**Role is not permission.** Being a lecturer does not grant access to a course;
owning that course does. Being a student does not grant access to material;
active enrolment does. Every resource endpoint resolves the relationship from
the database before returning data.

| Actor | May read | Enforced by |
|---|---|---|
| Student | Their own record; material and quizzes for courses they are actively enrolled in | Enrolment lookup with `status != "withdrawn"` |
| Lecturer | Courses they are assigned to, and the students enrolled in them | `Course.lecturer_id == user.id` |
| Admin | Academic structure. **No course content** — the assistant returns nothing for admins | Empty retrieval allowlist by design |

A withdrawn enrolment row still exists, because academic history is retained.
It must therefore never be treated as access. Every enrolment check filters
withdrawn status explicitly.

## Findings from the audit, and their fixes

Six critical issues were found. All are fixed with regression tests.

### 1. IDOR in the chatbot — student data leak

Any authenticated lecturer could pass an arbitrary `student_id` and receive that
student's full name, phone, city, grades, attendance and risk prediction — with
no teaching relationship required. Confirmed by live exploitation, not
inspection.

**Fixed:** `_assert_lecturer_can_access_student` requires the lecturer to own a
course the student is enrolled in, else 403.

### 2. API key prefix written to logs

Startup printed the first characters of the Groq key on every boot.

**Fixed:** removed. No secret is logged, not even a prefix or a length.

### 3. Hardcoded JWT fallback secret

`JWT_SECRET` defaulted to `"fallback-secret-key"`. Any deployment that forgot to
set it issued forgeable tokens.

**Fixed:** no default. The app refuses to start on a missing, short, or
known-placeholder secret.

### 4. Open static mount on uploads

`/uploads` was served as unauthenticated static files, so course materials and
student submissions were readable by URL.

**Fixed:** mount removed. Downloads go through endpoints that check ownership
first, then verify the resolved path stays inside the uploads root.

### 5. Dishonest capability reporting

The API returned `ai_powered: true` whenever the key variable was non-empty,
including when it held a placeholder — so the interface claimed AI capability
while every response came from the local fallback.

**Fixed:** the check requires a `gsk_` prefix and plausible length, and rejects
known placeholders.

### 6. Committed credentials

Working passwords for all three roles were committed in the accessibility
script, printed on the login page to every visitor, and hardcoded in the seeder.

**Fixed:** all three now read from environment variables with no defaults. The
login page renders nothing unless explicitly configured and never advertises the
admin account.

**Still outstanding:** those passwords remain in git history and in any database
seeded with them. They are compromised and must be rotated. Rewriting history
was deliberately not done, since it would break every existing clone; rotation
is the correct remedy.

## Findings from the code review

Ten further issues were found reviewing this branch. The security-relevant ones:

- **Submission `file_url` was unvalidated client input.** A student could submit
  a path pointing at course material or another student's folder, then read it
  back through the authorized download endpoint. Now the path must sit under
  that caller's own upload prefix.
- **Withdrawn students kept material access.** Two file endpoints omitted the
  withdrawn filter that quiz and assessment routes applied.
- **One file endpoint had no `else` branch,** so any role other than student or
  lecturer fell through with no check at all. Now denies by default.
- **Cross-platform path resolution.** A stored `/uploads/...` reference is
  absolute on POSIX but relative on Windows, so downloads returned 404 on Linux
  while passing on the dev machine — and the test asserted the 404, hiding it.
  Now resolved identically on both, with traversal tests for both separator
  styles.

## Data protection

Academic records are legally retained, so the system is built to make loss hard:

- Users are deactivated, courses archived, enrolments withdrawn — never deleted.
- Deleting a quiz, question or option with student attempts attached returns 409.
  Without that guard the attempt rows would be orphaned, since SQLite does not
  enforce foreign keys by default.
- Deleting a department still linked to courses or users returns 409.
- Migrations are additive only: `ALTER TABLE ADD COLUMN`, never `DROP`.

## Deployment hardening

- Interactive API docs are disabled when `ENVIRONMENT=production`.
- The app refuses to boot in production if `CORS_ORIGINS` is empty or contains a
  wildcard — credentialed CORS plus a wildcard would let any site call the API.
- Rate limiting: 10 logins / 5 min, 30 chatbot queries / 5 min, 20 uploads /
  hour, 300 requests/min otherwise, keyed on the forwarded client address.
  This is a single-instance in-process limiter, not an edge limiter, and it does
  not coordinate across replicas.
- Security headers on every response; HSTS in production.
- `/ready` verifies the database and models but reports no paths, versions or
  configuration.

## Prompt injection

Retrieved material is treated as untrusted data. The authorization mask is
applied before ranking, so injected instructions inside a document cannot widen
access — the content of a course a user cannot reach is never a retrieval
candidate in the first place. There are tests asserting that injected
instructions do not cause cross-course disclosure.

## Reporting a vulnerability

Open a GitHub issue for anything non-sensitive. For something exploitable,
contact the author directly rather than filing publicly.

## Known gaps

- `pip-audit` and automated security-review diff extraction fail on this
  repository's non-ASCII path. Run them in CI or from an ASCII path.
- Two moderate advisories remain in `quill`/`react-quill`.
- Passwords use `sha256_crypt`. Argon2 or bcrypt would be preferable; changing
  it requires a migration path for existing hashes.
- Rate limiting is per-instance and resets on restart.
