from datetime import datetime, timedelta
from functools import wraps
from flask import session, redirect, url_for, request, current_app
import time

# Constants for session management
SESSION_TIMEOUT_KEY = 'last_activity'
IDLE_TIMEOUT = 30  # Minutes of inactivity before session expiration


def init_session_management(app):
    """
    Initialize session management by registering the before_request handler
    """
    @app.before_request
    def check_session_timeout():
        """
        Check if the user's session has timed out due to inactivity.
        Update the last activity timestamp for active sessions.
        """
        # Skip for static files and login-related routes
        if (request.endpoint and 
            (request.endpoint.startswith('static') or 
             request.path == url_for('auth.login') or
             request.path == url_for('auth.logout'))):
            return

        # Check if user is authenticated
        if 'user_id' in session:
            # Check if last_activity exists
            if SESSION_TIMEOUT_KEY not in session:
                # Initialize the last activity time
                session[SESSION_TIMEOUT_KEY] = time.time()
                return
            
            # Calculate idle time
            last_activity = session[SESSION_TIMEOUT_KEY]
            idle_time = time.time() - last_activity
            max_idle_time = IDLE_TIMEOUT * 60  # Convert minutes to seconds
            
            # If idle time exceeds the maximum, logout the user
            if idle_time > max_idle_time:
                # Clear the session
                session.clear()
                # Redirect to login page with timeout message
                return redirect(url_for('auth.login', timeout=True))
            
            # Update last activity time for sliding expiration
            session[SESSION_TIMEOUT_KEY] = time.time()


def require_active_session(f):
    """
    Decorator to ensure an active session before accessing a route
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # If no user_id in session or no last activity, redirect to login
        if 'user_id' not in session or SESSION_TIMEOUT_KEY not in session:
            return redirect(url_for('auth.login'))
        
        # Check if session has expired
        last_activity = session[SESSION_TIMEOUT_KEY]
        idle_time = time.time() - last_activity
        max_idle_time = IDLE_TIMEOUT * 60  # Convert minutes to seconds
        
        if idle_time > max_idle_time:
            session.clear()
            return redirect(url_for('auth.login', timeout=True))
        
        # Update the last activity timestamp
        session[SESSION_TIMEOUT_KEY] = time.time()
        
        return f(*args, **kwargs)
    
    return decorated_function


def get_remaining_session_time():
    """
    Get the remaining time for the current session in seconds
    Returns None if no active session
    """
    if 'user_id' not in session or SESSION_TIMEOUT_KEY not in session:
        return None
    
    last_activity = session[SESSION_TIMEOUT_KEY]
    idle_time = time.time() - last_activity
    max_idle_time = IDLE_TIMEOUT * 60  # Convert minutes to seconds
    
    remaining_time = max_idle_time - idle_time
    return max(0, remaining_time)


def extend_session():
    """
    Manually extend the current session by updating the last activity timestamp
    """
    if 'user_id' in session:
        session[SESSION_TIMEOUT_KEY] = time.time()
        return True
    return False

