# Security policy

## Reporting a vulnerability

For anything non-sensitive, open a GitHub issue. For something exploitable —
an authorization bypass, a way to read another user's data, a path traversal —
please contact the author directly rather than filing publicly, so it can be
fixed before it is disclosed.

Please include what you did, what you expected, and what actually happened.
A proof of concept helps, but a clear description is enough to start.

## What this project already defends against

The authorization model, the audit findings and their fixes, and the known gaps
are documented in full in [docs/security.md](docs/security.md). In short:

- Authorization is enforced per resource, not per role.
- Quiz answer keys are never sent to a student before submission.
- Uploads are not publicly served; download runs an ownership check and a
  path-traversal check.
- The app refuses to start on a weak `JWT_SECRET`, or in production with a
  wildcard CORS origin.
- No secret is logged.

## Known gaps

- Two moderate advisories remain in `quill` / `react-quill` (a breaking upgrade
  is needed).
- Passwords use `sha256_crypt`; Argon2/bcrypt would be preferable.
- Rate limiting is per-instance and resets on restart.

These are tracked in [docs/roadmap.md](docs/roadmap.md).

## Supported versions

This is a graduation project. Security fixes are applied to `main` only.
