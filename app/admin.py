from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, abort, send_file, send_from_directory, jsonify
import json
import html
import logging
from flask_login import login_required, current_user
from functools import wraps
import os
import re
import io
from datetime import datetime, timedelta
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash
from flask_wtf import FlaskForm
from wtforms import HiddenField, BooleanField, SubmitField, FormField, FieldList, StringField, SelectField, DateTimeField, DateField
from wtforms.form import BaseForm
from wtforms.validators import Optional, DataRequired
from werkzeug.datastructures import Headers
from app.models import User, Permission, Role, AppSettings, Host
from app import db_session
from app.forms import UserForm, AppSettingsForm
from app.auth import hash_password, admin_required
from sqlalchemy import desc
from app.logging_config import get_logger

# Initialize module logger
logger = get_logger('app.admin')
access_logger = get_logger('app.access')
# Simple form for CSRF protection on action forms
class CSRFForm(FlaskForm):
    pass


class LogFilterForm(FlaskForm):
    log_type = SelectField('Log Type', choices=[
        ('all', 'All Logs'),
        ('app.log', 'Application Logs'),
        ('error.log', 'Error Logs'),
        ('access.log', 'Access Logs')
    ])
    log_level = SelectField('Log Level', choices=[
        ('all', 'All Levels'),
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical')
    ])
    start_date = DateField('Start Date', validators=[Optional()])
    end_date = DateField('End Date', validators=[Optional()])
    search_text = StringField('Search Text', validators=[Optional()])
    page = HiddenField('Page', default=1)
    submit = SubmitField('Apply Filters')

# Dynamic form for permission editing
class PermissionsForm(FlaskForm):
    submit = SubmitField('Save Permissions')
    
    def __init__(self, *args, permissions=None, user_permissions=None, **kwargs):
        self.permissions_list = permissions
        self.user_permissions = user_permissions or {}
        
        # Call parent constructor
        super(PermissionsForm, self).__init__(*args, **kwargs)
        
        # Create dynamic fields
        if permissions:
            # Dynamically add fields for each permission
            for perm in permissions:
                field_name = f'perm_{perm.id}'
                # Check if the permission is currently enabled for the user
                default = False
                if user_permissions and perm.name in user_permissions:
                    default = user_permissions[perm.name]
                
                # Create the field
                # Create the field
                field = BooleanField(perm.description, default=default)
                
                # Properly bind the field to the form
                bound_field = field.bind(form=self, name=field_name, prefix=self._prefix)
                
                # Initialize the data attribute explicitly to prevent AttributeError
                bound_field.data = default
                
                setattr(self, field_name, bound_field)
                
                # Add bound field to _fields dictionary for proper form processing
                self._fields[field_name] = bound_field
    def process(self, formdata=None, obj=None, data=None, **kwargs):
        """Process form data with dynamic field handling"""
        # First call the parent process method
        super(PermissionsForm, self).process(formdata, obj, data, **kwargs)
        
        # Re-add dynamic fields to ensure they're processed
        if hasattr(self, 'permissions_list') and self.permissions_list:
            for perm in self.permissions_list:
                field_name = f'perm_{perm.id}'
                # If the field doesn't exist, create it and bind it properly
                if field_name not in self._fields:
                    default = False
                    if self.user_permissions and perm.name in self.user_permissions:
                        default = self.user_permissions[perm.name]
                    
                    field = BooleanField(perm.description, default=default)
                    bound_field = field.bind(form=self, name=field_name, prefix=self._prefix)
                    
                    # Initialize the data attribute explicitly to prevent AttributeError
                    bound_field.data = default
                    
                    setattr(self, field_name, bound_field)
                    self._fields[field_name] = bound_field
                    
                # Process this field if formdata is available
                # Always get a reference to the field
                field = self._fields[field_name]
                
                # First ensure field has a data attribute initialized with its default
                if not hasattr(field, 'data'):
                    field.data = field.default
                
                # Only attempt to process the field with formdata if it's provided
                if formdata:
                    # Now process the field
                    # WTForms expects formdata to be iterable (like a MultiDict)
                    # Check if formdata is a dict-like object that can be indexed by field name
                    try:
                        if hasattr(formdata, 'getlist'):
                            # If formdata is a proper FormData object (like request.form)
                            field.process(formdata, data)
                        elif hasattr(formdata, 'get'):
                            # If formdata is a dictionary-like object
                            from werkzeug.datastructures import MultiDict
                            field_data = MultiDict()
                            if field_name in formdata:
                                field_data.add(field_name, formdata.get(field_name))
                            field.process(field_data, data)
                        else:
                            # If formdata is not dict-like, just set the field value to its default
                            default_value = False
                            if data and hasattr(data, field_name):
                                default_value = getattr(data, field_name)
                            field.data = default_value
                    except (TypeError, AttributeError):
                        # If any error occurs during processing, set to default value
                        logger.debug(f"Error processing dynamic field {field_name}, using default value", exc_info=True)
                        field.data = field.default

# Create the admin blueprint
admin = Blueprint('admin', __name__, url_prefix='/admin')

@admin.route('/users')
@login_required
@admin_required
def list_users():
    """Admin page to list all users"""

    request_id = request.headers.get('X-Request-ID', 'N/A')
    access_logger.info("Admin accessing user list page: admin_id=%s, request_id=%s", current_user.id, request_id)
    users = db_session.query(User).all()
    form = UserForm()
    # Create a CSRF form for the promote/demote/delete actions
    csrf_form = CSRFForm()
    return render_template('admin/users.html', users=users, form=form, csrf_form=csrf_form)

