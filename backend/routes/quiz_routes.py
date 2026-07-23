# routes/quiz_routes.py - Interactive MCQ quiz engine (auto-graded).
"""
Lecturer authoring + student attempt/submit, with hard authorization and the
critical rule that option correctness (is_correct) is NEVER sent to a student
before they submit. Attempts are one-per-student, resumable, and submission is
transactional and idempotent.
"""
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, get_lecturer
import models
import schemas

router = APIRouter(prefix="/lecturers", tags=["Quizzes (Lecturer)"])
student_router = APIRouter(prefix="/students", tags=["Quizzes (Student)"])


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


# ---------- authorization helpers ----------
def _owned_quiz(quiz_id: int, user: models.User, db: Session) -> models.Quiz:
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    course = db.query(models.Course).filter(
        models.Course.id == quiz.course_id, models.Course.lecturer_id == user.id
    ).first()
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    return quiz


def _owned_course(course_id: int, user: models.User, db: Session) -> models.Course:
    course = db.query(models.Course).filter(
        models.Course.id == course_id, models.Course.lecturer_id == user.id
    ).first()
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    return course


def _enrolled_quiz(quiz_id: int, user: models.User, db: Session) -> models.Quiz:
    quiz = db.query(models.Quiz).filter(models.Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    enrolled = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == user.id,
        models.Enrollment.course_id == quiz.course_id,
        models.Enrollment.status != "withdrawn",
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    return quiz


def _quiz_marks(quiz: models.Quiz) -> float:
    total = sum((q.marks or 0) for q in quiz.questions)
    return total if total > 0 else (quiz.max_marks or 0.0)


def _student_status(quiz: models.Quiz, attempt: Optional[models.QuizAttempt], now: datetime) -> str:
    if attempt and attempt.status == "submitted":
        return "Completed"
    if quiz.start_date and now < quiz.start_date:
        return "Upcoming"
    if quiz.end_date and now > quiz.end_date:
        return "Closed"
    return "Active"


def _grade_attempt(attempt: models.QuizAttempt, quiz: models.Quiz, db: Session) -> float:
    """Compute score = sum of marks for questions answered with the correct option."""
    answers = {a.question_id: a.selected_option_id for a in attempt.answers}
    score = 0.0
    for q in quiz.questions:
        sel = answers.get(q.id)
        if sel is None:
            continue
        opt = db.query(models.QuizOption).filter(
            models.QuizOption.id == sel, models.QuizOption.question_id == q.id
        ).first()
        if opt and opt.is_correct:
            score += (q.marks or 0)
    return score


# =====================================================================
# LECTURER — quiz authoring
# =====================================================================

@router.get("/courses/{course_id}/quizzes")
def list_course_quizzes(course_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_course(course_id, current_user, db)
    quizzes = db.query(models.Quiz).filter(models.Quiz.course_id == course_id).order_by(models.Quiz.id).all()
    return [
        {
            "id": q.id, "title": q.title, "description": q.description,
            "start_date": _iso(q.start_date), "end_date": _iso(q.end_date),
            "duration_minutes": q.duration_minutes, "max_marks": _quiz_marks(q),
            "is_test_data": bool(getattr(q, "is_test_data", 0)),
        }
        for q in quizzes
    ]


@router.post("/courses/{course_id}/quizzes", status_code=201)
def create_quiz(course_id: int, data: schemas.QuizCreate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_course(course_id, current_user, db)
    quiz = models.Quiz(
        course_id=course_id, title=data.title, description=data.description,
        start_date=data.start_date, end_date=data.end_date,
        duration_minutes=data.duration_minutes, max_marks=data.max_marks or 0.0,
        weight_from_participation=data.weight_from_participation or 0.0,
        file_url=data.file_url, created_by=current_user.id,
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return {
        "id": quiz.id, "title": quiz.title, "description": quiz.description,
        "start_date": _iso(quiz.start_date), "end_date": _iso(quiz.end_date),
        "duration_minutes": quiz.duration_minutes, "max_marks": _quiz_marks(quiz),
    }


def _question_out(q: models.QuizQuestion, include_correct: bool) -> dict:
    return {
        "id": q.id, "question_text": q.question_text, "marks": q.marks,
        "options": [
            {"id": o.id, "option_text": o.option_text,
             **({"is_correct": bool(o.is_correct)} if include_correct else {})}
            for o in q.options
        ],
    }


@router.get("/quizzes/{quiz_id}")
def get_quiz_for_lecturer(quiz_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, current_user, db)
    return {
        "quiz": {
            "title": quiz.title, "description": quiz.description,
            "start_date": _iso(quiz.start_date), "end_date": _iso(quiz.end_date),
            "duration_minutes": quiz.duration_minutes, "max_marks": _quiz_marks(quiz),
        },
        "questions": [_question_out(q, include_correct=True) for q in quiz.questions],
    }


@router.post("/quizzes/{quiz_id}/questions", status_code=201)
def add_question(quiz_id: int, data: schemas.QuizQuestionCreate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_quiz(quiz_id, current_user, db)  # authorization side-effect
    pos = db.query(models.QuizQuestion).filter(models.QuizQuestion.quiz_id == quiz_id).count()
    q = models.QuizQuestion(quiz_id=quiz_id, question_text=data.question_text, marks=data.marks or 1.0, position=pos)
    db.add(q)
    db.flush()
    # Enforce single-correct across provided options.
    seen_correct = False
    for i, opt in enumerate(data.options):
        is_c = bool(opt.is_correct) and not seen_correct
        if is_c:
            seen_correct = True
        db.add(models.QuizOption(question_id=q.id, option_text=opt.option_text, is_correct=1 if is_c else 0, position=i))
    db.commit()
    db.refresh(q)
    return _question_out(q, include_correct=True)


@router.put("/quizzes/{quiz_id}/questions/{question_id}")
def update_question(quiz_id: int, question_id: int, data: schemas.QuizQuestionUpdate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_quiz(quiz_id, current_user, db)
    q = db.query(models.QuizQuestion).filter(
        models.QuizQuestion.id == question_id, models.QuizQuestion.quiz_id == quiz_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    if data.question_text is not None:
        q.question_text = data.question_text
    if data.marks is not None:
        q.marks = data.marks
    db.commit()
    return _question_out(q, include_correct=True)


@router.delete("/quizzes/{quiz_id}/questions/{question_id}")
def delete_question(quiz_id: int, question_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_quiz(quiz_id, current_user, db)
    q = db.query(models.QuizQuestion).filter(
        models.QuizQuestion.id == question_id, models.QuizQuestion.quiz_id == quiz_id
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    # Answers reference this question; removing it would orphan them and make
    # the stored score disagree with the rendered breakdown.
    answered = db.query(models.QuizAnswer).filter(models.QuizAnswer.question_id == question_id).count()
    if answered:
        raise HTTPException(
            status_code=409,
            detail="Question has student answers and cannot be deleted",
        )
    db.delete(q)
    db.commit()
    return {"message": "Question deleted"}


def _question_owned_by_lecturer(question_id: int, user: models.User, db: Session) -> models.QuizQuestion:
    q = db.query(models.QuizQuestion).filter(models.QuizQuestion.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    _owned_quiz(q.quiz_id, user, db)
    return q


@router.post("/questions/{question_id}/options", status_code=201)
def add_option(question_id: int, data: schemas.QuizOptionCreate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _question_owned_by_lecturer(question_id, current_user, db)  # authorization side-effect
    pos = db.query(models.QuizOption).filter(models.QuizOption.question_id == question_id).count()
    if data.is_correct:
        # Single-correct: clear siblings.
        db.query(models.QuizOption).filter(models.QuizOption.question_id == question_id).update({models.QuizOption.is_correct: 0})
    o = models.QuizOption(question_id=question_id, option_text=data.option_text, is_correct=1 if data.is_correct else 0, position=pos)
    db.add(o)
    db.commit()
    db.refresh(o)
    return {"id": o.id, "option_text": o.option_text, "is_correct": bool(o.is_correct)}


def _option_owned_by_lecturer(option_id: int, user: models.User, db: Session) -> models.QuizOption:
    o = db.query(models.QuizOption).filter(models.QuizOption.id == option_id).first()
    if not o:
        raise HTTPException(status_code=404, detail="Option not found")
    _question_owned_by_lecturer(o.question_id, user, db)
    return o


@router.put("/options/{option_id}")
def update_option(option_id: int, data: schemas.QuizOptionUpdate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    o = _option_owned_by_lecturer(option_id, current_user, db)
    if data.option_text is not None:
        o.option_text = data.option_text
    if data.is_correct is True:
        db.query(models.QuizOption).filter(models.QuizOption.question_id == o.question_id).update({models.QuizOption.is_correct: 0})
        o.is_correct = 1
    elif data.is_correct is False:
        o.is_correct = 0
    db.commit()
    return {"id": o.id, "option_text": o.option_text, "is_correct": bool(o.is_correct)}


@router.delete("/options/{option_id}")
def delete_option(option_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    o = _option_owned_by_lecturer(option_id, current_user, db)
    # A selected option must survive: deleting it would leave the answer row
    # pointing at nothing, so the result page would show "No answer" while the
    # stored score still credits the mark.
    selected = db.query(models.QuizAnswer).filter(models.QuizAnswer.selected_option_id == option_id).count()
    if selected:
        raise HTTPException(
            status_code=409,
            detail="Option has been selected by students and cannot be deleted",
        )
    db.delete(o)
    db.commit()
    return {"message": "Option deleted"}


@router.delete("/quizzes/{quiz_id}")
def delete_quiz(quiz_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    """Delete a quiz, but never one students have already attempted.

    Quiz has no cascade to QuizAttempt and SQLite does not enforce foreign keys,
    so deleting a quiz with attempts would leave rows with a dangling quiz_id —
    every later read of those attempts would 500 on `quiz.title`. It would also
    destroy graded history, which the data-preservation policy forbids. Mirrors
    the 409 guard in assessment_routes.delete_assessment.
    """
    quiz = _owned_quiz(quiz_id, current_user, db)
    attempts = db.query(models.QuizAttempt).filter(models.QuizAttempt.quiz_id == quiz_id).count()
    if attempts:
        raise HTTPException(
            status_code=409,
            detail="Quiz has student attempts and cannot be deleted",
        )
    db.delete(quiz)
    db.commit()
    return {"message": "Quiz deleted"}


@router.get("/quizzes/{quiz_id}/results")
def quiz_results(quiz_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    quiz = _owned_quiz(quiz_id, current_user, db)
    max_marks = _quiz_marks(quiz)

    submitted = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.quiz_id == quiz_id, models.QuizAttempt.status == "submitted"
    ).all()

    enrollments = db.query(models.Enrollment).filter(
        models.Enrollment.course_id == quiz.course_id, models.Enrollment.status != "withdrawn"
    ).all()

    # Resolve every student name in one query instead of one per enrollment.
    student_ids = [e.student_id for e in enrollments]
    names = {}
    if student_ids:
        names = {
            u.id: u.name
            for u in db.query(models.User).filter(models.User.id.in_(student_ids)).all()
        }
    scores_by_student = {a.student_id: a.score for a in submitted}

    students = []
    scores = []
    for e in enrollments:
        score = scores_by_student.get(e.student_id)
        if isinstance(score, (int, float)):
            scores.append(score)
        students.append({
            "student_id": e.student_id,
            "student_name": names.get(e.student_id),
            "score": score,
        })

    # Per-question difficulty over submitted attempts. Load all answers once and
    # resolve correctness from an in-memory option map — the previous version
    # issued a query per (question, attempt) pair plus one per selected option.
    attempt_ids = [a.id for a in submitted]
    answers = []
    if attempt_ids:
        answers = db.query(models.QuizAnswer).filter(
            models.QuizAnswer.attempt_id.in_(attempt_ids)
        ).all()

    correct_option_ids = {
        o.id for q in quiz.questions for o in q.options if o.is_correct
    }
    selected_by_question = {}
    for ans in answers:
        if ans.selected_option_id is not None:
            selected_by_question.setdefault(ans.question_id, []).append(ans.selected_option_id)

    questions_difficulty = []
    for q in quiz.questions:
        selected = selected_by_question.get(q.id, [])
        answered = len(selected)
        correct = sum(1 for opt_id in selected if opt_id in correct_option_ids)
        pct = round((correct / answered) * 100, 1) if answered else None
        questions_difficulty.append({"question_text": q.question_text, "correct_percentage": pct})

    return {
        "quiz_title": quiz.title, "max_marks": max_marks,
        "average_score": round(sum(scores) / len(scores), 2) if scores else None,
        "min_score": min(scores) if scores else None,
        "max_score": max(scores) if scores else None,
        "students": students,
        "questions_difficulty": questions_difficulty,
    }


# =====================================================================
# STUDENT — attempt / submit / result
# =====================================================================

@student_router.get("/quizzes/{quiz_id}")
def student_quiz_summary(quiz_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _enrolled_quiz(quiz_id, current_user, db)
    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.quiz_id == quiz_id, models.QuizAttempt.student_id == current_user.id
    ).first()
    return {
        "status": _student_status(quiz, attempt, datetime.utcnow()),
        "course_id": quiz.course_id, "title": quiz.title,
    }


def _attempt_payload(attempt: models.QuizAttempt, quiz: models.Quiz, db: Session) -> dict:
    saved = {a.question_id: a.selected_option_id for a in attempt.answers}
    return {
        "attempt_id": attempt.id, "title": quiz.title, "course_id": quiz.course_id,
        "end_time": _iso(attempt.end_time),
        "questions": [
            {
                "id": q.id, "question_text": q.question_text, "marks": q.marks,
                "selected_option_id": saved.get(q.id),
                # SECURITY: never expose is_correct during an attempt.
                "options": [{"id": o.id, "option_text": o.option_text} for o in q.options],
            }
            for q in quiz.questions
        ],
    }


@student_router.post("/quizzes/{quiz_id}/start")
def start_quiz(quiz_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _enrolled_quiz(quiz_id, current_user, db)
    now = datetime.utcnow()
    if quiz.start_date and now < quiz.start_date:
        raise HTTPException(status_code=403, detail="Quiz has not opened yet")
    if quiz.end_date and now > quiz.end_date:
        raise HTTPException(status_code=403, detail="Quiz is closed")

    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.quiz_id == quiz_id, models.QuizAttempt.student_id == current_user.id
    ).first()

    if attempt and attempt.status == "submitted":
        raise HTTPException(status_code=409, detail="Quiz already submitted")

    if not attempt:
        # Deadline = min(quiz end_date, now + duration).
        end_time = quiz.end_date
        if quiz.duration_minutes:
            dur_end = now + timedelta(minutes=quiz.duration_minutes)
            end_time = min(dur_end, quiz.end_date) if quiz.end_date else dur_end
        attempt = models.QuizAttempt(
            quiz_id=quiz_id, student_id=current_user.id, started_at=now,
            end_time=end_time, status="in_progress",
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)

    return _attempt_payload(attempt, quiz, db)


def _owned_attempt(attempt_id: int, user: models.User, db: Session) -> models.QuizAttempt:
    attempt = db.query(models.QuizAttempt).filter(models.QuizAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    if attempt.student_id != user.id:
        raise HTTPException(status_code=403, detail="Not your attempt")
    return attempt


@student_router.get("/attempts/{attempt_id}")
def get_attempt(attempt_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, current_user, db)
    quiz = db.query(models.Quiz).filter(models.Quiz.id == attempt.quiz_id).first()
    return _attempt_payload(attempt, quiz, db)


@student_router.post("/attempts/{attempt_id}/answers")
def save_answer(attempt_id: int, data: schemas.QuizAnswerSave, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, current_user, db)
    if attempt.status != "in_progress":
        raise HTTPException(status_code=409, detail="Attempt is not open")
    if attempt.end_time and datetime.utcnow() > attempt.end_time:
        raise HTTPException(status_code=403, detail="Time is up")

    # Validate the question belongs to the quiz and option belongs to the question.
    question = db.query(models.QuizQuestion).filter(
        models.QuizQuestion.id == data.question_id, models.QuizQuestion.quiz_id == attempt.quiz_id
    ).first()
    if not question:
        raise HTTPException(status_code=400, detail="Question not part of this quiz")
    option = db.query(models.QuizOption).filter(
        models.QuizOption.id == data.selected_option_id, models.QuizOption.question_id == data.question_id
    ).first()
    if not option:
        raise HTTPException(status_code=400, detail="Option not part of this question")

    existing = db.query(models.QuizAnswer).filter(
        models.QuizAnswer.attempt_id == attempt_id, models.QuizAnswer.question_id == data.question_id
    ).first()
    if existing:
        existing.selected_option_id = data.selected_option_id
        existing.saved_at = datetime.utcnow()
    else:
        db.add(models.QuizAnswer(
            attempt_id=attempt_id, question_id=data.question_id,
            selected_option_id=data.selected_option_id,
        ))
    db.commit()
    return {"message": "Saved"}


@student_router.post("/attempts/{attempt_id}/submit")
def submit_attempt(attempt_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    attempt = _owned_attempt(attempt_id, current_user, db)
    quiz = db.query(models.Quiz).filter(models.Quiz.id == attempt.quiz_id).first()

    # Idempotent: if already submitted, return the existing score.
    if attempt.status == "submitted":
        return {"message": "Already submitted", "score": attempt.score}

    attempt.score = _grade_attempt(attempt, quiz, db)
    attempt.status = "submitted"
    attempt.submitted_at = datetime.utcnow()
    db.commit()
    return {"message": "Submitted", "score": attempt.score}


@student_router.get("/quizzes/{quiz_id}/result")
def student_quiz_result(quiz_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    quiz = _enrolled_quiz(quiz_id, current_user, db)
    attempt = db.query(models.QuizAttempt).filter(
        models.QuizAttempt.quiz_id == quiz_id,
        models.QuizAttempt.student_id == current_user.id,
        models.QuizAttempt.status == "submitted",
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="No submitted attempt found")

    saved = {a.question_id: a.selected_option_id for a in attempt.answers}
    answers = []
    for q in quiz.questions:
        sel_id = saved.get(q.id)
        sel_opt = db.query(models.QuizOption).filter(models.QuizOption.id == sel_id).first() if sel_id else None
        correct_opt = db.query(models.QuizOption).filter(
            models.QuizOption.question_id == q.id, models.QuizOption.is_correct == 1
        ).first()
        is_correct = bool(sel_opt and correct_opt and sel_opt.id == correct_opt.id)
        answers.append({
            "question_text": q.question_text,
            "is_correct": is_correct,
            "marks_obtained": (q.marks or 0) if is_correct else 0,
            "selected_answer": sel_opt.option_text if sel_opt else None,
            "correct_answer": correct_opt.option_text if correct_opt else None,
        })

    return {
        "quiz_title": quiz.title, "score": attempt.score or 0,
        "max_score": _quiz_marks(quiz), "answers": answers,
    }
