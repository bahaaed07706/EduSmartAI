"""Retrieval layer for course-material grounded answers."""
from .chunking import chunk_text, clean_text
from .retriever import (
    DEFAULT_TOP_K,
    MIN_RELEVANCE_SCORE,
    Chunk,
    RagIndex,
    RetrievedChunk,
    authorized_course_ids,
    build_index_from_db,
)

__all__ = [
    "chunk_text", "clean_text", "Chunk", "RagIndex", "RetrievedChunk",
    "build_index_from_db", "authorized_course_ids",
    "DEFAULT_TOP_K", "MIN_RELEVANCE_SCORE",
]
