"""Phase B: assessment (file-submission) engine — flow + authorization."""


def _create_assessment(client, lecturer, course, auth_headers):
    r = client.post(
        f"/api/v1/lecturers/courses/{course.id}/assessments",
        json={"type": "assignment", "title": "HW1", "max_marks": 10},
        headers=auth_headers(lecturer),
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_assessment_submit_grade_flow(client, lecturers, students, courses, enrollments, auth_headers):
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)
    sh = auth_headers(students[0])

    # Student submits a file URL.
    sub = client.post(f"/api/v1/assessments/{aid}/submit", json={"file_url": "/uploads/x.pdf"}, headers=sh)
    assert sub.status_code == 200, sub.text

    # Student sees submission reflected in the course assessments list.
    listing = client.get(f"/api/v1/students/me/courses/{courses[0].id}/assessments", headers=sh)
    assert listing.status_code == 200
    row = next(a for a in listing.json() if a["id"] == aid)
    assert row["submitted"] is True and row["submission_file_url"] == "/uploads/x.pdf"

    # Lecturer sees the submission and grades it.
    lh = auth_headers(lecturers[0])
    subs = client.get(f"/api/v1/lecturers/assessments/{aid}/submissions", headers=lh)
    assert subs.status_code == 200 and len(subs.json()) == 1
    graded = client.post(
        f"/api/v1/lecturers/assessments/{aid}/grade/{students[0].id}",
        json={"student_id": students[0].id, "marks_obtained": 9, "feedback": "good"},
        headers=lh,
    )
    assert graded.status_code == 200

    # Student now sees the mark.
    listing2 = client.get(f"/api/v1/students/me/courses/{courses[0].id}/assessments", headers=sh)
    row2 = next(a for a in listing2.json() if a["id"] == aid)
    assert row2["marks_obtained"] == 9 and row2["feedback"] == "good"


def test_assessment_authorization(client, lecturers, students, courses, enrollments, auth_headers):
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)

    # Non-owning lecturer blocked.
    assert client.post(f"/api/v1/lecturers/courses/{courses[0].id}/assessments",
                       json={"type": "assignment", "title": "x"}, headers=auth_headers(lecturers[1])).status_code == 403
    assert client.get(f"/api/v1/lecturers/assessments/{aid}/submissions",
                      headers=auth_headers(lecturers[1])).status_code == 403

    # Non-enrolled student cannot submit.
    assert client.post(f"/api/v1/assessments/{aid}/submit",
                       json={"file_url": "/uploads/y.pdf"}, headers=auth_headers(students[1])).status_code == 403


def test_submission_download_authorization(client, lecturers, students, courses, enrollments, auth_headers):
    """Only the submitting student and the owning lecturer may download a file.

    The fixture's file never exists on disk, so an *authorized* caller gets 404
    (file missing) while an *unauthorized* caller must get 403 — the distinction
    proves authorization runs before any file access.
    """
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)
    client.post(f"/api/v1/assessments/{aid}/submit",
                json={"file_url": "/uploads/submissions/user_201/x.pdf"},
                headers=auth_headers(students[0]))
    sub_id = client.get(f"/api/v1/lecturers/assessments/{aid}/submissions",
                        headers=auth_headers(lecturers[0])).json()[0]["id"]

    # Unauthorized: a different student, and a lecturer who doesn't own the course.
    assert client.get(f"/api/v1/submissions/{sub_id}/download",
                      headers=auth_headers(students[1])).status_code == 403
    assert client.get(f"/api/v1/submissions/{sub_id}/download",
                      headers=auth_headers(lecturers[1])).status_code == 403

    # Authorized: owner student and owning lecturer pass authz (404 = file absent).
    assert client.get(f"/api/v1/submissions/{sub_id}/download",
                      headers=auth_headers(students[0])).status_code == 404
    assert client.get(f"/api/v1/submissions/{sub_id}/download",
                      headers=auth_headers(lecturers[0])).status_code == 404


def test_grade_out_of_range_and_delete_with_submissions(client, lecturers, students, courses, enrollments, auth_headers):
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)
    lh = auth_headers(lecturers[0])
    client.post(f"/api/v1/assessments/{aid}/submit", json={"file_url": "/uploads/z.pdf"}, headers=auth_headers(students[0]))

    # Marks above max_marks rejected.
    bad = client.post(f"/api/v1/lecturers/assessments/{aid}/grade/{students[0].id}",
                      json={"student_id": students[0].id, "marks_obtained": 999}, headers=lh)
    assert bad.status_code == 422

    # Deleting an assessment that has submissions is blocked (preserve history).
    assert client.delete(f"/api/v1/lecturers/assessments/{aid}", headers=lh).status_code == 409
