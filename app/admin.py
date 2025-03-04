from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from functools import wraps
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash
from flask_wtf import FlaskForm, CSRFProtect
from wtforms import HiddenField

from app.models import User
from app import db_session
from app.forms import RegistrationForm
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
    form = RegistrationForm()
    # Create a CSRF form for the promote/demote actions
    csrf_form = CSRFForm()
    return render_template('admin/users.html', users=users, form=form, csrf_form=csrf_form)

@admin.route('/users/add', methods=['POST'])
@login_required
@admin_required
def add_user():
    """Add a new user from admin interface"""
    form = RegistrationForm()
    
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
                    role='user'  # Default role for new users
                )
                db_session.add(new_user)
                db_session.commit()
                
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
        user = db_session.query(User).get_or_404(user_id)
        if user.id == current_user.id:
            flash('You cannot change your own role.', 'danger')
        else:
            user.role = 'admin'
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
        user = db_session.query(User).get_or_404(user_id)
        if user.id == current_user.id:
            flash('You cannot change your own role.', 'danger')
        else:
            user.role = 'user'
            db_session.commit()
            flash(f'User {user.username} demoted to regular user.', 'success')
    else:
        flash('CSRF token validation failed. Please try again.', 'danger')
    return redirect(url_for('admin.list_users'))

