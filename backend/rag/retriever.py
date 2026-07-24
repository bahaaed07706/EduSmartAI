"""Query-based retrieval over course materials, with authorization filtering.

Retrieval method: TF-IDF over character n-grams with cosine ranking. Character
n-grams are used deliberately because the corpus is mixed Arabic/English —
Arabic is morphologically rich, so word-level tokenisation retrieves poorly,
while char n-grams degrade gracefully across both scripts.

This is LEXICAL retrieval, not dense/semantic embedding search. It performs
genuine query-dependent ranking and source selection (unlike blanket context
injection), but it does not match synonyms that share no character overlap.
See docs/rag.md.

SECURITY INVARIANT
------------------
`retrieve()` requires an explicit `allowed_course_ids` allowlist and applies it
as a mask *before* scoring. A caller cannot receive a chunk from a course that
is not in the allowlist, regardless of the query text. Callers must derive the
allowlist from the database (enrolment for students, ownership for lecturers),
never from user input.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Iterable, Sequence

import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from .chunking import chunk_text, clean_text

# A chunk must clear this cosine score to count as evidence. Below it we abstain
# rather than feeding weak matches to the model (a hallucination guard).
#
# Empirically calibrated on the bilingual fixture corpus:
#   on-topic queries      -> top score 0.59 - 0.72
#   off-topic English     -> top score 0.05 - 0.07
#   off-topic Arabic      -> top score up to 0.20
# Arabic sits higher because character n-grams share more mass across unrelated
# Arabic text, so a naive 0.05 cut-off would fail to abstain in Arabic. 0.25
# separates both languages with margin. Re-tune on a larger real corpus.
MIN_RELEVANCE_SCORE = 0.25
DEFAULT_TOP_K = 4


@dataclass
class Chunk:
    chunk_id: int
    material_id: int
    course_id: int
    title: str
    text: str


@dataclass
class RetrievedChunk:
    chunk: Chunk
    score: float

    @property
    def citation(self) -> str:
        return f"[{self.chunk.title} #{self.chunk.chunk_id}]"


@dataclass
class RagIndex:
    """A persistent TF-IDF index over course-material chunks."""

    chunks: list[Chunk] = field(default_factory=list)
    vectorizer: TfidfVectorizer | None = None
    matrix = None  # scipy sparse matrix, set on build

    # ---------- build / persist ----------
    def build(self, records: Iterable[tuple[int, int, str, str]]) -> "RagIndex":
        """Build the index from (material_id, course_id, title, text) records."""
        self.chunks = []
        next_id = 0
        for material_id, course_id, title, text in records:
            for piece in chunk_text(text):
                self.chunks.append(Chunk(next_id, material_id, course_id, title or "", piece))
                next_id += 1

        if not self.chunks:
            self.vectorizer, self.matrix = None, None
            return self

        self.vectorizer = TfidfVectorizer(
            analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True,
        )
        self.matrix = self.vectorizer.fit_transform([c.text for c in self.chunks])
        return self

    def save(self, path: str) -> None:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        joblib.dump({"chunks": self.chunks, "vectorizer": self.vectorizer, "matrix": self.matrix}, path)

    @classmethod
    def load(cls, path: str) -> "RagIndex":
        data = joblib.load(path)
        index = cls(chunks=data["chunks"], vectorizer=data["vectorizer"])
        index.matrix = data["matrix"]
        return index

    # ---------- query ----------
    def retrieve(
        self,
        query: str,
        allowed_course_ids: Sequence[int],
        k: int = DEFAULT_TOP_K,
        min_score: float = MIN_RELEVANCE_SCORE,
    ) -> list[RetrievedChunk]:
        """Return the top-k authorized chunks ranked by relevance to `query`.

        `allowed_course_ids` is mandatory and applied BEFORE ranking. An empty
        allowlist always yields an empty result.
        """
        query = clean_text(query)
        if not query or self.vectorizer is None or self.matrix is None:
            return []

        allowed = set(allowed_course_ids or [])
        if not allowed:
            return []

        # AUTHORIZATION FILTER FIRST: restrict candidate rows before scoring.
        candidate_rows = [i for i, c in enumerate(self.chunks) if c.course_id in allowed]
        if not candidate_rows:
            return []

        query_vec = self.vectorizer.transform([query])
        scores = (self.matrix[candidate_rows] @ query_vec.T).toarray().ravel()

        order = np.argsort(-scores)[:k]
        results = [
            RetrievedChunk(self.chunks[candidate_rows[i]], float(scores[i]))
            for i in order
            if scores[i] >= min_score
        ]
        return results


def build_index_from_db(db) -> RagIndex:
    """Build an index from every course material that has extracted text."""
    import models  # imported here to keep this module importable standalone

    rows = db.query(models.CourseMaterial).all()
    records = [
        (m.id, m.course_id, m.title or "", m.content_text or "")
        for m in rows
        if (m.content_text or "").strip()
    ]
    return RagIndex().build(records)


def authorized_course_ids(user, db) -> list[int]:
    """Resolve which courses a user may retrieve from — from the DB, never input.

    Students: courses they are actively enrolled in.
    Lecturers: courses they own.
    Anyone else (e.g. admin): none — the assistant exposes no course content.
    """
    import models

    if user.role == "student":
        rows = db.query(models.Enrollment.course_id).filter(
            models.Enrollment.student_id == user.id,
            models.Enrollment.status != "withdrawn",
        ).all()
    elif user.role == "lecturer":
        rows = db.query(models.Course.id).filter(models.Course.lecturer_id == user.id).all()
    else:
        return []
    return [r[0] for r in rows]
