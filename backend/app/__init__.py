from flask import Flask, app
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
    )

    from app.routes.health import health_bp
    app.register_blueprint(health_bp)

    from app.routes.vision import vision_bp
    app.register_blueprint(vision_bp)

    from app.routes.tamagotchi import tamagotchi_bp
    app.register_blueprint(tamagotchi_bp)

    from app.routes.observation import observation_bp
    app.register_blueprint(observation_bp)
    
    from app.routes.focus import focus_bp
    app.register_blueprint(focus_bp)
    
    return app