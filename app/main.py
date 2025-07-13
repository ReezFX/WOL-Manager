from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from sqlalchemy import desc, or_
import os

from app.models import Host
from app import db_session
from app.logging_config import get_logger

# Initialize module logger
logger = get_logger('app.main')
access_logger = get_logger('app.access')

class CSRFForm(FlaskForm):
    """Form with CSRF protection only"""
    pass

main = Blueprint('main', __name__)


@main.route('/')
def index():
    """Landing page for the application."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('main/index.html')


@main.route('/dashboard')
def dashboard():
    """
    Dashboard showing the user's hosts and recent Wake-on-LAN attempts.
    Admin users can see all hosts and logs.
    Support both Flask-Login and custom session authentication.
    """
    # Check if the user is authenticated (either via Flask-Login or custom session)
    if not current_user.is_authenticated and not session.get('authenticated'):
        access_logger.warning('Unauthorized access attempt to dashboard')
        flash('Please log in to access this page.', 'warning')
        return redirect(url_for('auth.login', next='/dashboard'))
    
    # Create a User-like object if using custom session authentication
    if not current_user.is_authenticated and session.get('authenticated'):
        from app.models import User
        
        class CustomSessionUser:
            def __init__(self, user_id, username, is_admin):
                self.id = user_id
                self.username = username
                self.is_admin = is_admin
                self.is_authenticated = True
                self.roles = []  # Default empty roles
            
            def has_permission(self, permission):
                # Simple permission check for custom session users
                if self.is_admin:
                    return True
                if permission == 'send_wol':  # Allow basic permissions
                    return True
                return False
        
        # Create the custom user object from session data
        session_user = CustomSessionUser(
            session.get('user_id'),
            session.get('username'),
            session.get('is_admin', False)
        )
        
        # Use the custom user for the view
        user = session_user
    else:
        # Use Flask-Login's current_user
        user = current_user
    
    access_logger.info(f'Dashboard accessed by user: {user.username} (id: {user.id})')
    # Get hosts based on user role
    if user.is_admin:
        hosts = db_session.query(Host).all()
    else:
        # Get all the role IDs of the current user
        user_role_ids = [role.id for role in user.roles]
        user_role_ids_str = [str(role_id) for role_id in user_role_ids]
        # Start with hosts created by the current user
        created_by_filter = (Host.created_by == user.id)
        
        # Find hosts where user's role exists in visible_to_roles
        visible_to_user_hosts = []
        
        try:
            # Get all hosts to check visible_to_roles
            all_hosts = db_session.query(Host).all()
            
            # Find hosts where user's role exists in visible_to_roles
            for host in all_hosts:
                if host.visible_to_roles:
                    # Convert all role IDs to strings for consistent comparison
                    host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
                    
                    # Check if any of the user's role IDs are in the host's visible_to_roles
                    for role_id in user_role_ids:
                        role_id_str = str(role_id)
                        if role_id_str in host_role_ids:
                            visible_to_user_hosts.append(host.id)
                            break
            
            # Query hosts created by user OR visible to user based on roles
            if visible_to_user_hosts:
                hosts = db_session.query(Host).filter(
                    or_(
                        created_by_filter,
                        Host.id.in_(visible_to_user_hosts)
                    )
                ).all()
            else:
                # If no visible hosts found, just filter by created_by
                hosts = db_session.query(Host).filter(created_by_filter).all()
        except Exception as e:
            # Fallback to just showing hosts created by the user
            hosts = db_session.query(Host).filter(created_by_filter).all()
            error_msg = f"Error in host retrieval for dashboard: {str(e)}"
            logger.error(error_msg)
            flash(f"Limited dashboard visibility due to an error: {str(e)}", "warning")
    
    # Logs functionality has been removed
    recent_logs = []
    
    # Count statistics
    host_count = len(hosts)
    # Logging functionality has been removed
    successful_wakes = 0
    
    # Create CSRF form
    csrf_form = CSRFForm()
    
    return render_template(
        'main/dashboard.html',
        hosts=hosts,
        recent_logs=recent_logs,  # Empty list as logging functionality has been removed
        host_count=host_count,
        successful_wakes=successful_wakes,
        csrf_form=csrf_form,
        current_user=user  # Pass the user (either Flask-Login or custom) to the template
    )


@main.route('/profile')
@login_required
def profile():
    """User profile page."""
    return render_template('profile.html')


@main.errorhandler(404)
def page_not_found(e):
    """Custom 404 page."""
    logger.warning(f'404 error: {request.path} - Referrer: {request.referrer}')
    return render_template('404.html'), 404


@main.errorhandler(500)
def internal_server_error(e):
    """Custom 500 page."""
    logger.error(f'500 error: {str(e)} - URL: {request.path}')
    return render_template('500.html'), 500


from functools import wraps
from time import time