@admin.route('/users/add', methods=['POST'])
@login_required
@admin_required
def add_user():
    """Add a new user from admin interface"""
    form = UserForm()
    
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        
        # Check if username already exists
        existing_user = db_session.query(User).filter_by(username=username).first()
        if existing_user:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Duplicate user creation attempt: username=%s, admin=%s, request_id=%s", 
                          username, current_user.username, request_id)
            flash(f'Username {username} is already taken.', 'danger')
        else:
            try:
                # Create new user with hashed password
                new_user = User(
                    username=username,
                    password_hash=hash_password(password),
                    role='user'  # Default role for new users (legacy column)
                )
                db_session.add(new_user)
                db_session.commit()
                
                # Assign the user role in user_roles table
                user_role = db_session.query(Role).filter_by(name='user').first()
                if user_role:
                    new_user.roles.append(user_role)
                    db_session.commit()

                    request_id = request.headers.get('X-Request-ID', 'N/A')
                    access_logger.info("New user successfully created: username=%s, created_by=%s, request_id=%s", 
                              username, current_user.username, request_id)
                else:

                    request_id = request.headers.get('X-Request-ID', 'N/A')
                    logger.warning("Role assignment failed: role='user' not found for new user, username=%s, request_id=%s", 
                                  username, request_id)
                    flash(f'Warning: Could not assign role \"user\" - role not found.', 'warning')
                
                flash(f'User {username} has been created successfully.', 'success')
                return redirect(url_for('admin.list_users'))
            except SQLAlchemyError as e:
                db_session.rollback()

                request_id = request.headers.get('X-Request-ID', 'N/A')
                logger.error("Database error creating user: username=%s, error=%s, request_id=%s", 
                           username, str(e), request_id, exc_info=True)
                flash(f'Error creating user: {str(e)}', 'danger')
            except ValueError as e:

                request_id = request.headers.get('X-Request-ID', 'N/A')
                logger.error("Value error creating user: username=%s, error=%s, request_id=%s", 
                           username, str(e), request_id, exc_info=True)
                flash(str(e), 'danger')
    else:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{getattr(form, field).label.text}: {error}', 'danger')
    
    return redirect(url_for('admin.list_users'))

@admin.route('/users/<int:user_id>/promote', methods=['POST'])
@login_required
@admin_required
def promote_user(user_id):
    """Promote a user to admin"""
    # Validate CSRF token
    form = CSRFForm()
    if form.validate_on_submit():
        user = db_session.query(User).get(user_id)
        if user is None:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Promotion attempt failed: non-existent user, user_id=%s, admin=%s, request_id=%s", 
                          user_id, current_user.username, request_id)
            flash(f'User with ID {user_id} not found.', 'danger')
        elif user.id == current_user.id:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Self-promotion attempt blocked: admin=%s, admin_id=%s, request_id=%s", 
                          current_user.username, current_user.id, request_id)
            flash('You cannot change your own role.', 'danger')
        else:
            # Update legacy role column
            user.role = 'admin'
            
            # Add admin role to user's roles if not already assigned
            admin_role = db_session.query(Role).filter_by(name='admin').first()
            if admin_role and admin_role not in user.roles:
                user.roles.append(admin_role)
            
            db_session.commit()

            request_id = request.headers.get('X-Request-ID', 'N/A')
            access_logger.info("User promoted to admin: username=%s, user_id=%s, promoted_by=%s, request_id=%s", 
                      user.username, user_id, current_user.username, request_id)
            flash(f'User {user.username} promoted to admin.', 'success')
    else:
        flash('CSRF token validation failed. Please try again.', 'danger')
    return redirect(url_for('admin.list_users'))

@admin.route('/users/<int:user_id>/demote', methods=['POST'])
@login_required
@admin_required
def demote_user(user_id):
    """Demote an admin to regular user"""
    # Validate CSRF token
    form = CSRFForm()
    if form.validate_on_submit():
        user = db_session.query(User).get(user_id)
        if user is None:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Demotion attempt failed: non-existent user, user_id=%s, admin=%s, request_id=%s", 
                          user_id, current_user.username, request_id)
            flash(f'User with ID {user_id} not found.', 'danger')
        elif user.id == current_user.id:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Self-demotion attempt blocked: admin=%s, admin_id=%s, request_id=%s", 
                          current_user.username, current_user.id, request_id)
            flash('You cannot change your own role.', 'danger')
        else:
            # Update legacy role column
            user.role = 'user'
            
            # Remove admin role from user's roles
            admin_role = db_session.query(Role).filter_by(name='admin').first()
            if admin_role and admin_role in user.roles:
                user.roles.remove(admin_role)
                
            # Make sure user has the user role
            user_role = db_session.query(Role).filter_by(name='user').first()
            if user_role and user_role not in user.roles:
                user.roles.append(user_role)
                
            db_session.commit()

            request_id = request.headers.get('X-Request-ID', 'N/A')
            access_logger.info("User demoted to regular user: username=%s, user_id=%s, demoted_by=%s, request_id=%s", 
                      user.username, user_id, current_user.username, request_id)
            flash(f'User {user.username} demoted to regular user.', 'success')
    else:
        flash('CSRF token validation failed. Please try again.', 'danger')
    return redirect(url_for('admin.list_users'))

