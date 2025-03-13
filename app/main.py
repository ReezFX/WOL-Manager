from flask import Blueprint, render_template, redirect, url_for, flash, session, request, jsonify
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from sqlalchemy import desc, or_
import os

from app.models import Host
from app import db_session
from app.ping import ping_host, PingConfig
from app.ping_cache import ping_cache

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
    # Get hosts based on user role
    # Get hosts based on user role
    if user.is_admin:
        hosts = db_session.query(Host).all()
    else:
        # Get all the role IDs of the current user
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
    return render_template('404.html'), 404


@main.errorhandler(500)
def internal_server_error(e):
    """Custom 500 page."""
    return render_template('500.html'), 500


@main.route('/api/ping_hosts', methods=['POST'])
def ping_hosts_api():
    """
    API endpoint to check the status of hosts via ICMP ping.
    
    POST: JSON with a list of host IDs
    Returns: JSON with host status results
    """
    # Check if the user is authenticated
    if not current_user.is_authenticated and not session.get('authenticated'):
        return jsonify({'error': 'Authentication required'}), 401
    
    # Parse host IDs from request
    try:
        data = request.get_json()
        if not data or not isinstance(data.get('host_ids'), list):
            return jsonify({'error': 'Invalid request format. Expected {"host_ids": [...]}'}), 400
        
        host_ids = data['host_ids']
        if not host_ids:
            return jsonify({'error': 'No host IDs provided'}), 400
    except Exception as e:
        return jsonify({'error': f'Invalid request format: {str(e)}'}), 400
    
    # Get the current user (either from Flask-Login or custom session)
    if not current_user.is_authenticated and session.get('authenticated'):
        # Use the user ID from session
        user_id = session.get('user_id')
        is_admin = session.get('is_admin', False)
    else:
        # Use Flask-Login's current_user
        user_id = current_user.id
        is_admin = current_user.is_admin
    
    # Fetch hosts from database
    try:
        if is_admin:
            # Admin can check any host
            hosts = db_session.query(Host).filter(Host.id.in_(host_ids)).all()
        else:
            # Regular users can only check hosts they have access to
            from sqlalchemy.sql import text
            
            # Get the user's roles
            if hasattr(current_user, 'roles'):
                user_role_ids = [role.id for role in current_user.roles]
            else:
                # Custom session authentication might not have roles
                user_role_ids = []
            
            # Get hosts created by the user first
            hosts_by_creator = db_session.query(Host).filter(
                Host.id.in_(host_ids),
                Host.created_by == user_id
            ).all()
            
            # Get IDs of hosts already found by creator
            found_host_ids = [host.id for host in hosts_by_creator]
            
            # Find remaining hosts where user has access via roles
            remaining_host_ids = [hid for hid in host_ids if hid not in found_host_ids]
            hosts_by_role = []
            
            if remaining_host_ids and user_role_ids:
                # For the remaining hosts, check role-based access
                for host_id in remaining_host_ids:
                    host = db_session.query(Host).filter_by(id=host_id).first()
                    if host and host.visible_to_roles:
                        # Convert host role IDs to strings for comparison
                        host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
                        # Check if any user role matches host roles
                        for role_id in user_role_ids:
                            if str(role_id) in host_role_ids:
                                hosts_by_role.append(host)
                                break
            
            # Combine hosts from both queries
            hosts = hosts_by_creator + hosts_by_role
        
        if not hosts:
            return jsonify({'error': 'No accessible hosts found with the provided IDs'}), 404
            
    except Exception as e:
        return jsonify({'error': f'Database error: {str(e)}'}), 500
    
    # Configure ping settings - improved for reliability
    ping_config = PingConfig(timeout=1.5, retries=2, interval=0.5, max_socket_errors=3)
    
    # Perform ping checks
    results = {}
    for host in hosts:
        # Use IP if available, otherwise try to use hostname/MAC
        target = host.ip if host.ip else host.name
        
        try:
            # Check cache first
            # Ensure host ID is consistently a string - log exactly what format we're using
            host_id_str = str(host.id).strip()
            
            cache_entry = ping_cache.get(host_id_str)
            
            if cache_entry:
                # Use cached result
                results[host.id] = {
                    'id': host.id,
                    'name': host.name,
                    'ip': host.ip,
                    'mac_address': host.mac_address,
                    'is_online': cache_entry['is_online'],
                    'response_time': cache_entry['response_time'],
                    'error': cache_entry['error'],
                    'cached': True
                }
                # Log that we're using a cached result
                # Using a cached result
            else:
                # No cache hit, perform the ping
                ping_result = ping_host(target, ping_config)
                
                # Update the cache with the new result
                # Ensure consistent string form of host ID
                host_id_str = str(host.id).strip()
                
                ping_cache.update(
                    host_id_str,
                    ping_result.is_alive,
                    ping_result.response_time,
                    ping_result.error
                )
                
                # Format the result
                results[host.id] = {
                    'id': host.id,
                    'name': host.name,
                    'ip': host.ip,
                    'mac_address': host.mac_address,
                    'is_online': ping_result.is_alive,
                    'response_time': ping_result.response_time,
                    'error': ping_result.error,
                    'cached': False
                }
        except Exception as e:
            results[host.id] = {
                'id': host.id,
                'name': host.name,
                'ip': host.ip,
                'mac_address': host.mac_address,
                'is_online': False,
                'response_time': None,
                'error': str(e)
            }
    
    return jsonify({'hosts': results})


