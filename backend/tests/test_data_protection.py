"""Phase A: data-protection regression tests.

Admin "delete" operations must be soft (deactivate/archive/withdraw) and must
NEVER physically remove students, courses, or historical records.
"""

import models


def _count(session_factory, model):
    with session_factory() as s:
        return s.query(model).count()


def test_delete_student_is_soft_and_preserves_row(client, admin, students, auth_headers, session_factory):
    headers = auth_headers(admin)
    before = _count(session_factory, models.User)

    resp = client.delete(f"/api/v1/admin/students/{students[0].id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False

    # The user row still exists (soft delete, not physical delete).
    assert _count(session_factory, models.User) == before

    # Deactivated student is hidden from the admin list...
    listed = client.get("/api/v1/admin/students", headers=headers).json()
    assert all(s["id"] != students[0].id for s in listed)

    # ...and can no longer authenticate.
    login = client.post(
        "/api/v1/auth/login",
        json={"email": students[0].email, "password": "P0-fixture-password"},
    )
    assert login.status_code == 403


def test_delete_course_is_archive_and_preserves_row(client, admin, courses, auth_headers, session_factory):
    headers = auth_headers(admin)
    before = _count(session_factory, models.Course)

    resp = client.delete(f"/api/v1/admin/courses/{courses[0].id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_archived"] is True

    assert _count(session_factory, models.Course) == before
    listed = client.get("/api/v1/admin/courses", headers=headers).json()
    assert all(c["id"] != courses[0].id for c in listed)


def test_withdraw_enrollment_keeps_row(client, admin, courses, students, enrollments, auth_headers, session_factory):
    headers = auth_headers(admin)
    before = _count(session_factory, models.Enrollment)

    # enrollments[0] links students[0] to courses[0].
    resp = client.delete(
        f"/api/v1/admin/courses/{courses[0].id}/enrollments/{enrollments[0].id}",
        headers=headers,
    )
    assert resp.status_code == 200

    # Row is preserved (status -> withdrawn), not deleted.
    assert _count(session_factory, models.Enrollment) == before
    with session_factory() as s:
        e = s.query(models.Enrollment).filter(models.Enrollment.id == enrollments[0].id).first()
        assert e is not None
        assert e.status == "withdrawn"

    # Withdrawn enrollment is hidden from the course roster.
    roster = client.get(
        f"/api/v1/admin/courses/{courses[0].id}/enrollments", headers=headers
    ).json()
    assert all(en["id"] != enrollments[0].id for en in roster)
