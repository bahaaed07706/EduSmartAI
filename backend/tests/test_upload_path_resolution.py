"""Cross-platform resolution of stored file references.

The download endpoints resolve whatever string was persisted in
``file_url``. Those strings come in several historical shapes, and a
POSIX/Windows divergence in ``Path.is_absolute()`` previously made every
submission download 404 on Linux while passing on a Windows dev machine.
These tests pin the behaviour on both platforms.
"""
import pytest

from routes.file_routes import UPLOAD_DIR, _resolve_within_uploads

BACKSLASH = chr(92)


@pytest.fixture
def stored_file():
    """A real file inside the uploads root, cleaned up afterwards."""
    folder = UPLOAD_DIR / "submissions" / "user_path_test"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / "doc.txt"
    target.write_bytes(b"content")
    try:
        yield target
    finally:
        try:
            target.unlink()
            folder.rmdir()
        except OSError:
            pass


@pytest.mark.parametrize(
    "stored",
    [
        # URL shape returned by POST /files/upload. The leading slash makes
        # is_absolute() True on POSIX and False on Windows — the original bug.
        "/uploads/submissions/user_path_test/doc.txt",
        # Same value without the leading slash.
        "uploads/submissions/user_path_test/doc.txt",
        # Plain relative path.
        "submissions/user_path_test/doc.txt",
        # Windows-style separators must resolve on POSIX too.
        "submissions" + BACKSLASH + "user_path_test" + BACKSLASH + "doc.txt",
        "/uploads" + BACKSLASH + "submissions" + BACKSLASH + "user_path_test" + BACKSLASH + "doc.txt",
        # Surrounding whitespace.
        "  /uploads/submissions/user_path_test/doc.txt  ",
    ],
)
def test_stored_reference_shapes_all_resolve(stored_file, stored):
    """Every shape the app persists must resolve to the same real file."""
    resolved = _resolve_within_uploads(stored)
    assert resolved is not None, f"failed to resolve {stored!r}"
    assert resolved == stored_file.resolve()


def test_legacy_absolute_path_inside_uploads_resolves(stored_file):
    """Rows written by the older upload endpoint store an absolute path."""
    assert _resolve_within_uploads(str(stored_file)) == stored_file.resolve()


@pytest.mark.parametrize(
    "hostile",
    [
        "/uploads/../../../etc/passwd",
        "../../etc/passwd",
        "/uploads/submissions/../../../../secret.txt",
        "uploads/../config.py",
        ".." + BACKSLASH + ".." + BACKSLASH + "config.py",
        "/etc/passwd",
        "C:" + BACKSLASH + "Windows" + BACKSLASH + "System32" + BACKSLASH + "config.sys",
        "",
        "   ",
        "/uploads/",
        None,
    ],
)
def test_traversal_and_outside_root_rejected(hostile):
    """Nothing outside the uploads root may ever resolve."""
    assert _resolve_within_uploads(hostile) is None


def test_resolved_path_always_inside_uploads_root(stored_file):
    """The contract the download endpoints rely on."""
    resolved = _resolve_within_uploads("/uploads/submissions/user_path_test/doc.txt")
    assert resolved is not None
    # Raises ValueError if the path escaped the root.
    resolved.relative_to(UPLOAD_DIR)


def test_missing_file_returns_none():
    """A well-formed reference to a file that does not exist is not resolvable."""
    assert _resolve_within_uploads("/uploads/submissions/user_path_test/absent.txt") is None
