# routes/notification_routes.py - Per-user notifications.
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _serialize(n: models.Notification) -> dict:
    return {
        "id": n.id,
        "is_read": bool(n.is_read),
        "title": n.title,
        "message": n.message,
        "course_id": n.course_id,
        "created_at": str(n.created_at) if n.created_at else None,
    }


@router.get("/me")
def my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's notifications, newest first."""
    q = db.query(models.Notification).filter(models.Notification.user_id == current_user.id)
    if unread_only:
        q = q.filter(models.Notification.is_read == 0)
    rows = q.order_by(models.Notification.created_at.desc(), models.Notification.id.desc()).limit(limit).all()
    return [_serialize(n) for n in rows]


@router.patch("/{notif_id}/read")
def mark_read(
    notif_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark one notification as read and return the updated object."""
    n = db.query(models.Notification).filter(
        models.Notification.id == notif_id,
        models.Notification.user_id == current_user.id,
    ).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = 1
    db.commit()
    db.refresh(n)
    return _serialize(n)


@router.patch("/mark-all-read")
def mark_all_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark all of the current user's notifications as read."""
    updated = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == 0,
    ).update({models.Notification.is_read: 1})
    db.commit()
    return {"message": "All marked as read", "updated": updated}
