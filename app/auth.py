from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, session
from flask_login import login_user, logout_user, login_required, current_user
import logging
import sys
import traceback
from app.logging_config import get_logger
from werkzeug.security import check_password_hash
from functools import wraps
import bcrypt
from sqlalchemy.exc import SQLAlchemyError
from flask_wtf import FlaskForm
from wtforms import PasswordField, StringField, SubmitField
from wtforms.validators import DataRequired, EqualTo, Length, ValidationError

from app.models import User, Role
from app import db_session
from app.forms import LoginForm
from flask_wtf.csrf import validate_csrf, ValidationError as CSRFValidationError

# Create the auth blueprint
auth = Blueprint('auth', __name__)

# Configure module-level logger
logger = get_logger('app.auth')

# Custom decorator for admin access
# Custom decorator for admin access
def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('You need admin privileges to access this page.', 'danger')
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function
# Password hashing and verification functions
# CSRF validation function for important actions
def validate_csrf_token(token=None):
    """Validate CSRF token for important actions.
    
    Args:
        token: The CSRF token to validate. If None, get from request.form.
        
    Returns:
        bool: True if CSRF token is valid, False otherwise.
    """
    if token is None:
        token = request.form.get('csrf_token')
    
    if not token:
        logger.warning('CSRF validation failed: No token provided')
        return False
    
    try:
        validate_csrf(token)
        return True
    except CSRFValidationError as e:
        logger.warning(f'CSRF validation failed: {str(e)}')
        return False

def hash_password(password):
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def check_password(hashed_password, password):
    """Verify a password against its hash"""
    return bcrypt.checkpw(
        password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )

class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Current Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[
        DataRequired(),
        Length(min=8, message='New password must be at least 8 characters long.')
    ])
    confirm_password = PasswordField('Confirm New Password', validators=[
        DataRequired(),
        EqualTo('new_password', message='New passwords do not match.')
    ])
    submit = SubmitField('Change Password')


@auth.route('/login', methods=['GET', 'POST'])
def login():
    logger.debug("==== LOGIN ROUTE STARTED ====")
    
    # Debug request details
    logger.debug(f"Request method: {request.method}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    logger.debug(f"Request cookies: {request.cookies}")
    logger.debug(f"Request form data: {request.form}")
    logger.debug(f"Request args: {request.args}")
    
    # If user is already logged in, redirect to index page
    if current_user.is_authenticated:
        logger.debug("User already authenticated, redirecting to index")
        return redirect(url_for('main.index'))
    
    # Create login form
    form = LoginForm()
    logger.debug(f"Created login form, CSRF enabled: {current_app.config.get('WTF_CSRF_ENABLED', True)}")
    
    # Debug session info
    logger.debug(f"Session cookie name: {current_app.config.get('SESSION_COOKIE_NAME')}")
    logger.debug(f"Session cookie domain: {current_app.config.get('SESSION_COOKIE_DOMAIN')}")
    logger.debug(f"Session cookie path: {current_app.config.get('SESSION_COOKIE_PATH')}")
    logger.debug(f"Session cookie secure: {current_app.config.get('SESSION_COOKIE_SECURE')}")
    logger.debug(f"Session cookie samesite: {current_app.config.get('SESSION_COOKIE_SAMESITE')}")
    
    # Handle POST request
    if request.method == 'POST':
        logger.debug("Processing POST request for login")
        
        # Validate CSRF token for login form
        if not validate_csrf_token():
            flash('Form submission expired or invalid. Please try again.', 'danger')
            logger.warning(f"Login attempt failed: CSRF validation failed for user '{request.form.get('username', '')}'")
            return render_template('auth/login.html', form=form)
        
        try:
            # Get form data directly from request.form
            username = request.form.get('username')
            password = request.form.get('password')
            remember = request.form.get('remember', False, type=bool)
            
            logger.debug(f"Form data extracted - Username: {username}, Remember: {remember}, Password: {'*****' if password else 'None'}")
            
            # Basic validation that required fields are present
            if not username or not password:
                logger.debug("Validation failed: Username or password missing")
                flash('Username and password are required.', 'danger')
                return render_template('auth/login.html', form=form)
            
            logger.debug(f"Looking up user with username: {username}")
            
            # Find user by username
            user = db_session.query(User).filter_by(username=username).first()
            
            logger.debug(f"User lookup result: {'Found' if user else 'Not found'}")
            
            if user:
                logger.debug(f"Found user: ID={user.id}, Username={user.username}, Is_admin={user.is_admin}")
            
            # Check if user exists and password is correct
            password_correct = False
            if user:
                logger.debug("Verifying password...")
                try:
                    password_correct = check_password(user.password_hash, password)
                    logger.debug(f"Password verification result: {'Correct' if password_correct else 'Incorrect'}")
                except Exception as e:
                    logger.error(f"Password verification error: {str(e)}", exc_info=True)
            
            # Validation
            if user and password_correct:
                logger.debug("Login successful, calling login_user()")
                
                # Standardize on Flask-Login
                login_user(user, remember=remember)
                session.permanent = True
                
                # Log successful login
                logger.info(f"User '{user.username}' logged in successfully")
                flash('Login successful!', 'success')
                
                return redirect(request.args.get('next') or url_for('main.index'))
            else:
                # Log failed login attempt
                failure_reason = "Invalid password" if user else "User not found"
                logger.warning(f"Failed login attempt: {failure_reason} for username '{username}'")
        except Exception as e:
            logger.error(f"Unexpected error during login processing: {str(e)}", exc_info=True)
            flash('An unexpected error occurred during login.', 'danger')
    
    # For GET requests, just render the login form
    return render_template('auth/login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    # Log the logout event before actually logging out
    logger.info(f"User '{current_user.username}' logged out")
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))

@auth.route('/profile')
@login_required
def profile():
    return render_template('auth/profile.html')

@auth.route('/change-password', methods=['GET', 'POST'])
@login_required
def change_password():
    form = ChangePasswordForm()
    
    if form.validate_on_submit():
        # Validate CSRF token for password change
        if not validate_csrf_token():
            flash('Form submission expired or invalid. Please try again.', 'danger')
            return render_template('auth/change_password.html', form=form)
        
        # Verify current password
        if not check_password(current_user.password_hash, form.current_password.data):
            # Log failed password change attempt
            logger.warning(f"Failed password change attempt for user '{current_user.username}': incorrect current password")
            flash('Current password is incorrect.', 'danger')
        else:
            try:
                # Update password
                current_user.password_hash = hash_password(form.new_password.data)
                db_session.commit()
                # Log successful password change
                current_app.logger.info(f"Password changed successfully for user '{current_user.username}'")
                flash('Password changed successfully!', 'success')
                return redirect(url_for('auth.profile'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error changing password: {str(e)}', 'danger')
    
    return render_template('auth/change_password.html', form=form)

# User management functionality moved to admin.py


