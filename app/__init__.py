import os
import redis
import threading
from redis import ConnectionPool

# Initialize Redis connection pool
redis_pool = ConnectionPool(
    host='localhost',
    port=6379,
    db=0,
    decode_responses=True,
    max_connections=20  # Adjust based on your needs
)

# Create Redis client using the pool
redis_client = redis.Redis(connection_pool=redis_pool)
import pathlib
import logging
import logging.config
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
from app.logging_config import configure_logging, LOG_DIR

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
    
    # Ensure the logging directory exists
    logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'logs')
    os.makedirs(logs_dir, mode=0o755, exist_ok=True)
    
    # Configure logging before app creation
    configure_logging()
    
    # For non-request logging during startup
    simple_formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(module)s - %(message)s')
    for handler in logging.getLogger().handlers:
        handler.setFormatter(simple_formatter)
    
    # Create and configure the app
    app = Flask(__name__)
    app.config.from_object(config[config_name])
    
    # Add LOG_DIR to app config for access in admin.py
    app.config['LOG_DIR'] = LOG_DIR
    
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
    logging.info(f"Session config: TYPE={app.config['SESSION_TYPE']}, DOMAIN={app.config['SESSION_COOKIE_DOMAIN']}, PATH={app.config['SESSION_COOKIE_PATH']}")
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
    
    # Public access blueprint
    from app.blueprints.public import bp as public_blueprint
    app.register_blueprint(public_blueprint, url_prefix='/public')
    
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
    
    # Add context processor for version information and update status
    @app.context_processor
    def inject_version_info():
        """Inject version information and update status into all templates."""
        try:
            from app.models import AppSettings
            import os
            
            # Get settings from database
            settings = AppSettings.get_settings(db_session)
            
            # If we don't have stored version info, read local version from file
            local_version = settings.local_version
            if not local_version:
                version_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'VERSION')
                if os.path.exists(version_file):
                    with open(version_file, 'r', encoding='utf-8') as f:
                        local_version = f.read().strip()
                        # Update the database with local version if it wasn't stored
                        if local_version and local_version != 'unknown':
                            settings.local_version = local_version
                            db_session.commit()
                else:
                    local_version = 'unknown'
            
            return {
                'app_version': local_version or 'unknown',
                'update_available': settings.update_available or False,
                'latest_version': settings.remote_version,
                'github_repo': 'ReezFX/WOL-Manager'
            }
        except Exception as e:
            logger.error(f"Error getting version info: {str(e)}")
            # Fallback to reading VERSION file directly
            try:
                import os
                local_version = 'unknown'
                version_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'VERSION')
                if os.path.exists(version_file):
                    with open(version_file, 'r', encoding='utf-8') as f:
                        local_version = f.read().strip()
                
                return {
                    'app_version': local_version,
                    'update_available': False,
                    'latest_version': None,
                    'github_repo': 'ReezFX/WOL-Manager'
                }
            except Exception:
                return {
                    'app_version': 'unknown',
                    'update_available': False,
                    'latest_version': None,
                    'github_repo': 'ReezFX/WOL-Manager'
                }
    
    # Add context processor for toast system
    @app.context_processor
    def inject_toast_flash():
        """Override Flask's flash with toast functionality.
        
        This adds a toast_flash function to templates only.
        Note: This function is NOT available in Python code,
        so route handlers should continue to use the regular flash().
        Our JavaScript will automatically convert flash messages to toasts.
        """
        def toast_flash(message, category="info", use_toast=True):
            """Enhanced flash function that supports toast notifications."""
            # Always set a flash message for server-side handling
            flash(message, category)
            # Pass additional data to indicate this should be a toast
            if use_toast:
                session['_toast_message'] = message
                session['_toast_category'] = category
        
        return {'toast_flash': toast_flash}
    
    # Initialize production-specific settings if needed
    if not app.debug and not app.testing and config_name == 'production':
        config[config_name].init_app(app)
    
    # Ensure the database is created
    # Note: When using Flask-Migrate, you should use migrations
    # instead of creating tables directly.
    # However, keeping this for backward compatibility
    Base.metadata.create_all(bind=engine)
    
    # Initialize logger for app init
    from app.logging_config import get_logger
    logger = get_logger('app.init')
    
    # Start ping service in a background thread
    try:
        from app.async_ping_service import start_ping_service
        ping_thread = threading.Thread(target=start_ping_service, daemon=True)
        ping_thread.start()
        logger.info("Ping service started successfully")
    except Exception as e:
        logger.error(f"Failed to start ping service: {str(e)}")

    # Update ping_service.py to use connection pool
    from app.ping_service import update_redis_pool
    update_redis_pool(redis_pool)
    
    # Initialize update checker service
    try:
        from app.update_checker import init_update_checker
        update_checker = init_update_checker()
        # Perform initial check in background
        threading.Thread(target=lambda: update_checker.check_for_updates(), daemon=True).start()
        logger.info("Update checker service started successfully")
    except Exception as e:
        logger.error(f"Failed to start update checker service: {str(e)}")
    
    return app

