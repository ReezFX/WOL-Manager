import os
from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from flask_login import LoginManager

from app.config import config
from app.models import Base, User

# Create a scoped session factory
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False))

# Initialize Flask-Login
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'


@login_manager.user_loader
def load_user(user_id):
    """Load user based on user_id for Flask-Login."""
    return db_session.query(User).get(int(user_id))


def create_app(config_name=None):
    """Application factory for creating a Flask app instance."""
    
    # Determine config based on environment variable or default to 'development'
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')
    
    # Create and configure the app
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Initialize the database engine and bind it to the session
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
    db_session.configure(bind=engine)
    
    # Set up the teardown context for the database session
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()
    
    # Initialize extensions
    login_manager.init_app(app)
    
    # Import and register blueprints
    from app.auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/auth')
    
    from app.host import host as host_blueprint
    app.register_blueprint(host_blueprint, url_prefix='/hosts')
    
    from app.wol import wol as wol_blueprint
    app.register_blueprint(wol_blueprint, url_prefix='/wol')
    
    # Main route blueprint (can contain dashboard, etc.)
    from app.main import main as main_blueprint
    app.register_blueprint(main_blueprint)
    
    # Add context processor for templates
    @app.context_processor
    def inject_now():
        from datetime import datetime
        return {'now': datetime.utcnow()}
    
    # Initialize production-specific settings if needed
    if not app.debug and not app.testing and config_name == 'production':
        config[config_name].init_app(app)
    
    # Ensure the database is created
    # Create database tables at application startup
    Base.metadata.create_all(bind=engine)
    
    return app

