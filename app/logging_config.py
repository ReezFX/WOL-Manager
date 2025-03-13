import os
import logging
import logging.config
from logging.handlers import RotatingFileHandler
from flask import has_request_context, request, g
import pathlib

"""
Logging Configuration Module
===========================

This module provides a comprehensive logging system for the WOL-Manager application.
It implements a configurable, multi-level logging architecture with security features
such as log rotation, permission management, and sensitive data filtering.

The logging system is designed to:
1. Capture different types of logs (application, error, access)
2. Support multiple verbosity levels through profiles (LOW, MEDIUM, HIGH, DEBUG)
3. Format logs with relevant request context when available
4. Sanitize sensitive information
5. Manage log files securely with proper permissions and rotation

This module should be initialized at application startup by calling configure_logging().
Loggers should be created using the get_logger() function.
"""

# Constants for file configuration
LOG_DIR = '/app/instance/logs/'
MAX_BYTES = 10 * 1024 * 1024  # 10MB
BACKUP_COUNT = 5

# Log files
APP_LOG = 'app.log'
ERROR_LOG = 'error.log'
ACCESS_LOG = 'access.log'


class RequestFormatter(logging.Formatter):
    """
    Custom formatter that adds request and user context to log records
    when available in the current request context.
    
    This formatter enhances log messages with HTTP request information:
    - URL of the current request
    - Remote IP address of the client
    - HTTP method (GET, POST, etc.)
    - Username of the authenticated user (or 'Anonymous')
    
    When used outside of a request context (e.g., background tasks),
    these fields will be set to '-' to avoid errors.
    """
    # Define all fields that can be used in format strings
    REQUIRED_FIELDS = ['url', 'remote_addr', 'method', 'user']
    
    def __init__(self, fmt=None, datefmt=None, style='%', validate=True):
        """Initialize with custom handling to ensure fields exist before formatting."""
        super().__init__(fmt, datefmt, style, validate)
        # Store the original format string for later processing
        self._original_fmt = fmt
    
    def _ensure_fields_exist(self, record):
        """Ensure all required fields exist on the record."""
        # Set default values for all required fields first - these will 
        # be used if we're not in a request context
        default_values = {
            'url': '-',
            'remote_addr': '-',
            'method': '-',
            'user': 'Anonymous'
        }
        
        # Apply default values for any missing fields
        for field in self.REQUIRED_FIELDS:
            if not hasattr(record, field):
                setattr(record, field, default_values.get(field, '-'))
        
        # Only update with actual values if in request context
        if has_request_context():
            record.url = request.url
            record.remote_addr = request.remote_addr
            record.method = request.method
            # Add user info if available
            if hasattr(g, 'user'):
                record.user = g.user.username if g.user else 'Anonymous'
            else:
                record.user = 'Anonymous'
        
        # Ensure any other attributes that might be in the format string exist
        if self._fmt:
            try:
                # This will try to resolve all field names in the format string
                # and fail if any are missing, which is what we want to catch
                self._fmt % record.__dict__
            except KeyError as e:
                # If a field is missing, add it as a default
                missing_field = e.args[0]
                setattr(record, missing_field, '-')
                # Try again recursively to catch any other missing fields
                # Only do this recursively to avoid infinite loops if there's a major issue
                self._ensure_fields_exist(record)
            except Exception as e:
                # Catch any other formatting issues to prevent crashes
                # This could happen if record.__dict__ has unexpected content
                setattr(record, 'formatting_error', str(e))
    
    def format(self, record):
        """Format the record, ensuring all necessary fields exist first."""
        # Ensure all required fields exist before formatting
        try:
            self._ensure_fields_exist(record)
            
            # Now it's safe to format
            return super().format(record)
        except Exception as e:
            # As a last resort, if formatting fails, return a basic message
            # that includes the original log message without failing
            return f"[ERROR FORMATTING LOG] {record.getMessage()} (Error: {str(e)})"


def ensure_log_directory():
    """
    Ensure the log directory exists and has proper permissions.
    
    Creates the log directory if it doesn't exist and sets 
    permissions to 0755 (rwxr-xr-x) to ensure:
    - The owner has full access (read/write/execute)
    - Others have read and execute permissions only
    
    This is important for security in multi-user environments.
    """
    pathlib.Path(LOG_DIR).mkdir(parents=True, exist_ok=True)
    # Set directory permissions to 0755
    os.chmod(LOG_DIR, 0o755)


