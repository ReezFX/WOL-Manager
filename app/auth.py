from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app
from flask_login import login_user, logout_user, login_required, current_user
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
    form = ChangePasswordForm()
    
    if form.validate_on_submit():
        # Verify current password
        if not check_password(current_user.password_hash, form.current_password.data):
            flash('Current password is incorrect.', 'danger')
        else:
            try:
                # Update password
                current_user.password_hash = hash_password(form.new_password.data)
                db_session.commit()
                flash('Password changed successfully!', 'success')
                return redirect(url_for('auth.profile'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error changing password: {str(e)}', 'danger')
    
    return render_template('auth/change_password.html', form=form)

# User management functionality moved to admin.py

