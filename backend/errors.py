from flask import jsonify


class ApiError(Exception):
    def __init__(self, message, status_code=400, code="BAD_REQUEST", details=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code
        self.details = details


def error_response(message, status_code=400, code="BAD_REQUEST", details=None):
    payload = {"error": {"code": code, "message": message}}
    if details is not None:
        payload["error"]["details"] = details
    return jsonify(payload), status_code


def register_error_handlers(app):
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        return error_response(
            error.message, error.status_code, error.code, error.details
        )

    @app.errorhandler(404)
    def handle_not_found(_error):
        return error_response("Resource not found.", 404, "NOT_FOUND")

    @app.errorhandler(405)
    def handle_method_not_allowed(_error):
        return error_response(
            "Method not allowed for this resource.", 405, "METHOD_NOT_ALLOWED"
        )

    @app.errorhandler(500)
    def handle_internal_error(error):
        app.logger.exception("Unhandled application error: %s", error)
        return error_response(
            "An unexpected server error occurred.", 500, "INTERNAL_SERVER_ERROR"
        )
