# Roadmap

Every item below traces to a problem this project actually hit, or a gap an
audit actually found. Nothing is listed because it sounds impressive.

Effort estimates assume one developer already familiar with the codebase.

---

## Now — required before the public demo

### 1. Execute the Render deployment

- **Problem** — the architecture is decided and the code supports it, but
  nothing is deployed. A portfolio project without a live URL loses most
  readers in the first ten seconds.
- **Affected** — every GitHub audience.
- **Benefit** — the difference between "here is my code" and "here is my
  product."
- **Effort** — ~half a day, most of it waiting on builds.
- **Priority** — highest.
- **Depends on** — the repository owner authorising Render. Blocked on nothing else.

### 2. Rotate the previously committed demo credentials

- **Problem** — three working passwords were committed and remain in git
  history and in the local database. They are compromised by definition.
- **Affected** — anyone who deploys this.
- **Benefit** — removes a live vulnerability rather than a theoretical one.
- **Effort** — minutes.
- **Priority** — highest. Must happen before, not after, the demo is public.
- **Depends on** — nothing.

### 3. Exercise the Postgres path against a real instance

- **Problem** — `database.py` now selects engine options per dialect and
  normalises the `postgres://` scheme, but that path has never connected to an
  actual Postgres server. The test suite runs on SQLite.
- **Affected** — the deployment itself.
- **Benefit** — catches dialect differences before the demo does.
- **Effort** — 2–4 hours.
- **Priority** — high.
- **Depends on** — item 1.

---

## Next — supported by findings already in hand

### 4. Persistent object storage for uploads

- **Problem** — uploads currently rely on a mounted disk. That works for one
  instance and stops working the moment there are two.
- **Affected** — institutional buyers, who will not accept single-instance
  storage.
- **Benefit** — horizontal scaling becomes possible; backup becomes a solved
  problem rather than a manual one.
- **Effort** — 1–2 days, including signed-URL download to preserve the existing
  authorization guarantees.
- **Priority** — medium.
- **Depends on** — item 1.

### 5. Early-risk prediction without leakage

- **Problem** — the OULAD model's 0.9790 accuracy is inflated by `Pass_rate`
  leakage, so it cannot be used for the thing it was built for. This is the
  most significant open technical problem in the project.
- **Affected** — student-success teams; the entire value proposition of risk
  prediction.
- **Benefit** — a lower but *honest* number that can actually inform contacting
  a student. A defensible 0.75 is worth more than an indefensible 0.98.
- **Effort** — 3–5 days: rebuild features with a strict temporal cutoff, retrain,
  re-evaluate, and publish the drop openly.
- **Priority** — high. This is the difference between a demo and a usable tool.
- **Depends on** — nothing. Doable now.
- **Note** — expect accuracy to fall substantially. That is the point.

### 6. Live LLM answer-quality evaluation

- **Problem** — retrieval quality is measured (P@1 = 1.00 on a 12-query set),
  but generated answer quality has never been evaluated against a real provider.
  No API key has been available.
- **Affected** — AI reviewers, who will ask exactly this.
- **Benefit** — turns "the retrieval works" into "the answers are good."
- **Effort** — 1 day once a key exists.
- **Priority** — medium.
- **Depends on** — a Groq API key.

### 7. Expand the RAG evaluation set

- **Problem** — 12 queries is enough to show the mechanism works and too few to
  claim it works well. The abstention threshold (0.25) was calibrated on that
  same small set, which risks overfitting to it.
- **Affected** — AI reviewers.
- **Benefit** — a threshold that is justified rather than tuned to the examples.
- **Effort** — 1–2 days, mostly authoring queries.
- **Priority** — medium.
- **Depends on** — more course material in the corpus.

### 8. Replace Quill

- **Problem** — `quill` and `react-quill` carry the last two production
  advisories. They cannot be resolved without a breaking upgrade.
- **Affected** — anyone running a security scan.
- **Benefit** — a clean production audit.
- **Effort** — 1–2 days.
- **Priority** — medium-low. The advisories are moderate, not critical.
- **Depends on** — nothing.

### 9. Full RTL and accessibility sweep

- **Problem** — the interface has RTL-aware utilities but no language switcher,
  so full mirroring is unverified. The accessibility audit covers 6 representative
  pages of 37.
- **Affected** — Arabic-speaking students, the primary user base.
- **Benefit** — an Arabic-first product rather than an English product that
  tolerates Arabic.
- **Effort** — 3–4 days.
- **Priority** — medium-high for the intended market, lower for a portfolio.
- **Depends on** — nothing.

---

## Later — larger product investments

### 10. Explainable predictions

- **Problem** — the model outputs a risk class with no reason. A lecturer told
  "this student is at risk" cannot act without knowing why.
- **Affected** — lecturers, student-success teams.
- **Benefit** — moves the product from a score to an actionable recommendation.
  Also an ethical requirement: consequential decisions about students should be
  contestable.
- **Effort** — 1–2 weeks.
- **Priority** — high whenever prediction becomes real.
- **Depends on** — item 5. Explaining a leaky model would explain an artefact.

### 11. Intervention tracking

- **Problem** — the system identifies at-risk students and then stops. Nothing
  records what was done or whether it helped.
- **Affected** — academic leadership, who need to justify the programme.
- **Benefit** — closes the loop, and generates the outcome data that would make
  every future model better.
- **Effort** — 2–3 weeks.
- **Priority** — this is the highest-value institutional feature not yet built.
- **Depends on** — item 10.

### 12. Institutional analytics

- **Problem** — no cohort-level or longitudinal view exists.
- **Affected** — deans, academic affairs.
- **Effort** — 2–3 weeks.
- **Priority** — medium. Meaningless before item 11 produces outcome data.
- **Depends on** — item 11.

### 13. Multi-tenancy and SSO

- **Problem** — one deployment serves one institution, with local passwords.
- **Affected** — any real buyer.
- **Benefit** — the precondition for selling this to more than one university.
- **Effort** — 4–6 weeks for tenancy, 1 week for SAML/OIDC.
- **Priority** — low until there is a second institution.
- **Depends on** — items 1 and 4.

### 14. LMS integration

- **Problem** — data must be entered here as well as in the institution's
  existing LMS.
- **Affected** — everyone; duplicate entry is the most common reason systems
  like this are abandoned.
- **Effort** — 3–4 weeks per LMS.
- **Priority** — high commercially, low technically until there is a customer.
- **Depends on** — item 13.

### 15. Model monitoring

- **Problem** — nothing detects the model degrading as cohorts change.
- **Affected** — anyone relying on predictions over time.
- **Effort** — 1–2 weeks.
- **Priority** — required before predictions influence real decisions.
- **Depends on** — items 5 and 11.

---

## Deliberately not planned

- **A mobile app.** The web interface is responsive and verified at 360px. A
  native app would duplicate it for no user benefit.
- **Real-time collaboration.** No workflow here needs it.
- **A custom LLM.** Retrieval quality, not model choice, is the constraint.
- **Gamification.** No evidence it would help these users, and it would cheapen
  a product built on academic trust.
