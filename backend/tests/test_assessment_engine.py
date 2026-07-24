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
    # The path must live in the student's own upload folder — see
    # assessment_routes._validate_own_upload.
    own_url = f"/uploads/submissions/user_{students[0].id}/x.pdf"

    # Student submits a file URL.
    sub = client.post(f"/api/v1/assessments/{aid}/submit", json={"file_url": own_url}, headers=sh)
    assert sub.status_code == 200, sub.text

    # Student sees submission reflected in the course assessments list.
    listing = client.get(f"/api/v1/students/me/courses/{courses[0].id}/assessments", headers=sh)
    assert listing.status_code == 200
    row = next(a for a in listing.json() if a["id"] == aid)
    assert row["submitted"] is True and row["submission_file_url"] == own_url

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


def test_submission_download_serves_real_file_to_authorized_callers(
    client, lecturers, students, courses, enrollments, auth_headers, uploaded_submission
):
    """An authorized caller gets the actual bytes; everyone else gets 403.

    This must exercise a file that really exists on disk. The previous version
    of this test accepted 404 for the authorized caller, which masked the
    POSIX-only resolver bug where a stored "/uploads/..." reference was treated
    as an absolute filesystem path and never resolved.
    """
    stored_url, expected_bytes = uploaded_submission(students[0].id)
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)
    client.post(f"/api/v1/assessments/{aid}/submit",
                json={"file_url": stored_url},
                headers=auth_headers(students[0]))
    sub_id = client.get(f"/api/v1/lecturers/assessments/{aid}/submissions",
                        headers=auth_headers(lecturers[0])).json()[0]["id"]

    # Authorized: the submitting student and the owning lecturer receive the file.
    for caller in (students[0], lecturers[0]):
        r = client.get(f"/api/v1/submissions/{sub_id}/download", headers=auth_headers(caller))
        assert r.status_code == 200, f"{caller.role} got {r.status_code}: {r.text}"
        assert r.content == expected_bytes

    # Unauthorized: a different student, and a lecturer who doesn't own the course.
    assert client.get(f"/api/v1/submissions/{sub_id}/download",
                      headers=auth_headers(students[1])).status_code == 403
    assert client.get(f"/api/v1/submissions/{sub_id}/download",
                      headers=auth_headers(lecturers[1])).status_code == 403

    # Unauthenticated callers never reach the file.
    assert client.get(f"/api/v1/submissions/{sub_id}/download").status_code in (401, 403)


def test_submit_rejects_file_the_student_did_not_upload(
    client, lecturers, students, courses, enrollments, auth_headers
):
    """file_url is client input: it must reference the caller's own upload.

    Without this rule a student could point a submission at course material or
    another student's folder and then read it back through the authorized
    download endpoint.
    """
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)
    sh = auth_headers(students[0])
    mine = students[0].id
    theirs = students[1].id

    hostile = [
        f"/uploads/submissions/user_{theirs}/secret.pdf",   # another student
        "/uploads/course_1/20260101_answers.pdf",           # course material
        "/uploads/x.pdf",                                   # outside submissions
        f"/uploads/submissions/user_{mine}/../user_{theirs}/x.pdf",  # traversal
        "",
    ]
    for url in hostile:
        r = client.post(f"/api/v1/assessments/{aid}/submit", json={"file_url": url}, headers=sh)
        assert r.status_code == 422, f"{url!r} was accepted: {r.status_code}"

    # The caller's own upload path is still accepted.
    ok = client.post(f"/api/v1/assessments/{aid}/submit",
                     json={"file_url": f"/uploads/submissions/user_{mine}/ok.pdf"}, headers=sh)
    assert ok.status_code == 200, ok.text


def test_grade_out_of_range_and_delete_with_submissions(client, lecturers, students, courses, enrollments, auth_headers):
    aid = _create_assessment(client, lecturers[0], courses[0], auth_headers)
    lh = auth_headers(lecturers[0])
    client.post(f"/api/v1/assessments/{aid}/submit",
                json={"file_url": f"/uploads/submissions/user_{students[0].id}/z.pdf"},
                headers=auth_headers(students[0]))

    # Marks above max_marks rejected.
    bad = client.post(f"/api/v1/lecturers/assessments/{aid}/grade/{students[0].id}",
                      json={"student_id": students[0].id, "marks_obtained": 999}, headers=lh)
    assert bad.status_code == 422

    # Deleting an assessment that has submissions is blocked (preserve history).
    assert client.delete(f"/api/v1/lecturers/assessments/{aid}", headers=lh).status_code == 409
