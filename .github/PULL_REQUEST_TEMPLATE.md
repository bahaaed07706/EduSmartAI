<!-- Keep this short. The one rule: no change is "done" without evidence. -->

## What this changes

<!-- One or two sentences. What and why. -->

## Evidence

<!-- Paste the output that proves it works. At least one of: -->

- [ ] `cd backend && python -m pytest -q` — result:
- [ ] `cd backend && python -m ruff check .` — result:
- [ ] `cd edusmartai-frontend && CI=true npm run build` — result:
- [ ] Screenshot / browser check (for UI changes)

## Checklist

- [ ] New endpoints have a positive **and** a negative authorization test
- [ ] No data is hard-deleted (deactivate / archive / withdraw, or 409 when history exists)
- [ ] No secret, password, or real student data is committed
- [ ] Migrations are additive only
- [ ] Docs updated if behaviour or setup changed

## Anything unverified?

<!-- State it plainly. An honest "not verified because X" is worth more than an
optimistic claim. -->
