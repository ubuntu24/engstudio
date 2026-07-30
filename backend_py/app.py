import os
import sys
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))
import threading
from flask import Flask, request, jsonify, session as flask_session, Response, redirect, make_response, send_file
from backend.core.extensions import cache, limiter
from backend.core.db import init_db
from backend.api import register_blueprints
from backend.services.ai_manager import AI_AVAILABLE

def create_app():
    app = Flask(__name__)
    app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'english-vault-dev-key')

    app.config.from_mapping({
        "CACHE_TYPE": "SimpleCache",
        "CACHE_DEFAULT_TIMEOUT": 300,
        "SESSION_COOKIE_SAMESITE": "Lax",
        "SESSION_COOKIE_HTTPONLY": True,
        # "SESSION_COOKIE_SECURE": True, # Should be True in production with HTTPS
    })

    cache.init_app(app)
    limiter.init_app(app)

    # Khởi tạo database
    init_db()

    # Đăng ký toàn bộ blueprints
    register_blueprints(app)

    @app.after_request
    def after_request(response):
        # Hide server version for security (Fix for Finding 8)
        response.headers['Server'] = 'Hidden'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    return app

app = create_app()

import werkzeug
werkzeug.serving.WSGIRequestHandler.server_version = "Hidden"
werkzeug.serving.WSGIRequestHandler.sys_version = ""

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Khởi động Python Server: http://0.0.0.0:{port}", file=sys.stderr)
    app.run(host='0.0.0.0', port=port, debug=False)
