"""The demo-seed switch must stay independent of the production switch.

ENVIRONMENT=production is what disables the API docs, forces an exact CORS
origin and enables HSTS. The public demo needs all of that *and* needs its data
rebuilt on every boot. If one variable drove both, the deployment would have to
give up one to get the other, and the tempting fix — loosening ENVIRONMENT so
seeding runs — would quietly disable the security settings.

These tests pin the separation, and the ordering guarantee that credentials are
validated before anything is dropped.
"""

from __future__ import annotations

import sqlite3
import subprocess
import sys
from pathlib import Path

import pytest

from config import demo_reset_on_boot


BACKEND_DIR = Path(__file__).resolve().parents[1]
STRONG_PASSWORD = "demo-password-not-real"


def _base_env(db_path: Path) -> dict[str, str]:
    """Overrides layered onto the real environment for a child process.

    Only overrides — the parent environment is inherited, because on Windows a
    stripped PATH/SYSTEMROOT breaks socket initialisation before any backend
    module even loads.
    """
    return {
        "DATABASE_URL": f"sqlite:///{db_path.as_posix()}",
        "JWT_SECRET": "seed-boot-test-secret-value",
        "SKIP_MODEL_VALIDATION": "1",
        "PYTHON_DOTENV_DISABLED": "1",
        # Match the decoding the parent uses when reading this process's output.
        "PYTHONIOENCODING": "utf-8",
    }


_DEMO_VARS = (
    "DEMO_RESET_ON_BOOT",
    "SEED_ADMIN_PASSWORD",
    "SEED_LECTURER_PASSWORD",
    "SEED_STUDENT_PASSWORD",
)


def _run_seed_boot(env: dict[str, str]) -> subprocess.CompletedProcess:
    """Run the real boot entrypoint the way the deployed start command does."""
    import os

    full_env = {**os.environ}
    # Anything demo-related must come from this call, not from the developer's
    # own shell, or "flag is off" would depend on who ran the suite.
    for var in _DEMO_VARS:
        full_env.pop(var, None)
    full_env.update(env)
    return subprocess.run(
        [sys.executable, "seed_boot.py"],
        cwd=BACKEND_DIR,
        env=full_env,
        capture_output=True,
        text=True,
        # The seed script prints Arabic and emoji. Without an explicit codec the
        # Windows default (cp1252) raises mid-capture and the output this test
        # asserts on is lost.
        encoding="utf-8",
        errors="replace",
    )


def _create_schema_with_marker(db_path: Path) -> None:
    """Build the real schema, then plant a row that must survive a failed run."""
    import os

    env = {**os.environ, **_base_env(db_path)}
    created = subprocess.run(
        [sys.executable, "-c", "from database import init_db; init_db()"],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
        # The seed script prints Arabic and emoji. Without an explicit codec the
        # Windows default (cp1252) raises mid-capture and the output this test
        # asserts on is lost.
        encoding="utf-8",
        errors="replace",
    )
    assert created.returncode == 0, created.stderr

    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO users (name, email, password_hash, role, is_active) "
            "VALUES (?, ?, ?, ?, ?)",
            ("Pre-existing", "keepme@example.com", "not-a-real-hash", "student", 1),
        )
        conn.commit()


def _user_emails(db_path: Path) -> list[str]:
    with sqlite3.connect(db_path) as conn:
        return [row[0] for row in conn.execute("SELECT email FROM users")]


# --------------------------------------------------------------- flag parsing


@pytest.mark.parametrize("value", ["1", "true", "TRUE", "yes", "on", " true "])
def test_flag_recognises_truthy_spellings(monkeypatch, value):
    monkeypatch.setenv("DEMO_RESET_ON_BOOT", value)
    assert demo_reset_on_boot() is True


@pytest.mark.parametrize("value", ["", "0", "false", "no", "off", "maybe"])
def test_flag_defaults_to_off_for_anything_else(monkeypatch, value):
    monkeypatch.setenv("DEMO_RESET_ON_BOOT", value)
    assert demo_reset_on_boot() is False


def test_flag_is_off_when_unset(monkeypatch):
    monkeypatch.delenv("DEMO_RESET_ON_BOOT", raising=False)
    assert demo_reset_on_boot() is False


