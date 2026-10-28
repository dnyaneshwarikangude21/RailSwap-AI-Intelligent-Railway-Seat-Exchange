from werkzeug.security import check_password_hash, generate_password_hash

from backend.constants import ROLE_USER, ROLES
from backend.extensions import db
from backend.utils import isoformat, utcnow


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint(
            "role IN ('user', 'admin')", name="ck_users_role_valid"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    display_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=ROLE_USER)
    share_display_name = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    bookings = db.relationship("Booking", back_populates="user", lazy="dynamic")
    notifications = db.relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def is_admin(self):
        return self.role == "admin"

    def public_identity(self):
        if not self.share_display_name:
            return "Demo passenger"
        return self.display_name

    def to_dict(self):
        return {
            "id": self.id,
            "display_name": self.display_name,
            "email": self.email,
            "role": self.role,
            "share_display_name": self.share_display_name,
            "created_at": isoformat(self.created_at),
        }

    def __repr__(self):
        return f"<User {self.email}>"
