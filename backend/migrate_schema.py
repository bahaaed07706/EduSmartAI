"""Additive schema migration + backfill for the normalized academic model.

Safe by design:
  * Only CREATE TABLE (new tables) and ALTER TABLE ADD COLUMN — never drops or
    deletes rows.
  * Idempotent: guarded by column/row existence checks, so running it twice is a
    no-op.
  * Row counts of existing tables are preserved (verified by tests/QA).

Run:  python migrate_schema.py            # migrate the configured DATABASE_URL
Always back up backend/edusmart.db first (a *.bak copy) and test on a copy.
"""
from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

# Deterministic human codes for known departments; anything else gets DEPT{n}.
# The stored department NAME always stays the original legacy string so the
# backfill join and idempotency lookup match on re-runs.
_KNOWN_DEPT_CODES = {
    "علوم الحاسوب": "CS",
    "إدارة النظام": "ADMIN",
}


def _columns(cur, table: str) -> set[str]:
    return {row[1] for row in cur.execute(f"PRAGMA table_info({table})")}


def _add_column(cur, table: str, column: str, ddl: str) -> None:
    if column not in _columns(cur, table):
        cur.execute(f"ALTER TABLE {table} ADD COLUMN {ddl}")
        print(f"  + {table}.{column}")


def _create_new_tables(cur) -> None:
    cur.execute(
        """CREATE TABLE IF NOT EXISTS departments (
            id INTEGER PRIMARY KEY,
            department_id VARCHAR(20) UNIQUE NOT NULL,
            name VARCHAR(120) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS semesters (
            id INTEGER PRIMARY KEY,
            name VARCHAR(60) NOT NULL,
            year INTEGER NOT NULL,
            start_date DATE,
            end_date DATE,
            is_current INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    cur.execute(
        """CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL,
            title VARCHAR(160),
            message TEXT,
            course_id INTEGER,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    print("  new tables ensured: departments, semesters, notifications")


def _add_columns(cur) -> None:
    _add_column(cur, "users", "student_number", "student_number VARCHAR(30)")
    _add_column(cur, "users", "lecturer_number", "lecturer_number VARCHAR(30)")
    _add_column(cur, "users", "department_id", "department_id INTEGER")
    _add_column(cur, "users", "gpa", "gpa FLOAT")
    _add_column(cur, "users", "region", "region VARCHAR(80)")
    _add_column(cur, "users", "highest_education", "highest_education VARCHAR(80)")
    _add_column(cur, "users", "is_active", "is_active INTEGER DEFAULT 1")

    _add_column(cur, "courses", "department_id", "department_id INTEGER")
    _add_column(cur, "courses", "semester_id", "semester_id INTEGER")
    _add_column(cur, "courses", "days_and_times", "days_and_times TEXT")
    _add_column(cur, "courses", "is_archived", "is_archived INTEGER DEFAULT 0")

    _add_column(cur, "enrollments", "semester_id", "semester_id INTEGER")
    _add_column(cur, "enrollments", "final_grade", "final_grade FLOAT")

    _add_column(cur, "course_materials", "files_json", "files_json TEXT")

    # quizzes table only exists after the ORM tables are created (first run may skip)
    if cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='quizzes'").fetchone():
        _add_column(cur, "quizzes", "is_test_data", "is_test_data INTEGER DEFAULT 0")


def _ensure_departments(cur) -> dict[str, int]:
    """Create Department rows from distinct legacy strings; return name->id map."""
    names = set()
    for (val,) in cur.execute("SELECT DISTINCT department FROM users WHERE department IS NOT NULL"):
        names.add(val)
    for (val,) in cur.execute("SELECT DISTINCT department FROM courses WHERE department IS NOT NULL"):
        names.add(val)

    name_to_id: dict[str, int] = {}
    fallback_n = 1
    for name in sorted(names):
        # Idempotent: reuse an existing department with the same (original) name.
        row = cur.execute("SELECT id FROM departments WHERE name = ?", (name,)).fetchone()
        if row:
            name_to_id[name] = row[0]
            continue
        code = _KNOWN_DEPT_CODES.get(name)
        if code is None:
            code = f"DEPT{fallback_n}"
            fallback_n += 1
        # Ensure code uniqueness across whatever already exists.
        while cur.execute("SELECT 1 FROM departments WHERE department_id = ?", (code,)).fetchone():
            code = f"{code}{fallback_n}"
            fallback_n += 1
        cur.execute(
            "INSERT INTO departments (department_id, name) VALUES (?, ?)", (code, name)
        )
        name_to_id[name] = cur.lastrowid
        print(f"  department: {name} -> {code} (id={cur.lastrowid})")
    return name_to_id


def _ensure_semester(cur) -> int:
    """Ensure a single current semester exists; return its id."""
    row = cur.execute("SELECT id FROM semesters ORDER BY is_current DESC, id LIMIT 1").fetchone()
    if row:
        return row[0]
    # Derive from legacy enrollment string like "Fall 2024" when possible.
    legacy = cur.execute(
        "SELECT semester FROM enrollments WHERE semester IS NOT NULL LIMIT 1"
    ).fetchone()
    name, year = "Fall", 2024
    if legacy and legacy[0]:
        parts = str(legacy[0]).split()
        if parts:
            name = parts[0]
        for p in parts:
            if p.isdigit():
                year = int(p)
    cur.execute(
        "INSERT INTO semesters (name, year, is_current) VALUES (?, ?, 1)", (name, year)
    )
    print(f"  semester: {name} {year} (id={cur.lastrowid})")
    return cur.lastrowid


def _backfill(cur, dept_map: dict[str, int], semester_id: int) -> None:
    # student_number / lecturer_number (only where empty).
    # Materialize first: reusing `cur` for UPDATEs mid-iteration would clobber
    # the SELECT cursor and skip most rows.
    users = cur.execute("SELECT id, role FROM users").fetchall()
    for uid, role in users:
        if role == "student":
            cur.execute(
                "UPDATE users SET student_number = ? WHERE id = ? AND (student_number IS NULL OR student_number = '')",
                (f"STU{uid:04d}", uid),
            )
        elif role == "lecturer":
            cur.execute(
                "UPDATE users SET lecturer_number = ? WHERE id = ? AND (lecturer_number IS NULL OR lecturer_number = '')",
                (f"LEC{uid:04d}", uid),
            )

    # users.department_id from legacy string
    for name, did in dept_map.items():
        cur.execute(
            "UPDATE users SET department_id = ? WHERE department = ? AND department_id IS NULL",
            (did, name),
        )
        cur.execute(
            "UPDATE courses SET department_id = ? WHERE department = ? AND department_id IS NULL",
            (did, name),
        )

    # courses.semester_id
    cur.execute("UPDATE courses SET semester_id = ? WHERE semester_id IS NULL", (semester_id,))
    # enrollments.semester_id
    cur.execute("UPDATE enrollments SET semester_id = ? WHERE semester_id IS NULL", (semester_id,))

    # Soft-delete flags default to "live" for all existing rows.
    cur.execute("UPDATE users SET is_active = 1 WHERE is_active IS NULL")
    cur.execute("UPDATE courses SET is_archived = 0 WHERE is_archived IS NULL")

    # enrollments.final_grade from a 'Final' grade when present (best-effort)
    cur.execute(
        """
        UPDATE enrollments
           SET final_grade = (
               SELECT g.score FROM grades g
                WHERE g.student_id = enrollments.student_id
                  AND g.course_id = enrollments.course_id
                  AND LOWER(g.assessment_type) = 'final'
                LIMIT 1
           )
         WHERE final_grade IS NULL
        """
    )
    print("  backfill complete (student/lecturer numbers, dept links, semester, final grades)")


def _create_orm_tables(url: str) -> None:
    """Create any table declared in models.py that does not exist yet.

    Dialect-agnostic: `create_all` issues the right DDL for SQLite or Postgres
    and never touches a table that already exists, so this is safe to re-run.
    """
    from sqlalchemy import create_engine

    sys.path.insert(0, str(BASE_DIR))
    import models  # noqa: F401  (registers every table on Base.metadata)

    engine = create_engine(url)
    try:
        models.Base.metadata.create_all(bind=engine)
    finally:
        engine.dispose()


def _sqlite_path_from_url(url: str):
    """Return the file path for a SQLite URL, or None for any other dialect."""
    if not url.startswith("sqlite"):
        return None
    tail = url.split("///", 1)[-1] if "///" in url else ""
    if not tail or tail == ":memory:":
        return None
    return Path(tail)


def migrate(db_path: Path) -> None:
    """Apply the legacy SQLite migration to an existing local database.

    This is the pre-existing-database path: additive ALTER TABLE plus backfills
    for rows that predate the newer columns. It requires the base tables to
    already exist, which is why `run()` creates them first.
    """
    print(f"Migrating: {db_path}")
    conn = sqlite3.connect(str(db_path))
    try:
        cur = conn.cursor()
        _create_new_tables(cur)
        _add_columns(cur)
        dept_map = _ensure_departments(cur)
        semester_id = _ensure_semester(cur)
        _backfill(cur, dept_map, semester_id)
        conn.commit()
        print("Migration committed successfully.")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def run(url: str) -> None:
    """Bring any target database up to date, fresh or existing.

    Ordering matters: the ORM tables are created FIRST. The legacy step below
    runs `ALTER TABLE users ADD COLUMN ...`, which fails with "no such table:
    users" on an empty database — exactly the state a new deployment starts in.

    On a non-SQLite target (a deployed Postgres instance) `create_all` is the
    whole migration. The legacy step is skipped because it exists only to
    upgrade the historical local SQLite file; there is no such history in a
    freshly provisioned database, and its raw sqlite3 calls would not apply.
    """
    _create_orm_tables(url)
    print("ORM tables ensured.")

    sqlite_path = _sqlite_path_from_url(url)
    if sqlite_path is None:
        print("Non-SQLite target: schema created; legacy SQLite backfill skipped.")
        return

    migrate(sqlite_path)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        target_url = f"sqlite:///{sys.argv[1]}"
    else:
        from config import DATABASE_URL as _configured

        target_url = _configured
    run(target_url)
