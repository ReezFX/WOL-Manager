from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from functools import wraps
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash
from flask_wtf import FlaskForm, CSRFProtect
from wtforms import HiddenField

from app.models import User, Permission, Role
from app import db_session
from app.forms import UserForm
from app.auth import hash_password, admin_required

# Create a CSRF protection instance
csrf = CSRFProtect()

# Simple form for CSRF protection on action forms
class CSRFForm(FlaskForm):
    pass

# Create the admin blueprint
admin = Blueprint('admin', __name__, url_prefix='/admin')

# Initialize CSRF protection with the blueprint
def init_csrf(app):
    csrf.init_app(app)

@admin.route('/users')
@login_required
@admin_required
def list_users():
    """Admin page to list all users"""
    users = db_session.query(User).all()
    form = UserForm()
    # Create a CSRF form for the promote/demote actions
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
                else:
                    flash(f'Warning: Could not assign role "user" - role not found.', 'warning')
                
                flash(f'User {username} has been created successfully.', 'success')
                return redirect(url_for('admin.list_users'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error creating user: {str(e)}', 'danger')
            except ValueError as e:
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
            flash(f'User with ID {user_id} not found.', 'danger')
        elif user.id == current_user.id:
            flash('You cannot change your own role.', 'danger')
        else:
            # Update legacy role column
            user.role = 'admin'
            
            # Add admin role to user's roles if not already assigned
            admin_role = db_session.query(Role).filter_by(name='admin').first()
            if admin_role and admin_role not in user.roles:
                user.roles.append(admin_role)
            
            db_session.commit()
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
            flash(f'User with ID {user_id} not found.', 'danger')
        elif user.id == current_user.id:
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
            flash('You cannot delete your own account.', 'danger')
            return redirect(url_for('admin.list_users'))
        
        user = db_session.query(User).get(user_id)
        if user is None:
            flash(f'User with ID {user_id} not found.', 'danger')
        else:
            try:
                # Check if the user has hosts that might be in use
                host_count = db_session.query(User).join(User.hosts).filter(User.id == user_id).count()
                if host_count > 0:
                    host_message = f"This user has {host_count} host(s) that will also be deleted."
                    flash(f"Warning: {host_message}", 'warning')
                
                # Store username for the success message
                username = user.username
                
                # Perform the deletion - cascade will handle related records
                db_session.delete(user)
                db_session.commit()
                flash(f'User {username} has been deleted successfully.', 'success')
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error deleting user: {str(e)}', 'danger')
    else:
        flash('CSRF token validation failed. Please try again.', 'danger')
    
    return redirect(url_for('admin.list_users'))

@admin.route('/users/<int:user_id>/permissions', methods=['GET', 'POST'])
@login_required
@admin_required
def edit_permissions(user_id):
    """Edit granular permissions for a user"""
    user = db_session.query(User).get(user_id)
    if user is None:
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
    
    if request.method == 'POST':
        try:
            # Create a permissions dictionary based on the form data
            updated_permissions = {}
            
            # Process the form data
            for perm in all_permissions:
                perm_key = f'perm_{perm.id}'
                if perm_key in request.form:
                    updated_permissions[perm.name] = True
                else:
                    # Explicitly set to False to override role-based permissions
                    updated_permissions[perm.name] = False
            
            # Update the user's permissions
            user.permissions = updated_permissions
            db_session.commit()
            
            flash(f'Permissions for {user.username} have been updated successfully.', 'success')
            return redirect(url_for('admin.list_users'))
            
        except SQLAlchemyError as e:
            db_session.rollback()
            flash(f'Error updating permissions: {str(e)}', 'danger')
    
    # For GET requests, prepare user's current permissions
    user_permissions = user.permissions or {}
    
    # Create a CSRF form for the permission update
    csrf_form = CSRFForm()
    
    return render_template(
        'admin/edit_permissions.html', 
        user=user, 
        categorized_permissions=categorized_permissions,
        user_permissions=user_permissions,
        csrf_form=csrf_form
    )

