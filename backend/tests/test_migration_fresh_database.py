"""Migration against an empty database — the state a new deployment starts in.

This exists because of a real bug: `migrate_schema.run()` applied
`ALTER TABLE users ADD COLUMN ...` before the ORM tables were created. On the
existing local SQLite file the tables were already there, so it worked and the
whole suite stayed green. On an empty database it raised
"no such table: users" — which is exactly what the first production deploy
would have hit, since `render.yaml` runs the migration as its start command.

Clean-clone verification caught it. These tests keep it caught.
"""
import sqlite3

import migrate_schema

# Every table models.py declares. If a model is added, this list should grow.
EXPECTED_TABLES = {
    "assessments",
    "attendances",
    "course_materials",
    "courses",
    "departments",
    "enrollments",
    "grades",
    "notifications",
    "quiz_answers",
    "quiz_attempts",
    "quiz_options",
    "quiz_questions",
    "quizzes",
    "semesters",
    "student_features",
    "student_vle",
    "submissions",
    "users",
}


def _tables(path) -> set:
    conn = sqlite3.connect(str(path))
    try:
        rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
        return {r[0] for r in rows if not r[0].startswith("sqlite_")}
    finally:
        conn.close()


def test_migration_builds_schema_from_empty_database(tmp_path):
    """A brand-new database must come up complete, with no manual step."""
    db = tmp_path / "fresh.db"
    assert not db.exists()

    migrate_schema.run(f"sqlite:///{db}")

    assert db.exists(), "migration produced no database"
    created = _tables(db)
    missing = EXPECTED_TABLES - created
    assert not missing, f"missing tables after fresh migration: {sorted(missing)}"


def test_migration_is_idempotent_on_a_fresh_database(tmp_path):
    """Re-running must not fail or change the schema — deploys re-run it."""
    db = tmp_path / "fresh.db"
    migrate_schema.run(f"sqlite:///{db}")
    first = _tables(db)

    migrate_schema.run(f"sqlite:///{db}")
    assert _tables(db) == first


def test_ordering_creates_tables_before_altering_them(tmp_path):
    """Pin the ordering itself, not just its observable effect.

    `_add_columns` is what failed on an empty database. Asserting that the
    users table exists by the time it could run keeps a future refactor from
    quietly reintroducing the original ordering.
    """
    db = tmp_path / "ordered.db"
    migrate_schema.run(f"sqlite:///{db}")

    conn = sqlite3.connect(str(db))
    try:
        cols = {r[1] for r in conn.execute("PRAGMA table_info(users)")}
    finally:
        conn.close()

    # Columns the legacy ALTER step adds — present only if it ran successfully
    # against an already-created table.
    assert "student_number" in cols
    assert "department_id" in cols


def test_non_sqlite_target_skips_the_legacy_sqlite_step(tmp_path, monkeypatch):
    """A Postgres URL must not be handed to sqlite3.

    The legacy backfill uses raw sqlite3 calls. On a non-SQLite target the
    migration must stop after create_all rather than attempting them, which
    previously would have created a stray local file and left the real
    database empty.
    """
    called = []
    monkeypatch.setattr(migrate_schema, "migrate", lambda p: called.append(p))
    monkeypatch.setattr(migrate_schema, "_create_orm_tables", lambda url: None)

    migrate_schema.run("postgresql+psycopg://user@host/db")
    assert called == [], "legacy SQLite migration ran against a Postgres URL"

    # A SQLite URL still reaches it.
    migrate_schema.run(f"sqlite:///{tmp_path / 'x.db'}")
    assert len(called) == 1
