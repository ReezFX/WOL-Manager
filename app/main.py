from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from sqlalchemy import desc, or_, func, and_
from datetime import datetime, timedelta
import os

from app.models import Host, WolLog
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


# Statistics API Routes
@main.route('/api/device_status')
def api_device_status():
    """API endpoint for device status statistics (pie chart data)."""
    if not current_user.is_authenticated and not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get user context
        if current_user.is_authenticated:
            user = current_user
        else:
            # Create simple user object for session-based auth
            class SimpleUser:
                def __init__(self):
                    self.id = session.get('user_id')
                    self.is_admin = session.get('is_admin', False)
                    self.roles = []
            user = SimpleUser()
        
        # Get hosts accessible to the user
        if user.is_admin:
            hosts = db_session.query(Host).all()
        else:
            hosts = db_session.query(Host).filter(Host.created_by == user.id).all()
        
        # Count hosts by status using the ping service
        online_count = 0
        offline_count = 0
        unknown_count = 0
        
        # Get real status from ping service
        try:
            from app.ping_service import get_host_status
            
            for host in hosts:
                try:
                    # Get status from the ping service
                    status_data = get_host_status(host.id)
                    status = status_data.get('status', 'unknown')
                    
                    if status == 'online':
                        online_count += 1
                    elif status == 'offline':
                        offline_count += 1
                    else:
                        unknown_count += 1
                        
                except Exception as e:
                    logger.warning(f'Failed to get status for host {host.id}: {str(e)}')
                    unknown_count += 1
                    
        except ImportError:
            logger.warning('Ping service not available, using fallback status distribution')
            # Fallback: distribute hosts evenly across statuses
            total_hosts = len(hosts)
            online_count = total_hosts // 3
            offline_count = total_hosts // 3
            unknown_count = total_hosts - online_count - offline_count
        
        return jsonify({
            'labels': ['Online', 'Offline', 'Unknown'],
            'data': [online_count, offline_count, unknown_count]
        })
    
    except Exception as e:
        logger.error(f'Error fetching device status: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500


@main.route('/api/wol_success_rate')
def api_wol_success_rate():
    """API endpoint for WoL success rate over time (line chart data)."""
    if not current_user.is_authenticated and not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        days = request.args.get('days', default=7, type=int)
        
        # Get user context
        if current_user.is_authenticated:
            user = current_user
        else:
            class SimpleUser:
                def __init__(self):
                    self.id = session.get('user_id')
                    self.is_admin = session.get('is_admin', False)
                    self.roles = []
            user = SimpleUser()
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Query WoL logs based on user permissions
        if user.is_admin:
            # Admin can see all logs
            logs_query = db_session.query(WolLog).filter(
                WolLog.timestamp >= start_date,
                WolLog.timestamp <= end_date
            )
        else:
            # Regular users see only their own logs
            logs_query = db_session.query(WolLog).filter(
                WolLog.user_id == user.id,
                WolLog.timestamp >= start_date,
                WolLog.timestamp <= end_date
            )
        
        # Group by day and calculate success rate
        daily_stats = {}
        for i in range(days):
            day = start_date + timedelta(days=i)
            day_str = day.strftime('%Y-%m-%d')
            daily_stats[day_str] = {'total': 0, 'success': 0}
        
        logs = logs_query.all()
        for log in logs:
            day_str = log.timestamp.strftime('%Y-%m-%d')
            if day_str in daily_stats:
                daily_stats[day_str]['total'] += 1
                if log.success:
                    daily_stats[day_str]['success'] += 1
        
        # Calculate success rates
        labels = []
        success_rates = []
        
        for i in range(days):
            day = start_date + timedelta(days=i)
            day_str = day.strftime('%Y-%m-%d')
            labels.append(day_str)
            
            total = daily_stats[day_str]['total']
            success = daily_stats[day_str]['success']
            
            if total > 0:
                success_rate = (success / total) * 100
            else:
                success_rate = 0  # No attempts = 0% success rate
            
            success_rates.append(round(success_rate, 1))
        
        return jsonify({
            'labels': labels,
            'data': success_rates
        })
    
    except Exception as e:
        logger.error(f'Error fetching WoL success rate: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500


@main.route('/api/device_usage')
def api_device_usage():
    """API endpoint for device usage frequency (bar chart data)."""
    if not current_user.is_authenticated and not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401
    
    try:
        # Get user context
        if current_user.is_authenticated:
            user = current_user
        else:
            class SimpleUser:
                def __init__(self):
                    self.id = session.get('user_id')
                    self.is_admin = session.get('is_admin', False)
                    self.roles = []
            user = SimpleUser()
        
        # Query device usage based on user permissions
        if user.is_admin:
            # Admin can see usage for all devices
            hosts = db_session.query(Host).all()
            usage_query = db_session.query(
                Host.name,
                func.count(WolLog.id).label('wake_count')
            ).outerjoin(WolLog, Host.id == WolLog.device_id).group_by(Host.id, Host.name)
        else:
            # Regular users see only their own devices
            hosts = db_session.query(Host).filter(Host.created_by == user.id).all()
            usage_query = db_session.query(
                Host.name,
                func.count(WolLog.id).label('wake_count')
            ).filter(
                Host.created_by == user.id
            ).outerjoin(WolLog, Host.id == WolLog.device_id).group_by(Host.id, Host.name)
        
        usage_data = usage_query.all()
        
        # Prepare chart data
        device_names = []
        wake_counts = []
        
        for name, count in usage_data:
            device_names.append(name)
            wake_counts.append(count if count else 0)
        
        return jsonify({
            'labels': device_names,
            'data': wake_counts
        })
    
    except Exception as e:
        logger.error(f'Error fetching device usage: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500


