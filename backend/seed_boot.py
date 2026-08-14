"""Boot-time demo seeding step.

Runs between `migrate_schema.py` and uvicorn in the deployed start command. It
does nothing at all unless DEMO_RESET_ON_BOOT is explicitly enabled, so a normal
deployment — and every local checkout — boots without its database being
touched.

Why this is a separate switch from ENVIRONMENT: the public demo runs with
ENVIRONMENT=production, because that is what disables the API docs, requires an
exact CORS origin and enables HSTS. If seeding were gated on that same variable
the deployment would have to choose between being seeded and being hardened.
See `config.demo_reset_on_boot`.
"""
import sys

from config import demo_reset_on_boot


def main() -> int:
    if not demo_reset_on_boot():
        print("DEMO_RESET_ON_BOOT is off — leaving existing data untouched.")
        return 0

    # Imported lazily so that a boot with the flag off never even loads the
    # module that knows how to drop tables.
    from seed_data import SeedConfigError, reset_demo_data

    try:
        reset_demo_data()
    except SeedConfigError as exc:
        # Fail the boot loudly. A demo that silently starts with an empty
        # database looks identical to a broken one from the outside.
        print(f"Demo seeding aborted: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
