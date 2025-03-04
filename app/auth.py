from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash
from functools import wraps
import bcrypt
from sqlalchemy.exc import SQLAlchemyError

from app.models import User
from app import db_session
from app.forms import LoginForm, RegistrationForm

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

@auth.route('/register', methods=['GET', 'POST'])
def register():
    # If user is already logged in, redirect to dashboard
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    # Create registration form
    form = RegistrationForm()
    
    # Handle form submission
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
                    role='user'  # Default role for new registrations
                )
                db_session.add(new_user)
                db_session.commit()
                
                flash('Registration successful! You can now log in.', 'success')
                return redirect(url_for('auth.login'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error creating user: {str(e)}', 'danger')
            except ValueError as e:
                flash(str(e), 'danger')
    
    return render_template('auth/register.html', form=form)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    # If user is already logged in, redirect to dashboard
    if current_user.is_authenticated:
        return redirect(url_for('main.dashboard'))
    
    # Create login form
    form = LoginForm()
    
    # Handle form submission
    if form.validate_on_submit():
        username = form.username.data
        password = form.password.data
        remember = form.remember.data
        
        # Find user by username
        user = db_session.query(User).filter_by(username=username).first()
        
        # Check if user exists and password is correct
        if user and check_password(user.password_hash, password):
            login_user(user, remember=remember)
            flash('Login successful!', 'success')
            
            # Redirect to the page user was trying to access, or default to dashboard
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('main.dashboard'))
        else:
            flash('Invalid username or password.', 'danger')
    
    return render_template('auth/login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
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
    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')
        
        # Basic validation
        error = None
        if not current_password:
            error = 'Current password is required.'
        elif not new_password:
            error = 'New password is required.'
        elif new_password != confirm_password:
            error = 'New passwords do not match.'
        elif len(new_password) < 8:
            error = 'New password must be at least 8 characters long.'
        
        # Verify current password
        if not error and not check_password(current_user.password_hash, current_password):
            error = 'Current password is incorrect.'
        
        if error:
            flash(error, 'danger')
        else:
            try:
                # Update password
                current_user.password_hash = hash_password(new_password)
                db_session.commit()
                flash('Password changed successfully!', 'success')
                return redirect(url_for('auth.profile'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error changing password: {str(e)}', 'danger')
    
    return render_template('auth/change_password.html')

# User management functionality moved to admin.py

