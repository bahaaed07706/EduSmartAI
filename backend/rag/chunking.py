"""Text cleaning and chunking for course-material retrieval."""
from __future__ import annotations

import re

# Chunking is character-based so it behaves consistently for Arabic and English
# (word tokenisation differs sharply between the two).
CHUNK_SIZE = 500
CHUNK_OVERLAP = 100
MIN_CHUNK_CHARS = 20

# Characters that commonly survive PDF/DOCX extraction and break tokenisation.
_NUL = "\x00"
_NBSP = " "


def clean_text(text: str | None) -> str:
    """Normalise whitespace and strip control characters from extracted text."""
    if not text:
        return ""
    text = text.replace(_NUL, "").replace(_NBSP, " ")
    # Collapse runs of whitespace (PDF/DOCX extraction is noisy) but keep sentence breaks.
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks.

    Overlap preserves context that would otherwise be cut mid-sentence at a
    boundary. Chunks shorter than MIN_CHUNK_CHARS are dropped as non-informative.
    """
    text = clean_text(text)
    if not text:
        return []
    if len(text) <= size:
        return [text]

    step = max(1, size - overlap)
    chunks: list[str] = []
    for start in range(0, len(text), step):
        piece = text[start:start + size].strip()
        if len(piece) >= MIN_CHUNK_CHARS:
            chunks.append(piece)
        if start + size >= len(text):
            break
    return chunks
