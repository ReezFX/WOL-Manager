import os
import redis
import pathlib
from datetime import timedelta
from flask import Flask, request, flash, redirect, url_for
from sqlalchemy import create_engine
from sqlalchemy.orm import scoped_session, sessionmaker
from flask_login import LoginManager
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect, CSRFError
from flask_session import Session

from app.config import config
from app.models import Base, User, db_session

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
    
    # Configure session security for external access
    app.config.update(
        SESSION_COOKIE_SECURE=False,                # Allow HTTP for cookies
        SESSION_COOKIE_HTTPONLY=True,              # Prevent JavaScript access to cookies
        SESSION_COOKIE_SAMESITE='Lax',             # Allow normal login flows while enhancing security
        SESSION_COOKIE_NAME='wol_manager_session', # Set custom session cookie name
        SESSION_COOKIE_PATH='/',                   # Set cookie path to root
        PERMANENT_SESSION_LIFETIME=timedelta(days=1),
        WTF_CSRF_TIME_LIMIT=3600,                  # CSRF token valid for 1 hour
        REMEMBER_COOKIE_DURATION=timedelta(days=1), # Set remember me cookie duration
        REMEMBER_COOKIE_HTTPONLY=True,             # Prevent JavaScript access to remember cookie
        REMEMBER_COOKIE_SECURE=False,               # Allow HTTP for remember cookie
        REMEMBER_COOKIE_SAMESITE='Lax'             # Allow normal login flows for remember cookie while enhancing security
    )
    
    # Allow session cookies across subdomains and external access
    # Allow session cookies across subdomains and external access
    # Use the SERVER_NAME from environment if available, otherwise don't restrict domain
    # SERVER_NAME configuration is disabled to allow Flask to use the host from the request
    # This fixes routing issues when accessing from external devices
    # if os.environ.get('SERVER_NAME'):
    #     app.config['SERVER_NAME'] = os.environ.get('SERVER_NAME')
    # Don't set SESSION_COOKIE_DOMAIN explicitly to allow access from IP addresses
    # This allows the browser to use the current domain from the request
    # Set SESSION_COOKIE_DOMAIN to None to use the domain from the request
    app.config['SESSION_COOKIE_DOMAIN'] = None
    
    # Use filesystem-based sessions regardless of Redis availability
    # This ensures session data is stored on disk and not in cookies
    app.config.update(
        SESSION_TYPE='filesystem',                  # Store sessions on disk
        SESSION_FILE_DIR=os.path.join(app.instance_path, 'flask_session'),
        SESSION_USE_SIGNER=True,                   # Cryptographically sign session cookies 
        SESSION_PERMANENT=True,                    # Enable permanent sessions
        SESSION_REFRESH_EACH_REQUEST=True,         # Refresh the session cookie on each request
        SESSION_FILE_THRESHOLD=500,                # Maximum number of sessions in filesystem
        SESSION_KEY_PREFIX='wol_session_'          # Prefix for session files
    )
    
    # Ensure the session directory exists
    os.makedirs(app.config['SESSION_FILE_DIR'], exist_ok=True)
    
    # Log session configuration
    print(f"Session config: TYPE={app.config['SESSION_TYPE']}, DOMAIN={app.config['SESSION_COOKIE_DOMAIN']}, PATH={app.config['SESSION_COOKIE_PATH']}")
    # Initialize Flask-Session
    Session(app)
    
    # Initialize the database engine and bind it to the session
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
    db_session.configure(bind=engine)
    
    # Set up the teardown context for the database session
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()
    
    # Initialize extensions with custom session configuration
    login_manager.init_app(app)
    login_manager.session_protection = 'strong'  # Enable strong session protection
    login_manager.refresh_view = "auth.login"
    login_manager.needs_refresh_message = "Please login again to confirm your identity"
    login_manager.needs_refresh_message_category = "info"
    
    # Enable CSRF protection
    csrf = CSRFProtect(app)
    
    # CSRF error handler
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        flash('Your form session expired. Please try again.', 'warning')
        return redirect(url_for('main.index'))
    
    
    # Initialize Flask-Migrate
    migrate = Migrate(app, Base.metadata)
    # Import and register blueprints
    from app.auth import auth as auth_blueprint
    app.register_blueprint(auth_blueprint, url_prefix='/auth')
    
    from app.host import host as host_blueprint
    app.register_blueprint(host_blueprint, url_prefix='/hosts')
    
    from app.wol import wol as wol_blueprint
    app.register_blueprint(wol_blueprint, url_prefix='/wol')
    
    # Admin blueprint for user management
    from app.admin import admin as admin_blueprint
    app.register_blueprint(admin_blueprint, url_prefix='/admin')
    
    # Main route blueprint (can contain dashboard, etc.)
    from app.main import main as main_blueprint
    app.register_blueprint(main_blueprint)
    
    # Dynamic scheme detection middleware
    @app.before_request
    def detect_scheme():
        if request.headers.get('X-Forwarded-Proto') == 'https':
            request.environ['wsgi.url_scheme'] = 'https'
    
    # Implement strict transport security
    @app.after_request
    def add_security_headers(response):
        if request.is_secure:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000'
        return response
    
    
    # Add context processor for templates
    @app.context_processor
    def inject_now():
        from datetime import datetime
        return {'now': datetime.utcnow()}
    
    # Initialize production-specific settings if needed
    if not app.debug and not app.testing and config_name == 'production':
        config[config_name].init_app(app)
    
    # Ensure the database is created
    # Note: When using Flask-Migrate, you should use migrations
    # instead of creating tables directly.
    # However, keeping this for backward compatibility
    Base.metadata.create_all(bind=engine)
    return app

