from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, session
from flask_login import login_user, logout_user, login_required, current_user
import logging
import sys
import traceback
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
from app.auth_logger import log_login_attempt, log_logout, log_password_change
from flask_wtf.csrf import validate_csrf, ValidationError as CSRFValidationError

# Create the auth blueprint
auth = Blueprint('auth', __name__)

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
        current_app.logger.warning('CSRF validation failed: No token provided')
        return False
    
    try:
        validate_csrf(token)
        return True
    except CSRFValidationError as e:
        current_app.logger.warning(f'CSRF validation failed: {str(e)}')
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
    print("==== LOGIN ROUTE STARTED ====")
    current_app.logger.debug("==== LOGIN ROUTE STARTED ====")
    
    # Debug request details
    print(f"Request method: {request.method}")
    print(f"Request headers: {dict(request.headers)}")
    print(f"Request cookies: {request.cookies}")
    print(f"Request form data: {request.form}")
    print(f"Request args: {request.args}")
    
    current_app.logger.debug(f"Request method: {request.method}")
    current_app.logger.debug(f"Request headers: {dict(request.headers)}")
    current_app.logger.debug(f"Request cookies: {request.cookies}")
    current_app.logger.debug(f"Request form data: {request.form}")
    current_app.logger.debug(f"Request args: {request.args}")
    
    # If user is already logged in, redirect to index page
    if current_user.is_authenticated:
        print("User already authenticated, redirecting to index")
        current_app.logger.debug("User already authenticated, redirecting to index")
        return redirect(url_for('main.index'))
    
    # Create login form
    form = LoginForm()
    print(f"Created login form, CSRF enabled: {current_app.config.get('WTF_CSRF_ENABLED', True)}")
    current_app.logger.debug(f"Created login form, CSRF enabled: {current_app.config.get('WTF_CSRF_ENABLED', True)}")
    
    # Debug session info
    print(f"Session cookie name: {current_app.config.get('SESSION_COOKIE_NAME')}")
    print(f"Session cookie domain: {current_app.config.get('SESSION_COOKIE_DOMAIN')}")
    print(f"Session cookie path: {current_app.config.get('SESSION_COOKIE_PATH')}")
    print(f"Session cookie secure: {current_app.config.get('SESSION_COOKIE_SECURE')}")
    print(f"Session cookie samesite: {current_app.config.get('SESSION_COOKIE_SAMESITE')}")
    
    current_app.logger.debug(f"Session cookie name: {current_app.config.get('SESSION_COOKIE_NAME')}")
    current_app.logger.debug(f"Session cookie domain: {current_app.config.get('SESSION_COOKIE_DOMAIN')}")
    current_app.logger.debug(f"Session cookie path: {current_app.config.get('SESSION_COOKIE_PATH')}")
    current_app.logger.debug(f"Session cookie secure: {current_app.config.get('SESSION_COOKIE_SECURE')}")
    current_app.logger.debug(f"Session cookie samesite: {current_app.config.get('SESSION_COOKIE_SAMESITE')}")
    
    # Handle POST request
    if request.method == 'POST':
        print("Processing POST request for login")
        current_app.logger.debug("Processing POST request for login")
        
        # Validate CSRF token for login form
        if not validate_csrf_token():
            flash('Form submission expired or invalid. Please try again.', 'danger')
            log_login_attempt(None, False, "CSRF validation failed", attempted_username=request.form.get('username', ''))
            return render_template('auth/login.html', form=form)
        
        try:
            # Get form data directly from request.form
            username = request.form.get('username')
            password = request.form.get('password')
            remember = request.form.get('remember', False, type=bool)
            
            print(f"Form data extracted - Username: {username}, Remember: {remember}, Password: {'*****' if password else 'None'}")
            current_app.logger.debug(f"Form data extracted - Username: {username}, Remember: {remember}, Password: {'*****' if password else 'None'}")
            
            # Basic validation that required fields are present
            if not username or not password:
                print("Validation failed: Username or password missing")
                current_app.logger.debug("Validation failed: Username or password missing")
                flash('Username and password are required.', 'danger')
                return render_template('auth/login.html', form=form)
            
            print(f"Looking up user with username: {username}")
            current_app.logger.debug(f"Looking up user with username: {username}")
            
            # Find user by username
            user = db_session.query(User).filter_by(username=username).first()
            
            print(f"User lookup result: {'Found' if user else 'Not found'}")
            current_app.logger.debug(f"User lookup result: {'Found' if user else 'Not found'}")
            
            if user:
                print(f"Found user: ID={user.id}, Username={user.username}, Is_admin={user.is_admin}")
                current_app.logger.debug(f"Found user: ID={user.id}, Username={user.username}, Is_admin={user.is_admin}")
            
            # Check if user exists and password is correct
            password_correct = False
            if user:
                print("Verifying password...")
                current_app.logger.debug("Verifying password...")
                try:
                    password_correct = check_password(user.password_hash, password)
                    print(f"Password verification result: {'Correct' if password_correct else 'Incorrect'}")
                    current_app.logger.debug(f"Password verification result: {'Correct' if password_correct else 'Incorrect'}")
                except Exception as e:
                    print(f"Password verification error: {str(e)}")
                    current_app.logger.debug(f"Password verification error: {str(e)}")
                    traceback.print_exc()
            
            # Validation
            if user and password_correct:
                print("Login successful, calling login_user()")
                current_app.logger.debug("Login successful, calling login_user()")
                
                # Standardize on Flask-Login
                login_user(user, remember=remember)
                session.permanent = True
                
                # Log successful login
                log_login_attempt(user, True, notes="Standardized login")
                flash('Login successful!', 'success')
                
                return redirect(request.args.get('next') or url_for('main.index'))
            else:
                # Log failed login attempt
                failure_reason = "Invalid password" if user else "User not found"
                log_login_attempt(None if not user else user, False, 
                                 failure_reason, attempted_username=username,
                                 notes="Failed login")
                flash('Invalid username or password.', 'danger')
        except Exception as e:
            print(f"Unexpected error during login processing: {str(e)}")
            current_app.logger.debug(f"Unexpected error during login processing: {str(e)}")
            traceback.print_exc()
            flash('An unexpected error occurred during login.', 'danger')
    
    # For GET requests, just render the login form
    return render_template('auth/login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    # Log the logout event before actually logging out
    log_logout(current_user)
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
            log_password_change(current_user, is_reset=False, admin_user=None)
            flash('Current password is incorrect.', 'danger')
        else:
            try:
                # Update password
                current_user.password_hash = hash_password(form.new_password.data)
                db_session.commit()
                # Log successful password change
                log_password_change(current_user, is_reset=False, admin_user=None)
                flash('Password changed successfully!', 'success')
                return redirect(url_for('auth.profile'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error changing password: {str(e)}', 'danger')
    
    return render_template('auth/change_password.html', form=form)

# User management functionality moved to admin.py


