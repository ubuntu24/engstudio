from flask import Flask
from .auth_routes import auth_bp
from .learn_routes import learn_bp
from .quiz_routes import quiz_bp
from .grammar_routes import grammar_bp
from .practice_routes import practice_bp
from .video_routes import video_bp

def register_blueprints(app: Flask):
    app.register_blueprint(auth_bp)
    app.register_blueprint(learn_bp)
    app.register_blueprint(quiz_bp)
    app.register_blueprint(grammar_bp)
    app.register_blueprint(practice_bp)
    app.register_blueprint(video_bp)
