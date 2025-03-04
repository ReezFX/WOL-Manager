from flask import Blueprint, render_template, redirect, url_for, flash
from flask_login import login_required, current_user
from sqlalchemy import desc

from app.models import Host, Log
from app import db_session

main = Blueprint('main', __name__)


@main.route('/')
def index():
    """Landing page for the application."""
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    return render_template('main/index.html')


@main.route('/dashboard')
@login_required
def dashboard():
    """
    Dashboard showing the user's hosts and recent Wake-on-LAN attempts.
    Admin users can see all hosts and logs.
    """
    # Get hosts based on user role
    if current_user.is_admin:
        hosts = db_session.query(Host).all()
    else:
        hosts = db_session.query(Host).filter_by(created_by=current_user.id).all()
    
    # Get recent logs
    if current_user.is_admin:
        recent_logs = db_session.query(Log).order_by(desc(Log.timestamp)).limit(10).all()
    else:
        # For regular users, only show logs for their hosts
        host_ids = [host.id for host in hosts]
        recent_logs = db_session.query(Log)\
            .filter(Log.host_id.in_(host_ids))\
            .order_by(desc(Log.timestamp))\
            .limit(10).all()
    
    # Count statistics
    host_count = len(hosts)
    successful_wakes = db_session.query(Log)\
        .filter_by(user_id=current_user.id, success=True).count()
    
    return render_template(
        'main/dashboard.html',
        hosts=hosts,
        recent_logs=recent_logs,
        host_count=host_count,
        successful_wakes=successful_wakes
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

