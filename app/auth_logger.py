from flask import request, current_app, g
from datetime import datetime
from app.models import AuthLog, db

# Enum-like constants for auth event types
EVENT_LOGIN = "LOGIN"
EVENT_LOGOUT = "LOGOUT" 
EVENT_PASSWORD_CHANGE = "PASSWORD_CHANGE"
EVENT_PASSWORD_RESET = "PASSWORD_RESET"
EVENT_ACCOUNT_LOCKOUT = "ACCOUNT_LOCKOUT"


def log_auth_event(event_type, user=None, success=True, details=None):
    """
    Generic function for logging authentication events.
    
    Args:
        event_type: Type of authentication event (login, logout, etc.)
        user: User model instance or None for anonymous attempts
        success: Whether the authentication action succeeded
        details: Optional JSON-serializable dict with additional information
    """
    try:
        # Get IP address and user agent from request
        ip_address = request.remote_addr
        user_agent = request.headers.get('User-Agent', 'Unknown')
        
        # Determine user_id based on user type
        user_id = None
        if user is not None:
            if hasattr(user, 'id'):
                user_id = user.id
            elif isinstance(user, (int, str)) and str(user).isdigit():
                # If user is passed as ID string or integer
                user_id = int(user)
        
        # Create the auth log entry
        auth_log = AuthLog(
            timestamp=datetime.utcnow(),
            user_id=user_id,
            event_type=event_type,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            details=details or {}
        )
        
        # Add and commit to database
        try:
            # First try with db.session approach (Flask-SQLAlchemy style)
            db.session.add(auth_log)
            db.session.commit()
        except AttributeError:
            # If that fails, try with direct db approach (SQLAlchemy Core style)
            from app.models import db_session
            db_session.add(auth_log)
            db_session.commit()
        
        # Log to application logger as well
        username = 'Anonymous'
        if user is not None:
            if hasattr(user, 'username'):
                username = user.username
            elif isinstance(user, str) and not str(user).isdigit():
                # If user is passed as username string
                username = user
            else:
                username = f"ID:{user_id}"
        
        log_message = f"Auth event: {event_type}, User: {username}, Success: {success}"
        if success:
            current_app.logger.info(log_message)
        else:
            current_app.logger.warning(log_message)
            
    except Exception as e:
        current_app.logger.error(f"Failed to log auth event: {str(e)}")
        # Don't re-raise the exception - auth logging should not break the main flow


def log_login_attempt(user=None, success=False, failure_reason=None, attempted_username=None, notes=None):
    """
    Log a login attempt (successful or failed).
    
    Args:
        user: User model instance or None for unknown user attempts
        success: Whether the login succeeded
        failure_reason: Reason for login failure (if applicable)
        attempted_username: The username that was attempted during login (useful when user doesn't exist)
        notes: Additional context or notes to include in the log entry
    """
    details = {}
    
    if not success and failure_reason:
        details['failure_reason'] = failure_reason
    
    # Include attempted username in details when user doesn't exist
    if not user and attempted_username:
        details['attempted_username'] = attempted_username
        
    # Include any additional notes if provided
    if notes:
        details['notes'] = notes
    
    log_auth_event(
        event_type=EVENT_LOGIN,
        user=user,
        success=success,
        details=details
    )


def log_logout(user=None):
    """
    Log a user logout event.
    
    Args:
        user: User model instance, user ID, or username that logged out
              If None, logs as anonymous logout
    """
    log_auth_event(
        event_type=EVENT_LOGOUT,
        user=user,
        success=True
    )


def log_password_change(user, is_reset=False, admin_user=None):
    """
    Log a password change or reset event.
    
    Args:
        user: User model instance, user ID, or username whose password was changed
        is_reset: Whether this was a password reset (vs. change)
        admin_user: Admin user who performed the action (if applicable)
    """
    event_type = EVENT_PASSWORD_RESET if is_reset else EVENT_PASSWORD_CHANGE
    
    details = {
        'is_reset': is_reset
    }
    
    # If an admin performed this action, record that
    if admin_user:
        if hasattr(admin_user, 'id') and hasattr(admin_user, 'username'):
            details['admin_id'] = admin_user.id
            details['admin_username'] = admin_user.username
        elif isinstance(admin_user, str):
            # If admin_user is a string, assume it's a username
            details['admin_username'] = admin_user
    
    log_auth_event(
        event_type=event_type,
        user=user,
        success=True,
        details=details
    )


def log_account_lockout(user=None, attempt_count=None):
    """
    Log an account lockout event after too many failed login attempts.
    
    Args:
        user: User model instance, user ID, or username that was locked out
              If None, logs as anonymous lockout attempt
        attempt_count: Number of failed attempts that triggered the lockout
    """
    details = {}
    if attempt_count:
        details['attempt_count'] = attempt_count
    
    log_auth_event(
        event_type=EVENT_ACCOUNT_LOCKOUT,
        user=user,
        success=True,  # The lockout itself succeeded (it's not a failure)
        details=details
    )

