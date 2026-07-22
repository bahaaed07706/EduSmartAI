"""Phase B: quiz engine — positive flow + authorization/security/edge cases."""

from datetime import datetime, timedelta


def _make_quiz_with_question(client, lecturer, course, auth_headers, start=None, end=None):
    h = auth_headers(lecturer)
    body = {"title": "Q1", "description": "d", "max_marks": 2}
    if start:
        body["start_date"] = start
    if end:
        body["end_date"] = end
    quiz = client.post(f"/api/v1/lecturers/courses/{course.id}/quizzes", json=body, headers=h)
    assert quiz.status_code == 201, quiz.text
    quiz_id = quiz.json()["id"]
    q = client.post(
        f"/api/v1/lecturers/quizzes/{quiz_id}/questions",
        json={"question_text": "2+2?", "marks": 2, "options": [
            {"option_text": "3", "is_correct": False},
            {"option_text": "4", "is_correct": True},
        ]},
        headers=h,
    )
    assert q.status_code == 201, q.text
    return quiz_id, q.json()


def test_full_quiz_flow_and_grading(client, lecturers, students, courses, enrollments, auth_headers):
    quiz_id, question = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers)
    correct = next(o["id"] for o in question["options"] if o["is_correct"])

    sh = auth_headers(students[0])
    # Student summary shows Active.
    summ = client.get(f"/api/v1/students/quizzes/{quiz_id}", headers=sh)
    assert summ.status_code == 200 and summ.json()["status"] == "Active"

    # Start attempt — options MUST NOT leak is_correct.
    start = client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=sh)
    assert start.status_code == 200, start.text
    payload = start.json()
    attempt_id = payload["attempt_id"]
    for q in payload["questions"]:
        for opt in q["options"]:
            assert "is_correct" not in opt, "SECURITY: is_correct leaked to student during attempt"

    # Start again is idempotent (same attempt).
    again = client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=sh)
    assert again.json()["attempt_id"] == attempt_id

    # Answer correctly.
    qid = payload["questions"][0]["id"]
    saved = client.post(f"/api/v1/students/attempts/{attempt_id}/answers",
                        json={"question_id": qid, "selected_option_id": correct}, headers=sh)
    assert saved.status_code == 200

    # Submit — idempotent, full marks.
    sub = client.post(f"/api/v1/students/attempts/{attempt_id}/submit", headers=sh)
    assert sub.status_code == 200 and sub.json()["score"] == 2
    sub2 = client.post(f"/api/v1/students/attempts/{attempt_id}/submit", headers=sh)
    assert sub2.status_code == 200 and sub2.json()["score"] == 2

    # Student result reveals correctness (post-submit only).
    res = client.get(f"/api/v1/students/quizzes/{quiz_id}/result", headers=sh)
    assert res.status_code == 200
    rj = res.json()
    assert rj["score"] == 2 and rj["max_score"] == 2
    assert rj["answers"][0]["is_correct"] is True
    assert rj["answers"][0]["correct_answer"] == "4"

    # Lecturer results aggregate.
    lr = client.get(f"/api/v1/lecturers/quizzes/{quiz_id}/results", headers=auth_headers(lecturers[0]))
    assert lr.status_code == 200
    assert any(s["student_id"] == students[0].id and s["score"] == 2 for s in lr.json()["students"])


def test_quiz_authorization_matrix(client, lecturers, students, courses, enrollments, auth_headers):
    quiz_id, _ = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers)

    # Lecturer who doesn't own the course cannot read/manage the quiz.
    assert client.get(f"/api/v1/lecturers/quizzes/{quiz_id}", headers=auth_headers(lecturers[1])).status_code == 403
    assert client.get(f"/api/v1/lecturers/quizzes/{quiz_id}/results", headers=auth_headers(lecturers[1])).status_code == 403
    assert client.post(f"/api/v1/lecturers/courses/{courses[0].id}/quizzes",
                       json={"title": "x"}, headers=auth_headers(lecturers[1])).status_code == 403

    # Student not enrolled in the course cannot see/start.
    other_student = students[1]  # enrolled in courses[1], not courses[0]
    assert client.get(f"/api/v1/students/quizzes/{quiz_id}", headers=auth_headers(other_student)).status_code == 403
    assert client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=auth_headers(other_student)).status_code == 403


def test_answer_cross_question_option_rejected(client, lecturers, students, courses, enrollments, auth_headers):
    quiz_id, question = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers)
    sh = auth_headers(students[0])
    payload = client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=sh).json()
    attempt_id = payload["attempt_id"]
    qid = payload["questions"][0]["id"]
    # Option id 999999 is not part of this question.
    bad = client.post(f"/api/v1/students/attempts/{attempt_id}/answers",
                      json={"question_id": qid, "selected_option_id": 999999}, headers=sh)
    assert bad.status_code == 400


def test_missing_answers_scores_partial(client, lecturers, students, courses, enrollments, auth_headers):
    # Submit without answering -> score 0, still succeeds (no crash).
    quiz_id, _ = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers)
    sh = auth_headers(students[0])
    attempt_id = client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=sh).json()["attempt_id"]
    sub = client.post(f"/api/v1/students/attempts/{attempt_id}/submit", headers=sh)
    assert sub.status_code == 200 and sub.json()["score"] == 0


def test_closed_quiz_cannot_start(client, lecturers, students, courses, enrollments, auth_headers):
    past = (datetime.utcnow() - timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")
    past_start = (datetime.utcnow() - timedelta(days=3)).strftime("%Y-%m-%dT%H:%M")
    quiz_id, _ = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers, start=past_start, end=past)
    sh = auth_headers(students[0])
    assert client.get(f"/api/v1/students/quizzes/{quiz_id}", headers=sh).json()["status"] == "Closed"
    assert client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=sh).status_code == 403


def test_upcoming_quiz_cannot_start(client, lecturers, students, courses, enrollments, auth_headers):
    future = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")
    quiz_id, _ = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers, start=future)
    sh = auth_headers(students[0])
    assert client.get(f"/api/v1/students/quizzes/{quiz_id}", headers=sh).json()["status"] == "Upcoming"
    assert client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=sh).status_code == 403


def test_attempt_belongs_to_student(client, lecturers, students, courses, enrollments, auth_headers):
    quiz_id, _ = _make_quiz_with_question(client, lecturers[0], courses[0], auth_headers)
    attempt_id = client.post(f"/api/v1/students/quizzes/{quiz_id}/start", headers=auth_headers(students[0])).json()["attempt_id"]
    # A different student cannot read or submit this attempt.
    assert client.get(f"/api/v1/students/attempts/{attempt_id}", headers=auth_headers(students[1])).status_code == 403
    assert client.post(f"/api/v1/students/attempts/{attempt_id}/submit", headers=auth_headers(students[1])).status_code == 403
