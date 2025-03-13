import os
import secrets
from datetime import timedelta

class Config:
    # Base directory of the application
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:////app/instance/wol.db'  # Changed path for Docker
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(16)
    CSRF_ENABLED = True
    WTF_CSRF_SECRET_KEY = os.environ.get('WTF_CSRF_SECRET_KEY') or secrets.token_hex(24)
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour in seconds
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=1)
    
    # Wake-on-LAN specific settings
    WOL_PORT = 9  # Standard WoL port
    WOL_BROADCAST_PORT = 9  # Port for broadcasting magic packets
    WOL_TIMEOUT = 5  # Timeout for WoL operations in seconds
    
    # Rate limiting
    MAX_WOL_REQUESTS_PER_HOUR = 20
    
    # Pagination
    HOSTS_PER_PAGE = 10
    
    # Debug mode - should be False in production
    DEBUG = os.environ.get('FLASK_DEBUG', 'False') == 'True'
    
    @classmethod
    def init_app(cls, app):
        pass

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
    
    # In production, ensure secret keys are set via environment variables
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        

# Choose configuration based on environment
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

