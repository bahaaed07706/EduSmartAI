# routes/assessment_routes.py - File-submission assessments (assignment/project)
# with manual grading, plus a generic authenticated file upload.
import shutil
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from database import get_db
from auth import get_current_user, get_lecturer
from routes.file_routes import _resolve_within_uploads  # traversal-safe resolver
import models
import schemas

router = APIRouter(prefix="/lecturers", tags=["Assessments (Lecturer)"])
student_router = APIRouter(prefix="", tags=["Assessments (Student)"])

UPLOAD_DIR = (Path(__file__).parent.parent / "uploads").resolve()
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".pptx", ".xlsx", ".png", ".jpg", ".jpeg", ".zip"}
MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


def _iso(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _owned_course(course_id: int, user: models.User, db: Session) -> models.Course:
    course = db.query(models.Course).filter(
        models.Course.id == course_id, models.Course.lecturer_id == user.id
    ).first()
    if not course:
        raise HTTPException(status_code=403, detail="You don't teach this course")
    return course


def _assessment_out(a: models.Assessment) -> dict:
    return {
        "id": a.id, "type": a.type, "title": a.title, "description": a.description,
        "start_date": _iso(a.start_date), "end_date": _iso(a.end_date),
        "max_marks": a.max_marks, "weight_from_participation": a.weight_from_participation,
        "file_url": a.file_url,
    }


# ---------------- Lecturer ----------------
@router.get("/courses/{course_id}/assessments")
def list_assessments(course_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_course(course_id, current_user, db)
    rows = db.query(models.Assessment).filter(models.Assessment.course_id == course_id).order_by(models.Assessment.id).all()
    return [_assessment_out(a) for a in rows]


@router.post("/courses/{course_id}/assessments", status_code=201)
def create_assessment(course_id: int, data: schemas.AssessmentCreate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_course(course_id, current_user, db)
    if data.type not in {"assignment", "project", "quiz"}:
        raise HTTPException(status_code=422, detail="Invalid assessment type")
    a = models.Assessment(
        course_id=course_id, type=data.type, title=data.title, description=data.description,
        start_date=data.start_date, end_date=data.end_date, max_marks=data.max_marks or 100.0,
        weight_from_participation=data.weight_from_participation or 0.0, file_url=data.file_url,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _assessment_out(a)


def _owned_assessment(assessment_id: int, user: models.User, db: Session) -> models.Assessment:
    a = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    _owned_course(a.course_id, user, db)
    return a


@router.put("/assessments/{assessment_id}")
def update_assessment(assessment_id: int, data: schemas.AssessmentCreate, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    a = _owned_assessment(assessment_id, current_user, db)
    a.type, a.title, a.description = data.type, data.title, data.description
    a.start_date, a.end_date = data.start_date, data.end_date
    a.max_marks = data.max_marks or 100.0
    a.weight_from_participation = data.weight_from_participation or 0.0
    a.file_url = data.file_url
    db.commit()
    return _assessment_out(a)


@router.delete("/assessments/{assessment_id}")
def delete_assessment(assessment_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    a = _owned_assessment(assessment_id, current_user, db)
    # Block hard delete when student submissions exist (preserve history).
    has_subs = db.query(models.Submission).filter(models.Submission.assessment_id == assessment_id).count()
    if has_subs:
        raise HTTPException(status_code=409, detail="Assessment has submissions and cannot be deleted")
    db.delete(a)
    db.commit()
    return {"message": "Assessment deleted"}


@router.get("/assessments/{assessment_id}/submissions")
def list_submissions(assessment_id: int, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    _owned_assessment(assessment_id, current_user, db)
    rows = db.query(models.Submission).filter(models.Submission.assessment_id == assessment_id).all()
    return [
        {
            "id": s.id, "student_id": s.student_id, "file_url": s.file_url,
            "submitted_at": _iso(s.submitted_at), "marks_obtained": s.marks_obtained,
            "feedback": s.feedback,
        }
        for s in rows
    ]


@router.post("/assessments/{assessment_id}/grade/{student_id}")
def grade_submission(assessment_id: int, student_id: int, data: schemas.AssessmentGrade, current_user: models.User = Depends(get_lecturer), db: Session = Depends(get_db)):
    a = _owned_assessment(assessment_id, current_user, db)
    if a.max_marks and (data.marks_obtained < 0 or data.marks_obtained > a.max_marks):
        raise HTTPException(status_code=422, detail=f"Marks must be between 0 and {a.max_marks}")
    sub = db.query(models.Submission).filter(
        models.Submission.assessment_id == assessment_id, models.Submission.student_id == student_id
    ).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    sub.marks_obtained = data.marks_obtained
    sub.feedback = data.feedback
    sub.graded_by = current_user.id
    sub.graded_at = datetime.utcnow()
    db.commit()
    return {"message": "Graded", "id": sub.id, "marks_obtained": sub.marks_obtained}


# ---------------- Student ----------------
@student_router.post("/assessments/{assessment_id}/submit")
def submit_assessment(assessment_id: int, data: schemas.AssessmentSubmit, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    a = db.query(models.Assessment).filter(models.Assessment.id == assessment_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Assessment not found")
    enrolled = db.query(models.Enrollment).filter(
        models.Enrollment.student_id == current_user.id,
        models.Enrollment.course_id == a.course_id,
        models.Enrollment.status != "withdrawn",
    ).first()
    if not enrolled:
        raise HTTPException(status_code=403, detail="Not enrolled in this course")
    if a.end_date and datetime.utcnow() > a.end_date:
        raise HTTPException(status_code=403, detail="Assessment is closed")

    sub = db.query(models.Submission).filter(
        models.Submission.assessment_id == assessment_id, models.Submission.student_id == current_user.id
    ).first()
    if sub:
        sub.file_url = data.file_url
        sub.submitted_at = datetime.utcnow()
    else:
        db.add(models.Submission(
            assessment_id=assessment_id, student_id=current_user.id,
            file_url=data.file_url, submitted_at=datetime.utcnow(),
        ))
    db.commit()
    return {"message": "Submitted"}


@student_router.get("/submissions/{submission_id}/download")
def download_submission(
    submission_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a submitted file.

    Authorized to exactly two parties: the student who submitted it, and the
    lecturer who owns the assessment's course. Path is traversal-checked.
    """
    sub = db.query(models.Submission).filter(models.Submission.id == submission_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if current_user.role == "student":
        if sub.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not your submission")
    elif current_user.role == "lecturer":
        assessment = db.query(models.Assessment).filter(
            models.Assessment.id == sub.assessment_id
        ).first()
        owns = assessment and db.query(models.Course).filter(
            models.Course.id == assessment.course_id,
            models.Course.lecturer_id == current_user.id,
        ).first()
        if not owns:
            raise HTTPException(status_code=403, detail="You don't teach this course")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    safe_path = _resolve_within_uploads(sub.file_url)
    if not safe_path:
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=str(safe_path), filename=safe_path.name,
        media_type="application/octet-stream",
    )


# ---------------- Generic authenticated upload ----------------
@student_router.post("/files/upload")
async def upload_file(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Store an uploaded file and return its relative URL ({url})."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type not allowed: {ext}")

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")

    folder = UPLOAD_DIR / "submissions" / f"user_{current_user.id}"
    folder.mkdir(parents=True, exist_ok=True)
    # UUID storage name; original name is only used for the extension.
    stored = f"{uuid.uuid4().hex}{ext}"
    dest = folder / stored
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    rel_url = f"/uploads/submissions/user_{current_user.id}/{stored}"
    return {"url": rel_url, "filename": stored, "original_name": file.filename}
