from flask import Flask, app
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    # CORS for Electron/React
    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
    )

    # Register blueprints
    from app.routes.health import health_bp
    app.register_blueprint(health_bp)

    from app.routes.vision import vision_bp
    app.register_blueprint(vision_bp)

    '''
    from app.routes.presage import presage_bp
    app.register_blueprint(presage_bp)
    '''

    from app.routes.tamagotchi import tamagotchi_bp
    app.register_blueprint(tamagotchi_bp)
    
    return app