@admin.route('/users/<int:user_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_user(user_id):
    """Delete a user from the system"""
    # Validate CSRF token
    form = CSRFForm()
    if form.validate_on_submit():
        # Prevent self-deletion
        if user_id == current_user.id:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Self-deletion attempt blocked: admin=%s, admin_id=%s, request_id=%s", 
                          current_user.username, current_user.id, request_id)
            flash('You cannot delete your own account.', 'danger')
            return redirect(url_for('admin.list_users'))
        
        user = db_session.query(User).get(user_id)
        if user is None:

            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.warning("Deletion attempt failed: non-existent user, user_id=%s, admin=%s, request_id=%s", 
                          user_id, current_user.username, request_id)
            flash(f'User with ID {user_id} not found.', 'danger')
        else:
            try:
                # Check if the user has hosts that might be in use
                host_count = db_session.query(User).join(User.hosts).filter(User.id == user_id).count()
                if host_count > 0:
                    host_message = f"This user has {host_count} host(s) that will also be deleted."
                    logger.warning("Deleting user %s with %d associated hosts by admin %s", 
                                 user.username, host_count, current_user.username)
                    flash(f"Warning: {host_message}", 'warning')
                
                # Store username for the success message
                username = user.username
                
                # Perform the deletion - cascade will handle related records
                db_session.delete(user)
                db_session.commit()

                request_id = request.headers.get('X-Request-ID', 'N/A')
                access_logger.info("User successfully deleted: username=%s, user_id=%s, deleted_by=%s, request_id=%s", 
                          username, user_id, current_user.username, request_id)
                flash(f'User {username} has been deleted successfully.', 'success')
            except SQLAlchemyError as e:
                db_session.rollback()

                request_id = request.headers.get('X-Request-ID', 'N/A')
                logger.error("Database error deleting user: user_id=%s, error=%s, request_id=%s", 
                           user_id, str(e), request_id, exc_info=True)
                flash(f'Error deleting user: {str(e)}', 'danger')
    else:
        flash('CSRF token validation failed. Please try again.', 'danger')
    
    return redirect(url_for('admin.list_users'))