# ----------------------------------------------------------- the separation


@pytest.mark.parametrize("environment", ["production", "development", ""])
def test_environment_does_not_influence_the_seed_flag(monkeypatch, environment):
    """The whole point: ENVIRONMENT must not be able to turn seeding on or off."""
    monkeypatch.setenv("ENVIRONMENT", environment)

    monkeypatch.setenv("DEMO_RESET_ON_BOOT", "true")
    assert demo_reset_on_boot() is True

    monkeypatch.setenv("DEMO_RESET_ON_BOOT", "false")
    assert demo_reset_on_boot() is False


def test_production_still_hardens_while_demo_seeding_is_enabled(monkeypatch):
    """Both switches on at once: docs stay closed, wildcard CORS still refused."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEMO_RESET_ON_BOOT", "true")

    import importlib

    import main

    monkeypatch.setattr(main, "CORS_ORIGINS", ["https://demo.example.app"])
    reloaded = importlib.reload(main)
    try:
        assert reloaded.IS_PRODUCTION is True
        assert reloaded.app.docs_url is None
        assert reloaded.app.openapi_url is None
        assert demo_reset_on_boot() is True
    finally:
        # Restore the module for any test importing it afterwards.
        monkeypatch.undo()
        importlib.reload(main)


def test_production_refuses_wildcard_cors_even_with_seeding_on(monkeypatch):
    """Enabling the demo must not become a way to relax the CORS guard."""
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("DEMO_RESET_ON_BOOT", "true")
    monkeypatch.setenv("CORS_ORIGINS", "*")

    import importlib

    import config
    import main

    importlib.reload(config)
    try:
        with pytest.raises(RuntimeError, match="CORS_ORIGINS"):
            importlib.reload(main)
    finally:
        monkeypatch.undo()
        importlib.reload(config)
        importlib.reload(main)


# ------------------------------------------------------- boot-time behaviour


def test_boot_leaves_data_alone_when_flag_is_off(tmp_path):
    db_path = tmp_path / "demo.db"
    _create_schema_with_marker(db_path)

    env = _base_env(db_path)
    env["ENVIRONMENT"] = "production"
    # DEMO_RESET_ON_BOOT deliberately absent.
    result = _run_seed_boot(env)

    assert result.returncode == 0, result.stderr
    assert _user_emails(db_path) == ["keepme@example.com"]


def test_boot_aborts_before_dropping_when_a_password_is_missing(tmp_path):
    """Validation must happen before the drop, or a failure empties the demo."""
    db_path = tmp_path / "demo.db"
    _create_schema_with_marker(db_path)

    env = _base_env(db_path)
    env["DEMO_RESET_ON_BOOT"] = "true"
    env["SEED_LECTURER_PASSWORD"] = STRONG_PASSWORD
    env["SEED_STUDENT_PASSWORD"] = STRONG_PASSWORD
    env["SEED_ADMIN_PASSWORD"] = "short"  # below the 12-character minimum
    result = _run_seed_boot(env)

    assert result.returncode == 1
    assert "SEED_ADMIN_PASSWORD" in result.stderr
    # The pre-existing row is still there: nothing was dropped.
    assert _user_emails(db_path) == ["keepme@example.com"]


def test_boot_rebuilds_demo_data_in_production(tmp_path):
    """The demo case end to end: production hardening on, data rebuilt anyway."""
    db_path = tmp_path / "demo.db"
    _create_schema_with_marker(db_path)

    env = _base_env(db_path)
    env["ENVIRONMENT"] = "production"
    env["DEMO_RESET_ON_BOOT"] = "true"
    env["SEED_ADMIN_PASSWORD"] = STRONG_PASSWORD
    env["SEED_LECTURER_PASSWORD"] = STRONG_PASSWORD
    env["SEED_STUDENT_PASSWORD"] = STRONG_PASSWORD
    result = _run_seed_boot(env)

    assert result.returncode == 0, result.stderr
    emails = _user_emails(db_path)
    # The stale row is gone and the known demo identities are present.
    assert "keepme@example.com" not in emails
    assert "admin@edu.com" in emails
    assert len(emails) > 1
