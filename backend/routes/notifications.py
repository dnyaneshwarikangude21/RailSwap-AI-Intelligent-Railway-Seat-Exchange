from flask import Blueprint, jsonify, request
from flask_jwt_extended import current_user, jwt_required

from backend.errors import ApiError
from backend.extensions import db
from backend.models import Notification
from backend.utils import isoformat, utcnow

notifications_bp = Blueprint(
    "notifications", __name__, url_prefix="/api/notifications"
)


@notifications_bp.get("")
@jwt_required()
def list_notifications():
    try:
        limit = max(1, min(int(request.args.get("limit", 50)), 100))
    except ValueError:
        raise ApiError("limit must be an integer.", 400, "VALIDATION_ERROR") from None
    unread_only = request.args.get("unread") == "true"

    query = Notification.query.filter_by(user_id=current_user.id)
    if unread_only:
        query = query.filter(Notification.read_at.is_(None))
    unread_count = Notification.query.filter_by(
        user_id=current_user.id, read_at=None
    ).count()
    items = query.order_by(Notification.created_at.desc()).limit(limit).all()
    return jsonify(
        {
            "items": [notification.to_dict() for notification in items],
            "count": len(items),
            "unread_count": unread_count,
        }
    )


@notifications_bp.post("/read-all")
@jwt_required()
def mark_all_read():
    now = utcnow()
    updated = Notification.query.filter_by(
        user_id=current_user.id, read_at=None
    ).update({Notification.read_at: now}, synchronize_session=False)
    db.session.commit()
    return jsonify({"updated": updated, "read_at": isoformat(now)})


@notifications_bp.post("/<int:notification_id>/read")
@jwt_required()
def mark_read(notification_id):
    notification = db.session.get(Notification, notification_id)
    if notification is None:
        raise ApiError("Notification not found.", 404, "NOTIFICATION_NOT_FOUND")
    if notification.user_id != current_user.id:
        raise ApiError(
            "You do not have access to this notification.", 403, "FORBIDDEN"
        )
    if notification.read_at is None:
        notification.read_at = utcnow()
        db.session.commit()
    return jsonify({"notification": notification.to_dict()})