@admin.route('/users/<int:user_id>/permissions', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_permissions(user_id):
    """Edit granular permissions for a user"""
    request_id = request.headers.get('X-Request-ID', 'N/A')
    user = db_session.query(User).get(user_id)
    if user is None:
        logger.warning("Attempted to edit permissions for non-existent user ID: %s by admin: %s, request_id=%s", 
                     user_id, current_user.username, request_id)
        flash(f'User with ID {user_id} not found.', 'danger')
        return redirect(url_for('admin.list_users'))
    
    # Get all available permissions from the database
    all_permissions = db_session.query(Permission).order_by(Permission.category, Permission.name).all()
    
    # Group permissions by category for better UX
    categorized_permissions = {}
    for perm in all_permissions:
        if perm.category not in categorized_permissions:
            categorized_permissions[perm.category] = []
        categorized_permissions[perm.category].append(perm)
    
    # For both GET and POST, prepare user's current permissions
    user_permissions = user.permissions or {}
    
    # Create a form for the permission editing
    form = PermissionsForm(permissions=all_permissions, user_permissions=user_permissions)
    
    if form.validate_on_submit():
        try:
            request_id = request.headers.get('X-Request-ID', 'N/A')
            access_logger.info("Updating permissions for user %s (ID: %s) by admin %s", 
                      user.username, user_id, current_user.username)
            # Create a permissions dictionary based on the form data
            updated_permissions = {}
            
            # Process the form data using form.data dictionary
            for perm in all_permissions:
                field_name = f'perm_{perm.id}'
                if field_name in form.data:
                    field_value = form.data[field_name]
                    updated_permissions[perm.name] = field_value
            
            # Update the user's permissions
            user.permissions = updated_permissions
            db_session.commit()
            access_logger.info("Permissions updated successfully for user %s (ID: %s) by admin %s", 
                      user.username, user_id, current_user.username)
            flash(f'Permissions for {user.username} have been updated successfully.', 'success')
            return redirect(url_for('admin.list_users'))
        except SQLAlchemyError as e:
            db_session.rollback()

            logger.error("Database error updating permissions: user_id=%s, error=%s, request_id=%s", 
                       user_id, str(e), request_id, exc_info=True)
            flash(f'Error updating permissions: {str(e)}', 'danger')
    
    return render_template(
        'admin/edit_permissions.html', 
        user=user, 
        categorized_permissions=categorized_permissions,
        user_permissions=user_permissions,
        form=form
    )

@admin.route('/settings', methods=['GET', 'POST'])
@login_required
@admin_required
def settings():
    """Admin page to manage application settings"""

    request_id = request.headers.get('X-Request-ID', 'N/A')
    access_logger.info("Admin accessing application settings: admin=%s, admin_id=%s, request_id=%s", 
              current_user.username, current_user.id, request_id)
    form = AppSettingsForm()
    
    # Get current settings
    current_settings = AppSettings.get_settings(db_session)
    
    if request.method == 'GET':
        # Populate form with current settings
        form.min_password_length.data = current_settings.min_password_length
        form.require_special_characters.data = current_settings.require_special_characters
        form.require_numbers.data = current_settings.require_numbers
        form.password_expiration_days.data = current_settings.password_expiration_days
        form.session_timeout_minutes.data = current_settings.session_timeout_minutes
    
    if form.validate_on_submit():
        try:
            access_logger.info("Admin %s updating application settings", current_user.username)
            current_settings.min_password_length = form.min_password_length.data
            current_settings.require_special_characters = form.require_special_characters.data
            current_settings.require_numbers = form.require_numbers.data
            current_settings.password_expiration_days = form.password_expiration_days.data
            current_settings.session_timeout_minutes = form.session_timeout_minutes.data
            current_settings.max_concurrent_sessions = form.max_concurrent_sessions.data
            
            
            db_session.commit()
            
            flash('Application settings have been updated successfully.', 'success')
            return redirect(url_for('admin.settings'))
        except SQLAlchemyError as e:
            db_session.rollback()
            flash(f'Error updating settings: {str(e)}', 'danger')
    elif request.method == 'POST':
        # Handle validation errors
        for field, errors in form.errors.items():
            for error in errors:
                flash(f'{getattr(form, field).label.text}: {error}', 'danger')
    
    return render_template('admin/settings.html', form=form)


def read_log_file(filename, log_level='all', start_date=None, end_date=None, search_text=None, page=1, per_page=100, chunk_size=1024*1024, request=None):
    """
    Read and filter log file content with pagination support
    
    Args:
        filename (str): Name of the log file to read
        log_level (str): Filter by log level (DEBUG, INFO, etc.) or 'all'
        start_date (datetime): Filter logs after this date
        end_date (datetime): Filter logs before this date
        search_text (str): Filter logs containing this text
        page (int): Page number for pagination
        per_page (int): Number of log entries per page
        chunk_size (int): Size of chunks to read at a time (in bytes)
    
    Returns:
        tuple: (filtered_logs, total_entries, total_pages, current_page)
    """
    request_id = request.headers.get('X-Request-ID', 'N/A')
    user_id = current_user.id if current_user and hasattr(current_user, 'id') else 'anonymous'
    
    # Use structured logging format with consistent fields
    logger.debug("Reading log file started", extra={
        'request_id': request_id,
        'user_id': user_id,
        'log_filename': filename,
        'log_level': log_level,
        'page': page,
        'per_page': per_page,
        'chunk_size': chunk_size
    })
    
    # Get log directory from configuration with fallbacks
    log_dir = current_app.config.get('LOG_DIR')
    if not log_dir:
        log_dir = current_app.config.get('LOGGING_CONFIG', {}).get('handlers', {}).get('file', {}).get('directory')
    
    # Final fallback to default path
    if not log_dir:
        log_dir = os.path.join(current_app.instance_path, 'logs')
        logger.warning(
            "Log directory not configured in CONFIG.LOG_DIR or LOGGING_CONFIG.handlers.file.directory, using default",
            extra={'request_id': request_id, 'user_id': user_id, 'default_log_dir': log_dir}
        )
    
    # Ensure log directory exists
    try:
        os.makedirs(log_dir, exist_ok=True)
    except OSError as e:
        logger.error(
            "Failed to create log directory", 
            extra={'request_id': request_id, 'user_id': user_id, 'log_dir': log_dir, 'error': str(e)},
            exc_info=True
        )
        return f"Error: Failed to create log directory: {str(e)}", 0, 0, 1
    
    log_file = os.path.join(log_dir, filename)
    
    try:
        # Check file size first
        if not os.path.exists(log_file):
            logger.warning(
                "Log file does not exist", 
                extra={'request_id': request_id, 'user_id': user_id, 'log_file': log_file}
            )
            return "No log file found", 0, 0, 1
            
        file_size = os.path.getsize(log_file)
        logger.debug(
            "Log file metadata retrieved", 
            extra={'request_id': request_id, 'user_id': user_id, 'log_file': log_file, 'file_size': file_size}
        )

        # Process in chunks for large files
        log_lines = []
        
        # Memory-efficient file reading using chunks
        with open(log_file, 'r', errors='replace') as f:  # Using errors='replace' to handle encoding issues
            if file_size > chunk_size:
                logger.info(
                    "Processing large log file in chunks", 
                    extra={
                        'request_id': request_id, 
                        'user_id': user_id,
                        'file_size': file_size, 
                        'chunk_size': chunk_size,
                        'estimated_chunks': (file_size // chunk_size) + 1
                    }
                )
                
                # For very large files, we'll use a memory-efficient approach
                total_lines = 0
                chunk_num = 0
                partial_last_line = ""
                
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    
                    chunk_num += 1
                    if chunk_num % 10 == 0:
                        logger.debug(
                            "Processing chunk", 
                            extra={
                                'request_id': request_id, 
                                'user_id': user_id,
                                'chunk_num': chunk_num,
                                'bytes_read': chunk_num * chunk_size
                            }
                        )
                    
                    # Handle partial lines between chunks
                    if partial_last_line:
                        chunk = partial_last_line + chunk
                        partial_last_line = ""
                    
                    lines = chunk.splitlines()
                    
                    # Check if chunk ends with a complete line
                    if chunk.endswith('\n'):
                        log_lines.extend(lines)
                    else:
                        # Save the last partial line for the next chunk
                        if lines:
                            partial_last_line = lines[-1]
                            log_lines.extend(lines[:-1])
                        else:
                            partial_last_line = chunk
                    
                    total_lines = len(log_lines)
                
                # Add the last partial line if there is one
                if partial_last_line:
                    log_lines.append(partial_last_line)
            else:
                log_lines = f.readlines()
        
        # Apply filters
        filtered_logs = []
        
        # Different log files have different formats
        # For app.log and error.log (with timestamps and log levels)
        if filename in ['app.log', 'error.log']:
            # Example format: 2023-09-15 14:30:45,123 - INFO - app.admin - Admin accessing user list page: admin
            log_pattern = re.compile(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\] (\w+) - ([^-]+) - (.*)')
            
            for line in log_lines:
                match = log_pattern.match(line)
                if match:
                    timestamp_str, level, module, message = match.groups()
                    
                    # Apply log level filter only if specifically requested
                    if log_level != 'all' and level.upper() != log_level.upper():
                        continue
                    
                    # Parse timestamp
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                        
                        # Apply date filters only if specifically provided
                        if start_date and timestamp.date() < start_date:
                            continue
                        if end_date and timestamp.date() > end_date:
                            continue
                    except ValueError:
                        # If timestamp parsing fails, don't filter by date
                        pass
                    
                    # Apply search text filter only if specifically provided
                    if search_text and search_text.lower() not in line.lower():
                        continue
                    
                    # Add to filtered logs
                    filtered_logs.append(line)
                elif line.strip():
                    # For non-matching lines like tracebacks
                    if search_text:
                        # If search text is provided, only include if it matches
                        if search_text.lower() in line.lower():
                            filtered_logs.append(line)
                    else:
                        # If no search text is provided, include all non-empty lines
                        filtered_logs.append(line)
        
        # For access.log (with different format)
        # For access.log (with same format as app.log)
        elif filename == 'access.log':
            # Access logs use the same format as app.log but with app.access module
            log_pattern = re.compile(r'\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3})\] (\w+) - ([^-]+) - (.*)')
            
            for line in log_lines:
                match = log_pattern.match(line)
                if match:
                    timestamp_str, level, module, message = match.groups()
                    
                    # Apply log level filter only if specifically requested
                    if log_level != 'all' and level.upper() != log_level.upper():
                        continue
                    
                    # Parse timestamp
                    try:
                        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                        
                        # Apply date filters only if specifically provided
                        if start_date and timestamp.date() < start_date:
                            continue
                        if end_date and timestamp.date() > end_date:
                            continue
                    except ValueError:
                        # If timestamp parsing fails, don't filter by date
                        pass
                    
                    # Apply search text filter only if specifically provided
                    if search_text and search_text.lower() not in line.lower():
                        continue
                    
                    # Add to filtered logs
                    filtered_logs.append(line)
                elif line.strip():
                    # For non-matching lines like tracebacks
                    if search_text:
                        # If search text is provided, only include if it matches
                        if search_text.lower() in line.lower():
                            filtered_logs.append(line)
                    else:
                        # If no search text is provided, include all non-empty lines
                        filtered_logs.append(line)
        # Reverse the list to show newest entries first
        filtered_logs.reverse()
        
        # Calculate pagination
        total_entries = len(filtered_logs)
        total_pages = (total_entries + per_page - 1) // per_page  # Ceiling division
        
        # Ensure page is within bounds
        page = max(1, min(page, total_pages)) if total_pages > 0 else 1
        
        # Get the current page of logs
        start_idx = (page - 1) * per_page
        end_idx = min(start_idx + per_page, total_entries)
        paginated_logs = filtered_logs[start_idx:end_idx]
        
        # Log successful completion with performance metrics
        logger.info(
            "Log file processed successfully",
            extra={
                'request_id': request_id,
                'user_id': user_id,
                'log_filename': filename,
                'total_entries': total_entries,
                'filtered_entries': len(filtered_logs),
                'page': page,
                'per_page': per_page,
                'processing_time_ms': int((datetime.now() - datetime.now()).total_seconds() * 1000)  # This would need a start time captured at beginning
            }
        )
        
        return ''.join(paginated_logs), total_entries, total_pages, page
    
    except FileNotFoundError:
        error_msg = f"Log file not found: {log_file}"
        logger.error(
            error_msg,
            extra={
                'request_id': request_id,
                'user_id': user_id,
                'log_file': log_file,
                'error_type': 'FileNotFoundError'
            },
            exc_info=True
        )
        return "No log file found", 0, 0, 1
    except PermissionError:
        error_msg = f"Permission denied accessing log file: {log_file}"
        logger.error(
            error_msg,
            extra={
                'request_id': request_id,
                'user_id': user_id,
                'log_file': log_file,
                'error_type': 'PermissionError'
            },
            exc_info=True
        )
        return "Error: Permission denied accessing log file", 0, 0, 1
    except UnicodeDecodeError as e:
        error_msg = f"Unicode decode error reading log file: {log_file}"
        logger.error(
            error_msg,
            extra={
                'request_id': request_id,
                'user_id': user_id,
                'log_file': log_file,
                'error_type': 'UnicodeDecodeError',
                'error_details': str(e)
            },
            exc_info=True
        )
        return "Error: Log file contains invalid characters", 0, 0, 1
    except MemoryError:
        error_msg = f"Memory error processing log file: {log_file}"
        logger.error(
            error_msg,
            extra={
                'request_id': request_id,
                'user_id': user_id,
                'log_file': log_file,
                'error_type': 'MemoryError',
                'file_size': file_size if 'file_size' in locals() else 'unknown'
            },
            exc_info=True
        )
        return "Error: Log file too large to process", 0, 0, 1
    except Exception as e:
        error_msg = f"Error reading log file: {str(e)}"
        logger.error(
            error_msg,
            extra={
                'request_id': request_id,
                'user_id': user_id,
                'log_file': log_file,
                'error_type': type(e).__name__,
                'error_details': str(e)
            },
            exc_info=True
        )
        return f"Error reading log file: {str(e)}", 0, 0, 1

@admin.route('/logs', methods=['GET', 'POST'])
@login_required
@admin_required
def view_logs():
    """Admin page to view system logs with filtering and pagination"""
    request_id = request.headers.get('X-Request-ID', 'N/A')
    start_time = datetime.now()
    log_context = {
        'request_id': request_id,
        'user_id': current_user.id,
        'username': current_user.username,
        'endpoint': 'admin.view_logs',
        'method': request.method
    }
    
    access_logger.info("Admin accessing system logs page", extra=log_context)
    ALLOWED_LOG_FILES = ['app.log', 'error.log', 'access.log']
    
    # Create and initialize the filter form
    form = LogFilterForm()
    
    # Handle form submission
    if form.validate_on_submit():
        # Redirect to GET with filter parameters to make the page bookmarkable
        params = {
            'file': form.log_type.data,
            'level': form.log_level.data,
            'page': form.page.data or 1
        }
        
        if form.start_date.data:
            params['start_date'] = form.start_date.data.strftime('%Y-%m-%d')
        if form.end_date.data:
            params['end_date'] = form.end_date.data.strftime('%Y-%m-%d')
        if form.search_text.data:
            params['search_text'] = form.search_text.data
            
        return redirect(url_for('admin.view_logs', **params))
    
    # Process GET parameters (including after redirect from POST)
    selected_file = request.args.get('file', 'app.log')
    
    # Map simplified file names to actual log files
    file_mapping = {
        'app': 'app.log',
        'error': 'error.log',
        'access': 'access.log',
        'all': 'all'
    }
    
    # If a simplified name was provided, map it to the full filename
    if selected_file in file_mapping:
        selected_file = file_mapping[selected_file]
        
    log_level = request.args.get('level', 'all')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 100))  # Default 100 lines per page
    search_text = request.args.get('search_text', '')
    
    # Parse date parameters
    start_date = None
    end_date = None
    try:
        if 'start_date' in request.args and request.args.get('start_date').strip():
            start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date()
        if 'end_date' in request.args and request.args.get('end_date').strip():
            end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date()
    except ValueError:
        flash('Invalid date format. Use YYYY-MM-DD.', 'danger')
    
    # Validate file name for security
    if selected_file != 'all' and selected_file not in ALLOWED_LOG_FILES:
        abort(400)
    
    # Populate form with current filter values for display
    form.log_type.data = selected_file
    form.log_level.data = log_level
    form.start_date.data = start_date
    form.end_date.data = end_date
    form.search_text.data = search_text
    form.page.data = str(page)
    
    # Update log context with filtering parameters
    log_context.update({
        'selected_file': selected_file,
        'log_level': log_level,
        'page': page,
        'per_page': per_page,
        'search_text': search_text,
        'start_date': start_date.isoformat() if start_date else None,
        'end_date': end_date.isoformat() if end_date else None
    })
    
    # Initialize common variables for template rendering
    all_log_content = []
    log_content = ""
    pagination = {
        'current_page': 1,
        'total_pages': 0,
        'total_entries': 0,
        'has_prev': False,
        'has_next': False,
        'prev_page': None,
        'next_page': None
    }
    pagination_params = {}
    
    try:
        # Read and filter the log file
        if selected_file == 'all':
            # When 'all' is selected, combine logs from all files
            logger.info("Processing combined logs request", extra=log_context)
            
            # Get max combined log lines from config with a reasonable default
            max_combined_lines = current_app.config.get('MAX_COMBINED_LOG_LINES', 10000)
            
            # Create a combined view of all log files using a generator to save memory
            all_log_content = []
            total_lines = 0
            
            # Log the start of each file processing
            for log_file in ['app.log', 'error.log', 'access.log']:
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(
                        f"Processing {log_file} for combined view",
                        extra={
                            'request_id': request_id,
                            'user_id': current_user.id,
                            'log_file': log_file
                        }
                    )
                
                # Use a smaller per_page value to process files in chunks
                chunk_size = min(max_combined_lines // 3, 5000)  # Divide by 3 for the three log files
                
                log_content, file_total_entries, _, _ = read_log_file(
                    log_file, 
                    log_level=log_level,
                    start_date=start_date,
                    end_date=end_date,
                    search_text=search_text,
                    page=1,  # We'll handle pagination after combining
                    per_page=chunk_size,
                    chunk_size=1024*512,  # Use smaller chunks for memory efficiency
                    request=request
                )
                
                if log_content and log_content != "No log file found":
                    # Check if adding this content would exceed the maximum
                    content_lines = log_content.count('\n') + 1
                    
                    if total_lines + content_lines <= max_combined_lines:
                        all_log_content.append(f"--- {log_file} ---\n{log_content}")
                        total_lines += content_lines
                    else:
                        # Add a truncated version of the content
                        remaining_lines = max_combined_lines - total_lines
                        if remaining_lines > 0:
                            truncated_content = '\n'.join(log_content.splitlines()[:remaining_lines])
                            all_log_content.append(f"--- {log_file} (truncated) ---\n{truncated_content}")
                            all_log_content.append("\n... Log output truncated due to size limits ...")
                            total_lines = max_combined_lines
                        else:
                            all_log_content.append(f"--- {log_file} ---\n... Log output truncated due to size limits ...")
                        
                        # Log that we're truncating the output
                        logger.info(
                            "Combined log output truncated due to size limits",
                            extra={
                                'request_id': request_id,
                                'user_id': current_user.id,
                                'max_lines': max_combined_lines,
                                'total_available': total_lines + file_total_entries
                            }
                        )
                        break
        
        # Combine all logs
        if all_log_content:
            combined_content = "\n\n".join(all_log_content)
            
            # Calculate pagination for combined content
            lines = combined_content.splitlines()
            total_entries = len(lines)
            total_pages = (total_entries + per_page - 1) // per_page
            
            # Ensure page is within bounds
            page = max(1, min(page, total_pages)) if total_pages > 0 else 1
            
            # Get the current page of logs
            start_idx = (page - 1) * per_page
            end_idx = min(start_idx + per_page, total_entries)
            paginated_logs = lines[start_idx:end_idx]
            
            log_content = "\n".join(paginated_logs)
            
            # Create pagination data for template
            pagination = {
                'current_page': page,
                'total_pages': total_pages,
                'total_entries': total_entries,
                'has_prev': page > 1,
                'has_next': page < total_pages,
                'prev_page': page - 1 if page > 1 else None,
                'next_page': page + 1 if page < total_pages else None
            }
            
            # Create parameter sets for pagination links
            pagination_params = {}
            for param in ['file', 'level', 'search_text', 'start_date', 'end_date', 'per_page']:
                if param in request.args:
                    pagination_params[param] = request.args.get(param)
            
            # Generate URL for download link
            download_url = url_for('admin.download_log', file=selected_file)
            
            return render_template(
                'admin/logs.html',
                log_content=log_content,
                form=form,
                pagination=pagination,
                pagination_params=pagination_params,
                download_url=download_url,
                selected_file=selected_file,
                log_level=log_level,
                search_text=search_text,
                start_date=start_date.strftime('%Y-%m-%d') if start_date else None,
                end_date=end_date.strftime('%Y-%m-%d') if end_date else None
            )
        else:
            log_content = "No log files found"
            logger.info("No log files found for combined view", extra=log_context)
            
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug("Processing single log file request", extra=log_context)
            
            log_content, total_entries, total_pages, current_page = read_log_file(
                selected_file,
                log_level=log_level,
                start_date=start_date,
                end_date=end_date,
                search_text=search_text,
                page=page,
                per_page=per_page,
                request=request
            )
            
            # Update pagination with results
            pagination = {
                'current_page': current_page,
                'total_pages': total_pages,
                'total_entries': total_entries,
                'has_prev': current_page > 1,
                'has_next': current_page < total_pages,
                'prev_page': current_page - 1 if current_page > 1 else None,
                'next_page': current_page + 1 if current_page < total_pages else None
            }
            
            # Create parameter sets for pagination links
            pagination_params = {}
            for param in ['file', 'level', 'search_text', 'start_date', 'end_date', 'per_page']:
                if param in request.args:
                    pagination_params[param] = request.args.get(param)
            
            # Generate URL for download link
            download_url = url_for('admin.download_log', file=selected_file)
    
    except Exception as e:
        # Unified error handling for all log processing exceptions
        logger.error(
            "Error processing logs",
            extra={
                **log_context,
                'error': str(e),
                'error_type': type(e).__name__
            },
            exc_info=True
        )
        
        log_content = f"Error processing logs: {str(e)}"
        download_url = url_for('admin.download_log', file='app.log')  # Default to app.log when error occurs
        pagination_params = {}  # Empty params for error case
    
    # Calculate performance metrics
    end_time = datetime.now()
    duration_ms = int((end_time - start_time).total_seconds() * 1000)
    
    # Log completion with performance metrics
    logger.info(
        "Log view operation completed",
        extra={
            **log_context,
            'duration_ms': duration_ms,
            'total_entries': pagination['total_entries']
        }
    )
    
    # Download URL is already generated above in the try block, no need to regenerate
    
    # Check if this is an AJAX request
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        # Improve performance by consolidating debug logs and checking if debug is enabled
        if logger.isEnabledFor(logging.DEBUG):
            request_id = request.headers.get('X-Request-ID', 'N/A')
            debug_info = {
                'request_url': request.url,
                'method': request.method,
                'headers': dict(request.headers),
                'args': dict(request.args),
                'selected_file': selected_file,
                'log_level': log_level,
                'search_text': search_text,
                'request_id': request_id
            }
            logger.debug("Processing AJAX request: %s", json.dumps(debug_info))
        # Ensure log content is properly escaped for HTML
        escaped_log_content = html.escape(log_content)
        
        # For AJAX requests, return JSON data
        response_data = {
            'log_content': escaped_log_content,
            'pagination': {
                'current_page': pagination['current_page'],
                'total_pages': pagination['total_pages'],
                'total_entries': pagination['total_entries'],
                'has_prev': pagination['has_prev'],
                'has_next': pagination['has_next'],
                'prev_page': pagination['prev_page'],
                'next_page': pagination['next_page']
            },
            'selected_file': selected_file,
            'log_level': log_level,
            'search_text': search_text,
            'start_date': start_date.strftime('%Y-%m-%d') if start_date else None,
            'end_date': end_date.strftime('%Y-%m-%d') if end_date else None
        }
        
        try:
            # Create JSON string with ensure_ascii=False to handle non-ASCII characters
            json_response = json.dumps(response_data, ensure_ascii=False)
            # Only log if debug is enabled to improve performance
            if logger.isEnabledFor(logging.DEBUG):
                request_id = request.headers.get('X-Request-ID', 'N/A')
                logger.debug("Sending JSON response (truncated): response=%s, request_id=%s", 
                           json_response[:200] + "..." if len(json_response) > 200 else json_response,
                           request_id)
            return current_app.response_class(
                response=json_response,
                status=200,
                mimetype='application/json'
            )
        except Exception as e:
            request_id = request.headers.get('X-Request-ID', 'N/A')
            logger.error("Error creating JSON response: error=%s, request_id=%s", 
                       str(e), request_id, exc_info=True)
            return jsonify({'error': 'Internal server error'}), 500
    # For regular requests, return the rendered template
    return render_template(
        'admin/logs.html',
        log_content=log_content,
        form=form,
        pagination=pagination,
        pagination_params=pagination_params,
        download_url=download_url,
        selected_file=selected_file,
        log_level=log_level,
        search_text=search_text,
        start_date=start_date.strftime('%Y-%m-%d') if start_date else None,
        end_date=end_date.strftime('%Y-%m-%d') if end_date else None
    )


@admin.route('/logs/download')
@login_required
@admin_required
def download_log():
    """Download log file with performance tracking and improved error handling"""
    # Start performance tracking
    start_time = datetime.now()
    
    # Allowed log files - should come from configuration
    ALLOWED_LOG_FILES = current_app.config.get('ALLOWED_LOG_FILES', ['app.log', 'error.log', 'access.log'])
    
    # Get request context for structured logging
    request_id = request.headers.get('X-Request-ID', 'N/A')
    user_id = current_user.id if current_user and hasattr(current_user, 'id') else 'anonymous'
    username = current_user.username if current_user and hasattr(current_user, 'username') else 'anonymous'
    
    # Create context dictionary for structured logging
    log_context = {
        'request_id': request_id,
        'user_id': user_id,
        'username': username,
        'endpoint': 'admin.download_log',
        'method': request.method,
        'ip_address': request.remote_addr
    }
    
    access_logger.info("Log download operation initiated", extra=log_context)
    
    try:
        # Get file name from query string
        file_name = request.args.get('file', 'app.log')
        log_context['file_name'] = file_name
        
        # Get search_text parameter and other filters
        search_text = request.args.get('search_text', '')
        log_level = request.args.get('level', 'all')
        
        # Update log context with request parameters
        log_context.update({
            'search_text': search_text,
            'log_level': log_level
        })
        
        # Parse date parameters
        start_date = None
        end_date = None
        try:
            if 'start_date' in request.args and request.args.get('start_date').strip():
                start_date = datetime.strptime(request.args.get('start_date'), '%Y-%m-%d').date()
                log_context['start_date'] = start_date.isoformat()
            if 'end_date' in request.args and request.args.get('end_date').strip():
                end_date = datetime.strptime(request.args.get('end_date'), '%Y-%m-%d').date()
                log_context['end_date'] = end_date.isoformat()
        except ValueError as e:
            error_msg = "Invalid date format in download request"
            logger.error(error_msg, extra={**log_context, 'error': str(e), 'error_type': 'ValueError'}, exc_info=True)
            flash('Invalid date format. Use YYYY-MM-DD.', 'danger')
            return redirect(url_for('admin.view_logs'))
        
        # Validate file name for security
        if file_name == 'all':
            # If 'all' is requested for download, default to app.log
            file_name = 'app.log'
            log_context['file_name'] = file_name
            logger.info("Download of 'all' logs requested (defaulting to app.log)", extra=log_context)
        elif file_name not in ALLOWED_LOG_FILES:
            error_msg = f"Invalid log file download attempt: {file_name}"
            logger.warning(error_msg, extra=log_context)
            flash(f'Invalid log file: {file_name}', 'danger')
            return redirect(url_for('admin.view_logs'))
        
        # Get log directory from configuration with fallbacks
        log_dir = current_app.config.get('LOG_DIR')
        if not log_dir:
            log_dir = current_app.config.get('LOGGING_CONFIG', {}).get('handlers', {}).get('file', {}).get('directory')
        
        # Final fallback to default path
        if not log_dir:
            log_dir = os.path.join(current_app.instance_path, 'logs')
            logger.warning(
                "Log directory not configured, using default",
                extra={**log_context, 'default_log_dir': log_dir}
            )
        
        log_file = os.path.join(log_dir, file_name)
        log_context['log_file_path'] = log_file
        
        # Check if file exists
        if not os.path.exists(log_file):
            error_msg = f"Log file not found: {log_file}"
            logger.error(error_msg, extra={**log_context, 'error_type': 'FileNotFoundError'})
            flash('Log file not found.', 'danger')
            return redirect(url_for('admin.view_logs'))
        
        # Check file size for memory-efficient handling
        file_size = os.path.getsize(log_file)
        log_context['file_size'] = file_size
        
        # Apply filters if specified (filtered download)
        if search_text or log_level != 'all' or start_date or end_date:
            logger.info("Filtered log download requested", extra=log_context)
            
            # Use large per_page to get all matching entries (may need optimization for very large files)
            max_download_size = current_app.config.get('MAX_DOWNLOAD_SIZE', 10 * 1024 * 1024)  # Default 10MB
            
            # For very large files, warn about potential performance issues
            if file_size > max_download_size:
                logger.warning(
                    "Large file download with filters may be slow",
                    extra={**log_context, 'file_size': file_size, 'max_recommended': max_download_size}
                )
            
            # Get filtered content using read_log_file with memory efficiency
            filtered_content, _, _, _ = read_log_file(
                file_name,
                log_level=log_level,
                start_date=start_date,
                end_date=end_date,
                search_text=search_text,
                page=1,
                per_page=1000000,  # Large number to get all matching entries
                chunk_size=min(1024*1024, file_size // 10),  # Adjust chunk size based on file size
                request=request
            )
            
            # Create in-memory file for download
            mem_file = io.BytesIO()
            mem_file.write(filtered_content.encode('utf-8'))
            mem_file.seek(0)
            
            # Calculate download performance
            end_time = datetime.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Log successful filtered download with performance metrics
            logger.info(
                "Filtered log file download successful",
                extra={
                    **log_context,
                    'processing_time_ms': duration_ms,
                    'filtered_size_bytes': mem_file.getbuffer().nbytes
                }
            )
            
            return send_file(
                mem_file,
                mimetype='text/plain',
                as_attachment=True,
                download_name=f"filtered_{file_name}"
            )
        else:
            # For regular downloads, stream directly from file for memory efficiency
            logger.info("Regular log file download requested", extra=log_context)
            
            # Calculate download performance
            end_time = datetime.now()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Log successful download with performance metrics
            access_logger.info(
                "Log file download successful",
                extra={**log_context, 'processing_time_ms': duration_ms}
            )
            
            return send_file(
                log_file,
                mimetype='text/plain',
                as_attachment=True,
                download_name=file_name
            )
    
    except FileNotFoundError as e:
        error_msg = f"Log file not found: {str(e)}"
        logger.error(error_msg, extra={**log_context, 'error_type': 'FileNotFoundError'}, exc_info=True)
        flash('Log file not found.', 'danger')
        
    except PermissionError as e:
        error_msg = f"Permission denied accessing log file: {str(e)}"
        logger.error(error_msg, extra={**log_context, 'error_type': 'PermissionError'}, exc_info=True)
        flash('Permission denied accessing log file.', 'danger')
        
    except MemoryError as e:
        error_msg = f"Memory error processing log file: {str(e)}"
        logger.error(error_msg, extra={**log_context, 'error_type': 'MemoryError'}, exc_info=True)
        flash('Log file too large to process.', 'danger')
        
    except Exception as e:
        error_msg = f"Error downloading log file: {str(e)}"
        logger.error(error_msg, extra={**log_context, 'error_type': type(e).__name__, 'error': str(e)}, exc_info=True)
        flash(f'Error downloading log file: {str(e)}', 'danger')
    
    return redirect(url_for('admin.view_logs'))
