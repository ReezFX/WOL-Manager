import os
import secrets
from datetime import timedelta

class Config:
    # Base directory of the application
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        f'sqlite:///{os.path.join(BASE_DIR, "..", "wol.db")}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(16)
    CSRF_ENABLED = True
    WTF_CSRF_SECRET_KEY = os.environ.get('WTF_CSRF_SECRET_KEY') or secrets.token_hex(16)
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(hours=1)
    
    # Wake-on-LAN specific settings
    WOL_PORT = 9  # Standard WoL port
    WOL_BROADCAST_PORT = 9  # Port for broadcasting magic packets
    WOL_TIMEOUT = 5  # Timeout for WoL operations in seconds
    
    # Rate limiting
    MAX_WOL_REQUESTS_PER_HOUR = 20
    
    # Pagination
    HOSTS_PER_PAGE = 10
    LOGS_PER_PAGE = 25
    
    # Debug mode - should be False in production
    DEBUG = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    
    @classmethod
    def init_app(cls, app):
        """Initialize Flask application with configuration settings.
        
        This method is called by the create_app function to apply configuration-specific
        settings to the Flask application instance.
        
        Args:
            app: Flask application instance
        """
        # Apply configuration settings to the Flask app
        for key, value in cls.__dict__.items():
            if not key.startswith('__') and not callable(value):
                app.config[key] = value

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_ECHO = True  # Log SQL queries
    
class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    
class ProductionConfig(Config):
    # Production specific configurations
    DEBUG = False
    
    # Database configuration for production
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{os.path.join(Config.BASE_DIR, "instance", "wol.db")}'
    
    # Database connection pooling settings
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,  # Maximum number of database connections in the pool
        'pool_timeout': 30,  # Timeout in seconds for getting a connection from the pool
        'pool_recycle': 1800,  # Recycle connections after 30 minutes
        'max_overflow': 5,  # Maximum number of connections to overflow from the pool
    }
    
    # In production, ensure secret keys are set via environment variables
    @classmethod
    def init_app(cls, app):
        # Call parent init_app method
        super().init_app(app)
        
        # Force debug mode to be False in production regardless of environment variable
        app.config['DEBUG'] = False
        
        # Log to syslog if in production
        import logging
        from logging.handlers import SysLogHandler
        syslog_handler = SysLogHandler()
        syslog_handler.setLevel(logging.WARNING)
        app.logger.addHandler(syslog_handler)

# Choose configuration based on environment
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