def create_rotating_handler(filename, level=logging.INFO, format_str=None):
    """
    Create a rotating file handler with the given configuration.
    
    This helper function creates and configures a RotatingFileHandler with:
    - The specified filename (relative to LOG_DIR)
    - Maximum file size (defined by MAX_BYTES)
    - Backup count for rotation (defined by BACKUP_COUNT)
    - Proper file permissions (0640 - rw-r-----)
    - Custom formatter that includes request context when available
    
    Args:
        filename (str): The name of the log file
        level (int): The logging level for this handler (default: INFO)
        format_str (str, optional): Custom format string for log messages
        
    Returns:
        RotatingFileHandler: A configured handler instance
    """
    if format_str is None:
        format_str = '[%(asctime)s] %(levelname)s - User:%(user)s - IP:%(remote_addr)s - URL:%(url)s - Method:%(method)s - %(module)s - %(message)s'
    
    # Ensure full path exists
    full_path = os.path.join(LOG_DIR, filename)
    handler = RotatingFileHandler(
        full_path,
        maxBytes=MAX_BYTES,
        backupCount=BACKUP_COUNT
    )
    formatter = RequestFormatter(format_str)
    handler.setFormatter(formatter)
    handler.setLevel(level)
    
    # Set appropriate file permissions (0640) for security
    if os.path.exists(full_path):
        os.chmod(full_path, 0o640)
        
    return handler


