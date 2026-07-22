"""Minimal observable API baseline for the P0 repair harness."""


def test_health_and_login_behavior(client, admin, known_password):
    health = client.get("/health")
    successful_login = client.post(
        "/api/v1/auth/login",
        json={"email": admin.email, "password": known_password},
    )
    failed_login = client.post(
        "/api/v1/auth/login",
        json={"email": admin.email, "password": "definitely-wrong"},
    )

    assert health.status_code == 200
    assert health.json() == {"status": "healthy"}
    assert successful_login.status_code == 200
    assert successful_login.json()["token_type"] == "bearer"
    assert successful_login.json()["user"]["role"] == "admin"
    assert successful_login.json()["access_token"]
    assert failed_login.status_code == 401
    assert failed_login.json()["detail"] == "Invalid email or password"

    admin_users = client.get(
        "/api/v1/admin/users",
        headers={
            "Authorization": (
                f"Bearer {successful_login.json()['access_token']}"
            )
        },
    )
    assert admin_users.status_code == 200
    assert sorted(user["role"] for user in admin_users.json()) == [
        "admin",
        "lecturer",
        "lecturer",
        "student",
        "student",
    ]


def test_lecturer_role_and_course_ownership(
    client, lecturers, courses, auth_headers
):
    for lecturer, owned_course, other_course in (
        (lecturers[0], courses[0], courses[1]),
        (lecturers[1], courses[1], courses[0]),
    ):
        headers = auth_headers(lecturer)
        profile = client.get("/api/v1/lecturers/me", headers=headers)
        denied_student_profile = client.get(
            "/api/v1/students/me", headers=headers
        )
        visible_courses = client.get(
            "/api/v1/lecturers/me/courses", headers=headers
        )
        owned_files = client.get(
            f"/api/v1/files/course/{owned_course.id}", headers=headers
        )
        cross_course_files = client.get(
            f"/api/v1/files/course/{other_course.id}", headers=headers
        )

        assert profile.status_code == 200
        assert profile.json()["role"] == "lecturer"
        assert denied_student_profile.status_code == 403
        assert visible_courses.status_code == 200
        assert [course["code"] for course in visible_courses.json()] == [
            owned_course.code
        ]
        assert owned_files.status_code == 200
        assert owned_files.json() == []
        assert cross_course_files.status_code == 403
        assert cross_course_files.json()["detail"] == "You don't teach this course"


def test_student_role_and_enrollment_boundaries(
    client, students, courses, auth_headers
):
    for student, enrolled_course, other_course in (
        (students[0], courses[0], courses[1]),
        (students[1], courses[1], courses[0]),
    ):
        headers = auth_headers(student)
        profile = client.get("/api/v1/students/me", headers=headers)
        denied_lecturer_profile = client.get(
            "/api/v1/lecturers/me", headers=headers
        )
        visible_courses = client.get(
            "/api/v1/students/me/courses", headers=headers
        )
        enrolled_files = client.get(
            f"/api/v1/files/course/{enrolled_course.id}", headers=headers
        )
        cross_course_files = client.get(
            f"/api/v1/files/course/{other_course.id}", headers=headers
        )

        assert profile.status_code == 200
        assert profile.json()["role"] == "student"
        assert denied_lecturer_profile.status_code == 403
        assert visible_courses.status_code == 200
        assert [course["code"] for course in visible_courses.json()] == [
            enrolled_course.code
        ]
        assert enrolled_files.status_code == 200
        assert enrolled_files.json() == []
        assert cross_course_files.status_code == 403
        assert cross_course_files.json()["detail"] == "Not enrolled in this course"
