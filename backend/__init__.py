from flask import Flask, jsonify

from backend.config import Config
from backend.errors import error_response, register_error_handlers
from backend.extensions import cors, db, jwt, migrate


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object or Config)
    app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024
    app.json.sort_keys = False

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        supports_credentials=False,
    )
    migrate.init_app(app, db)

    from backend import models  # noqa: F401 - registers all ORM models

    from backend.routes import register_blueprints

    register_blueprints(app)
    register_error_handlers(app)
    register_jwt_callbacks()

    @app.get("/api/health")
    def health():
        return jsonify(
            {
                "status": "ok",
                "service": "RailSwap AI API",
                "data_mode": "SYNTHETIC_DEMONSTRATION_DATA",
            }
        )

    if app.config.get("AUTO_CREATE_DB", True):
        with app.app_context():
            db.create_all()

    return app


def register_jwt_callbacks():
    from flask_jwt_extended import current_user

    from backend.models import User

    @jwt.user_identity_loader
    def user_identity_lookup(user):
        if isinstance(user, User):
            return str(user.id)
        return str(user)

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data.get("sub")
        try:
            return db.session.get(User, int(identity))
        except (TypeError, ValueError):
            return None

    @jwt.user_lookup_error_loader
    def user_lookup_error(_jwt_header, _jwt_data):
        return error_response(
            "The authenticated account could not be found.", 401, "USER_NOT_FOUND"
        )

    @jwt.unauthorized_loader
    def missing_token(reason):
        return error_response(
            "Authentication is required for this resource.",
            401,
            "AUTH_REQUIRED",
            reason,
        )

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return error_response(
            "The authentication token is invalid.", 401, "INVALID_TOKEN", reason
        )

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _jwt_payload):
        return error_response(
            "Your session has expired. Please sign in again.",
            401,
            "TOKEN_EXPIRED",
        )

    @jwt.revoked_token_loader
    def revoked_token(_jwt_header, _jwt_payload):
        return error_response(
            "The authentication token is no longer valid.", 401, "TOKEN_REVOKED"
        )