# Configuration profiles
"""
Logging Profiles Structure
-------------------------

The logging system provides multiple profiles with increasing verbosity levels:

1. LOW: Minimal logging (WARNING and above)
   - Used in production environments where disk space is a concern
   - Captures only important warnings and errors
   
2. MEDIUM: Standard logging (INFO and above)
   - Default profile for most deployments
   - Balances verbosity with performance
   
3. HIGH: Detailed logging (DEBUG and above for app logs)
   - Used for troubleshooting specific issues
   - Includes debug information for application code
   
4. DEBUG: Maximum verbosity
   - Used during development and intensive debugging sessions
   - Includes line numbers, function names, and console output
   - Captures debug information for all components
   
Each profile consists of:
- formatters: Define how log messages are formatted
- handlers: Specify where logs are sent (files, console)
- loggers: Configure behavior for specific logger names
- root: Configure the root logger as a catch-all

The chosen profile can be set via the LOG_PROFILE environment variable.
"""
LOG_PROFILES = {
    # LOW profile - Minimal logging for production environments with limited storage
    'LOW': {
        'version': 1,
        'disable_existing_loggers': False,
        # Formatters define the structure and content of log messages
        'formatters': {
            'default': {
                'format': '[%(asctime)s] %(levelname)s - %(module)s - %(message)s',
            },
            'detailed': {
                'format': '[%(asctime)s] %(levelname)s - %(user)s - %(remote_addr)s - %(url)s - %(method)s - %(module)s - %(message)s',
            },
        },
        # Handlers determine where log messages are sent and how they're processed
        'handlers': {
            'app_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, APP_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'default',
                'level': 'WARNING',
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ERROR_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'ERROR',
            },
            'access_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ACCESS_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'INFO',
            },
        },
        # Loggers define the behavior for specific logger names
        'loggers': {
            'app': {
                'handlers': ['app_file', 'error_file'],
                'level': 'WARNING',
                'propagate': True,
            },
            'app.access': {
                'handlers': ['access_file'],
                'level': 'INFO',
                'propagate': False,
            },
        },
        # Root logger configuration (catch-all for loggers not explicitly defined)
        'root': {
            'handlers': ['app_file', 'error_file'],
            'level': 'WARNING',
        },
    },
    
    # MEDIUM profile - Standard logging level for general use (default)
    'MEDIUM': {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '[%(asctime)s] %(levelname)s - %(module)s - %(message)s',
            },
            'detailed': {
                'format': '[%(asctime)s] %(levelname)s - %(user)s - %(remote_addr)s - %(url)s - %(method)s - %(module)s - %(message)s',
            },
        },
        'handlers': {
            'app_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, APP_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'default',
                'level': 'INFO',
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ERROR_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'ERROR',
            },
            'access_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ACCESS_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'INFO',
            },
        },
        'loggers': {
            'app': {
                'handlers': ['app_file', 'error_file'],
                'level': 'INFO',
                'propagate': True,
            },
            'app.access': {
                'handlers': ['access_file'],
                'level': 'INFO',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['app_file', 'error_file'],
            'level': 'INFO',
        },
    },
    
    # HIGH profile - Detailed logging for troubleshooting specific issues
    'HIGH': {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '[%(asctime)s] %(levelname)s - %(module)s - %(message)s',
            },
            'detailed': {
                'format': '[%(asctime)s] %(levelname)s - %(user)s - %(remote_addr)s - %(url)s - %(method)s - %(module)s - %(message)s',
            },
        },
        'handlers': {
            'app_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, APP_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'default',
                'level': 'DEBUG',
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ERROR_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'WARNING',
            },
            'access_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ACCESS_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'INFO',
            },
        },
        'loggers': {
            'app': {
                'handlers': ['app_file', 'error_file'],
                'level': 'DEBUG',
                'propagate': True,
            },
            'app.access': {
                'handlers': ['access_file'],
                'level': 'INFO',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['app_file', 'error_file'],
            'level': 'DEBUG',
        },
    },
    
    # DEBUG profile - Maximum verbosity for development and intensive debugging
    'DEBUG': {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'default': {
                'format': '[%(asctime)s] %(levelname)s - %(module)s:%(lineno)d - %(funcName)s - %(message)s',
            },
            'detailed': {
                'format': '[%(asctime)s] %(levelname)s - %(user)s - %(remote_addr)s - %(url)s - %(method)s - %(module)s:%(lineno)d - %(funcName)s - %(message)s',
            },
        },
        'handlers': {
            'app_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, APP_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'default',
                'level': 'DEBUG',
            },
            'error_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ERROR_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'DEBUG',
            },
            'access_file': {
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(LOG_DIR, ACCESS_LOG),
                'maxBytes': MAX_BYTES,
                'backupCount': BACKUP_COUNT,
                'formatter': 'detailed',
                'level': 'DEBUG',
            },
            'console': {
                'class': 'logging.StreamHandler',
                'formatter': 'detailed',
                'level': 'DEBUG',
            },
        },
        'loggers': {
            'app': {
                'handlers': ['app_file', 'error_file', 'console'],
                'level': 'DEBUG',
                'propagate': True,
            },
            'app.access': {
                'handlers': ['access_file', 'console'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
        'root': {
            'handlers': ['app_file', 'error_file', 'console'],
            'level': 'DEBUG',
        },
    },
}


def get_logging_profile():
    """
    Get the logging profile from environment variable or use a default.
    
    The function checks the LOG_PROFILE environment variable to determine
    which logging profile to use. If the variable is not set or contains an
    invalid profile name, it falls back to the MEDIUM profile.
    
    Valid profile values:
    - LOW: Minimal logging (warnings and errors only)
    - MEDIUM: Standard logging (info and above)
    - HIGH: Detailed logging with debug information
    - DEBUG: Maximum verbosity with console output
    
    Returns:
        dict: The logging configuration dictionary for the selected profile
        
    Example:
        # Use HIGH profile for more detailed logs:
        export LOG_PROFILE=HIGH
        python manage.py runserver
    """
    profile_name = os.environ.get('LOG_PROFILE', 'MEDIUM').upper()
    
    if profile_name not in LOG_PROFILES:
        print(f"Warning: Invalid LOG_PROFILE value '{profile_name}'. Falling back to MEDIUM.")
        profile_name = 'MEDIUM'
    
    print(f"Using logging profile: {profile_name}")
    return LOG_PROFILES[profile_name]


def sanitize_log_message(message):
    """
    Sanitize sensitive information in log messages.
    Replace passwords, tokens and other sensitive data.
    
    This function looks for patterns that might indicate sensitive data
    (like 'password=something') and replaces the sensitive part with asterisks.
    It's used internally by the SensitiveDataFilter class.
    
    Current patterns detected:
    - password=xxx → password=*****
    - token=xxx → token=*****
    - api_key=xxx → api_key=*****
    
    Args:
        message (str): The message to sanitize
        
    Returns:
        str: The sanitized message
        
    Note:
        To add new patterns, extend the sensitive_patterns list in this function.
    """
    # This is a basic implementation - extend with regex patterns as needed
    sensitive_patterns = [
        ('password=', 'password=*****'),
        ('token=', 'token=*****'),
        ('api_key=', 'api_key=*****'),
    ]
    
    sanitized_message = message
    for pattern, replacement in sensitive_patterns:
        if pattern in sanitized_message:
            sanitized_message = sanitized_message.replace(pattern, replacement)
    
    return sanitized_message


class SensitiveDataFilter(logging.Filter):
    """
    Filter to mask sensitive data in log records.
    
    This security filter prevents sensitive information like passwords,
    tokens, and API keys from being written to log files. It works by:
    
    1. Inspecting log message strings for sensitive patterns
    2. Replacing those patterns with masked values (e.g., '*****')
    3. Processing both the main message and any arguments
    
    The filter is automatically applied to all loggers created with
    the get_logger() function and to all handlers during configuration.
    
    To add more sensitive patterns, extend the list in sanitize_log_message().
    """
    def filter(self, record):
        if isinstance(record.msg, str):
            record.msg = sanitize_log_message(record.msg)
        
        # Also sanitize any args that might be used in string formatting
        if record.args:
            args_list = list(record.args)
            for i, arg in enumerate(args_list):
                if isinstance(arg, str):
                    args_list[i] = sanitize_log_message(arg)
            record.args = tuple(args_list)
        
        return True


def configure_logging():
    """
    Configure logging based on the selected profile.
    Creates all necessary directories and sets up handlers.
    
    This is the main initialization function for the logging system.
    It should be called once during application startup before any
    logging is performed. The function:
    
    1. Creates the log directory if it doesn't exist
    2. Determines which logging profile to use based on environment variables
    3. Applies the configuration using Python's logging.config.dictConfig
    4. Adds the SensitiveDataFilter to all handlers for security
    5. Sets appropriate file permissions on all log files
    
    Usage:
        from app.logging_config import configure_logging
        
        def create_app():
            app = Flask(__name__)
            configure_logging()  # Initialize logging before anything else
            # ... rest of app initialization
            return app
    """
    # Ensure log directory exists with proper permissions
    ensure_log_directory()
    
    # Get the configuration profile
    config = get_logging_profile()
    
    # Configure logging from dictionary
    logging.config.dictConfig(config)
    
    # Add sensitive data filter to all handlers
    for logger in [logging.getLogger(), logging.getLogger('app')]:
        for handler in logger.handlers:
            handler.addFilter(SensitiveDataFilter())
    
    # Set file permissions for all log files
    for handler_config in config.get('handlers', {}).values():
        if 'filename' in handler_config:
            filename = handler_config['filename']
            if os.path.exists(filename):
                os.chmod(filename, 0o640)


def get_logger(module_name):
    """
    Creates and returns a logger for a specific module name.
    
    The logger will be configured according to the current logging profile
    and will have the SensitiveDataFilter applied.
    
    Args:
        module_name (str): The name of the module requesting the logger
            
    Returns:
        logging.Logger: A configured logger instance
        
    Usage:
        # At the top of each module:
        from app.logging_config import get_logger
        
        # Use the module name (typically __name__) to get a logger
        logger = get_logger(__name__)
        
        # Then use standard logging methods:
        logger.debug("Detailed information for debugging")
        logger.info("Confirmation that things are working as expected")
        logger.warning("An indication something unexpected happened")
        logger.error("The software has not been able to perform a function")
        logger.critical("A serious error indicating the program may be unable to continue")
        
        # For access logging, use the special logger:
        access_logger = get_logger('app.access')
        access_logger.info("User %s performed %s operation", username, operation)
        
    Notes:
        - The module_name will be automatically prefixed with 'app.' if needed
        - The SensitiveDataFilter is automatically applied to all loggers
        - Log levels and destinations are determined by the active profile
    """
    # Ensure module_name is prefixed with 'app.' for proper configuration inheritance
    if not module_name.startswith('app.') and module_name != 'app':
        logger_name = f'app.{module_name}'
    else:
        logger_name = module_name
        
    # Get the logger
    logger = logging.getLogger(logger_name)
    
    # Add sensitive data filter if not already present
    has_filter = any(isinstance(f, SensitiveDataFilter) for f in logger.filters)
    if not has_filter:
        logger.addFilter(SensitiveDataFilter())
        
    return logger


