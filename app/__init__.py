import os
import logging
import redis
from logging.handlers import RotatingFileHandler
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
    
    # Configure session security
    app.config.update(
        SESSION_COOKIE_SECURE=(not app.debug),
        SESSION_COOKIE_HTTPONLY=True,
        PERMANENT_SESSION_LIFETIME=timedelta(days=1)
    )
    
    # Configure Redis for session storage if available
    if app.config.get('REDIS_URL'):
        app.config['SESSION_TYPE'] = 'redis'
        app.config['SESSION_REDIS'] = redis.from_url(app.config['REDIS_URL'])
    else:
        app.config['SESSION_TYPE'] = 'filesystem'
        app.config['SESSION_FILE_DIR'] = os.path.join(app.instance_path, 'flask_session')
        # Ensure the directory exists
        os.makedirs(app.config['SESSION_FILE_DIR'], exist_ok=True)
    
    # Initialize Flask-Session
    Session(app)
    
    # Initialize the database engine and bind it to the session
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
    db_session.configure(bind=engine)
    
    # Set up the teardown context for the database session
    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db_session.remove()
    
    # Initialize extensions
    login_manager.init_app(app)
    
    # Initialize CSRF protection
    csrf = CSRFProtect(app)
    
    # Add CSRF error handler
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        app.logger.warning(f'CSRF error: {e} - URL: {request.url}')
        flash('Your form session expired. Please try again.', 'warning')
        return redirect(url_for('main.index'))
    
    # Set up logging
    log_level = logging.DEBUG if app.debug else logging.INFO
    app.logger.setLevel(log_level)
    
    # Create logs directory if it doesn't exist
    log_dir = pathlib.Path(app.root_path).parent / 'logs'
    log_dir.mkdir(exist_ok=True)
    
    # Configure file handler
    log_file = log_dir / 'wol_manager.log'
    file_handler = RotatingFileHandler(log_file, maxBytes=10485760, backupCount=10)
    file_handler.setLevel(log_level)
    
    # Configure log format
    log_format = logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    )
    file_handler.setFormatter(log_format)
    
    # Add handlers
    app.logger.addHandler(file_handler)
    
    # Configure console handler for development
    if app.debug:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(log_format)
        app.logger.addHandler(console_handler)
    
    # Log application startup
    app.logger.info(f'WOL Manager starting in {config_name} mode')
    
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

