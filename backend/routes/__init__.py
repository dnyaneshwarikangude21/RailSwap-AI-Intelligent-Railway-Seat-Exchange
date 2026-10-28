from backend.routes.admin import admin_bp
from backend.routes.analytics import analytics_bp
from backend.routes.auth import auth_bp
from backend.routes.bookings import bookings_bp
from backend.routes.exchanges import exchanges_bp
from backend.routes.matching import matching_bp
from backend.routes.notifications import notifications_bp
from backend.routes.preferences import preferences_bp
from backend.routes.trains import trains_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(trains_bp)
    app.register_blueprint(bookings_bp)
    app.register_blueprint(preferences_bp)
    app.register_blueprint(matching_bp)
    app.register_blueprint(exchanges_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(admin_bp)
