# Retrieval-Augmented Generation (RAG) — EduSmartAI

## What this is, precisely

The assistant now performs **query-based retrieval with ranking and source
selection**, then generates an answer grounded in the selected passages and
reports the sources it used. That is retrieval-augmented generation.

**What it is not:** dense/semantic vector search. Retrieval is **lexical** —
TF-IDF over character n-grams with cosine ranking. It will not match a query to
a passage that shares no character overlap (true synonym matching). This is
stated plainly so the capability is not oversold.

This replaced the previous behaviour, which was **context injection**: every
material for the course was pasted into the prompt regardless of the question,
with no ranking and no attribution.

| | Before (context injection) | Now (retrieval) |
|---|---|---|
| Selection | all materials for the course | top-k ranked by query relevance |
| Query-dependent | ❌ | ✅ |
| Ranking | ❌ | ✅ cosine similarity |
| Attribution | ❌ | ✅ `sources[]` in the API response |
| Abstention | ❌ | ✅ below-threshold ⇒ no evidence |

## Pipeline

```
CourseMaterial.content_text          (extracted at upload: PDF/DOCX/PPTX/TXT)
        │
        ▼  clean_text()              strip NULs/NBSP, collapse whitespace
        ▼  chunk_text()              500 chars, 100 overlap, min 20
        ▼  TfidfVectorizer           analyzer="char_wb", ngram_range=(3,5)
        ▼  RagIndex                  chunks + matrix, persistable via joblib
        │
query ──┤
        ▼  authorized_course_ids()   ← DB: enrolment (student) / ownership (lecturer)
        ▼  AUTHORIZATION MASK        candidate rows restricted BEFORE scoring
        ▼  cosine ranking → top-k, score ≥ 0.25
        ▼  delimited <course_materials> block + citation labels
        ▼  LLM answer + sources[] returned to the client
```

Code: `backend/rag/chunking.py`, `backend/rag/retriever.py`;
wiring in `backend/routes/chatbot_routes.py` (`attach_retrieved_evidence`).

## Security model

The invariant is enforced structurally, not by prompt wording:

- `RagIndex.retrieve()` **requires** an `allowed_course_ids` allowlist and applies
  it as a row mask **before** similarity is computed. There is no code path that
  returns a chunk from an unlisted course.
- The allowlist comes from `authorized_course_ids(user, db)` — enrolment rows for
  students (excluding `withdrawn`), owned courses for lecturers, and **empty for
  admins** (the assistant exposes no course content to them).
- An empty allowlist short-circuits to an empty result.
- Retrieved text is inserted inside `<course_materials>` delimiters with a
  standing instruction that it is reference data, never instructions.
- Structured student data (grades, attendance, predictions) never comes from
  retrieval — only from authorized database queries.

Verified by tests, including exact-match probes: querying a forbidden course with
its own verbatim sentence still returns nothing.

## Measured retrieval quality

From `backend/tests/test_rag_retrieval.py` on a bilingual labelled query set:

| Metric | Value |
|---|---|
| Recall@3 | **1.00** |
| MRR | **1.00** |
| Labelled queries | 5 (3 English, 1 Arabic, cross-course) |

Relevance-threshold calibration (why `MIN_RELEVANCE_SCORE = 0.25`):

| Query type | Top cosine score |
|---|---|
| On-topic | 0.59 – 0.72 |
| Off-topic (English) | 0.05 – 0.07 |
| Off-topic (Arabic) | up to 0.20 |

Arabic scores higher on unrelated text because character n-grams share more mass
across Arabic strings, so a naive 0.05 cut-off fails to abstain in Arabic. 0.25
separates both languages with margin.

**Honest limitation:** the labelled set is small (n=5) and synthetic. Recall@3 =
1.00 demonstrates the mechanism works; it is **not** a claim of production-grade
retrieval quality on a large corpus. The threshold should be re-tuned against
real uploaded materials.

## Test coverage

`test_rag_retrieval.py` (13) — cross-course isolation, exact-match probe on a
forbidden course, empty allowlist, ranking order, Arabic retrieval, abstention
(EN + AR, parametrised), citations, recall@3/MRR, save/load persistence,
poisoned-document handling.

`test_rag_chatbot.py` (5) — sources returned for a grounded answer, student never
grounded in an unenrolled course, lecturer restricted to owned courses, no
sources when nothing is relevant, retrieved instructions delimited not obeyed.

`test_chatbot_eval.py` — delimiting, citation label present, explicit abstention
instruction when retrieval returns nothing.

Run: `pytest tests/test_rag_retrieval.py tests/test_rag_chatbot.py -q -s`

## Known limitations

- **Lexical, not semantic.** No synonym/paraphrase matching without character overlap.
- **Index is process-cached** and built lazily on first use; call
  `reset_rag_index()` after materials change. It is not yet rebuilt automatically
  on upload, and is not shared across worker processes.
- **Corpus quality is bounded by extraction.** Materials whose `content_text` is
  empty (e.g. scanned image PDFs, no OCR) are not retrievable at all.
- **Seeded demo materials are very short** (33–400 chars), so retrieval on the
  demo database is far less interesting than on real uploads.
- **Answer groundedness is not automatically scored.** Tests verify that the
  correct evidence is retrieved and cited; they do not measure whether the LLM's
  prose faithfully reflects it. That requires a live provider — see below.
- **Live-provider generation is unverified.** No valid `GROQ_API_KEY` was
  available, so end-to-end answer quality and citation-following behaviour were
  tested against the deterministic fallback and mocks only.
