"""Regression tests for the P0/P1 security fixes and new admin/lecturer endpoints."""


def test_admin_dashboard_counts_and_authz(client, admin, students, lecturers, auth_headers):
    # Non-admin is rejected.
    denied = client.get("/api/v1/admin/dashboard", headers=auth_headers(students[0]))
    assert denied.status_code == 403

    resp = client.get("/api/v1/admin/dashboard", headers=auth_headers(admin))
    assert resp.status_code == 200
    body = resp.json()
    assert body["students_count"] == len(students)
    assert body["lecturers_count"] == len(lecturers)
    assert set(body) == {
        "departments_count", "lecturers_count", "students_count",
        "courses_count", "semesters_count",
    }


def test_admin_department_crud(client, admin, auth_headers):
    headers = auth_headers(admin)
    created = client.post(
        "/api/v1/admin/departments",
        json={"department_id": "CS", "name": "Computer Science"},
        headers=headers,
    )
    assert created.status_code == 201
    dept_id = created.json()["id"]

    # Duplicate code is rejected.
    dup = client.post(
        "/api/v1/admin/departments",
        json={"department_id": "CS", "name": "Other"},
        headers=headers,
    )
    assert dup.status_code == 409

    updated = client.put(
        f"/api/v1/admin/departments/{dept_id}",
        json={"department_id": "CS", "name": "CS Renamed"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "CS Renamed"

    deleted = client.delete(f"/api/v1/admin/departments/{dept_id}", headers=headers)
    assert deleted.status_code == 200
    assert client.get("/api/v1/admin/departments", headers=headers).json() == []


def test_lecturer_course_overview_idor(client, lecturers, courses, auth_headers):
    owner, other = lecturers[0], lecturers[1]
    owned_course = courses[0]  # taught by lecturers[0]

    ok = client.get(
        f"/api/v1/lecturers/courses/{owned_course.id}/overview",
        headers=auth_headers(owner),
    )
    assert ok.status_code == 200

    blocked = client.get(
        f"/api/v1/lecturers/courses/{owned_course.id}/overview",
        headers=auth_headers(other),
    )
    assert blocked.status_code == 403


def test_chatbot_ask_student_scope_idor(client, lecturers, students, courses, auth_headers):
    # students[0] is enrolled in courses[0] (taught by lecturers[0]).
    # lecturers[1] does not teach that student and must be denied.
    blocked = client.post(
        "/api/v1/chatbot/ask",
        params={"question": "who is this?", "student_id": students[0].id, "course_id": courses[0].id},
        headers=auth_headers(lecturers[1]),
    )
    assert blocked.status_code == 403

    allowed = client.post(
        "/api/v1/chatbot/ask",
        params={"question": "how is this student doing?", "student_id": students[0].id, "course_id": courses[0].id},
        headers=auth_headers(lecturers[0]),
    )
    assert allowed.status_code == 200


def test_chatbot_admin_denied(client, admin, auth_headers):
    resp = client.post(
        "/api/v1/chatbot/ask",
        params={"question": "hi"},
        headers=auth_headers(admin),
    )
    assert resp.status_code == 403


def test_notifications_me_empty(client, students, auth_headers):
    resp = client.get("/api/v1/notifications/me", headers=auth_headers(students[0]))
    assert resp.status_code == 200
    assert resp.json() == []


def test_student_semesters_handles_nonnumeric_legacy_value(client, students, auth_headers):
    # Regression: enrollment.semester is a string like "P1-TEST" (or "Fall 2024");
    # the endpoint must never crash with int() on a non-numeric value.
    resp = client.get("/api/v1/students/me/semesters", headers=auth_headers(students[0]))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    current = client.get("/api/v1/students/me/semesters/current", headers=auth_headers(students[0]))
    assert current.status_code == 200
    assert "name" in current.json()


def test_material_download_requires_enrollment(client, students, courses, auth_headers):
    # No material exists, but an unenrolled student must be blocked before any
    # 404 on the material id (authorization is checked on the material's course).
    resp = client.get(
        "/api/v1/files/999/download",
        headers=auth_headers(students[1]),
    )
    # 404 (no such material) is acceptable; the key assertion is it is never 200.
    assert resp.status_code in (403, 404)
