from flask import Blueprint, render_template, redirect, url_for, flash, request, current_app, session, jsonify
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
import pyotp
import qrcode
from io import BytesIO
import base64
import secrets
import string
from datetime import datetime, timedelta
import hashlib

from app.models import User, Role
from app import db_session
from app.forms import LoginForm, TwoFactorForm, BackupCodeForm, TwoFactorSetupForm, TwoFactorDisableForm
from flask_wtf.csrf import validate_csrf, ValidationError as CSRFValidationError

# Create the auth blueprint
auth = Blueprint('auth', __name__)

# Configure module-level logger
logger = get_logger('app.auth')
access_logger = get_logger('app.access')

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
        access_logger.warning('CSRF validation failed: No token provided')
        return False
    
    try:
        validate_csrf(token)
        return True
    except CSRFValidationError as e:
        access_logger.warning(f'CSRF validation failed: {str(e)}')
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
            access_logger.warning(f"Login attempt failed: CSRF validation failed for user '{request.form.get('username', '')}'")
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
                session['remember_me'] = remember
                
                # Check if user has 2FA enabled
                if user.twofa_enabled:
                    # Check for trusted device token
                    device_token = request.cookies.get('device_token')
                    if device_token and verify_device_token(user, device_token):
                        # Device is trusted, skip 2FA
                        session['2fa_verified'] = True
                        access_logger.info(f"User '{user.username}' logged in with trusted device")
                        flash('Login successful!', 'success')
                        return redirect(request.args.get('next') or url_for('main.index'))
                    else:
                        # Require 2FA verification
                        session['2fa_verified'] = False
                        access_logger.info(f"User '{user.username}' requires 2FA verification")
                        return redirect(url_for('auth.verify_2fa'))
                else:
                    # No 2FA, proceed normally
                    session['2fa_verified'] = True  # Mark as verified for consistency
                    access_logger.info(f"User '{user.username}' logged in successfully")
                    flash('Login successful!', 'success')
                    return redirect(request.args.get('next') or url_for('main.index'))
            else:
                # Log failed login attempt
                failure_reason = "Invalid password" if user else "User not found"
                access_logger.warning(f"Failed login attempt: {failure_reason} for username '{username}'")
        except Exception as e:
            logger.error(f"Unexpected error during login processing: {str(e)}", exc_info=True)
            flash('An unexpected error occurred during login.', 'danger')
    
    # For GET requests, just render the login form
    return render_template('auth/login.html', form=form)

@auth.route('/logout')
@login_required
def logout():
    # Log the logout event before actually logging out
    access_logger.info(f"User '{current_user.username}' logged out")
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
            access_logger.warning(f"Failed password change attempt for user '{current_user.username}': incorrect current password")
            flash('Current password is incorrect.', 'danger')
        else:
            try:
                # Update password
                current_user.password_hash = hash_password(form.new_password.data)
                db_session.commit()
                # Log successful password change
                access_logger.info(f"Password changed successfully for user '{current_user.username}'")
                flash('Password changed successfully!', 'success')
                return redirect(url_for('auth.profile'))
            except SQLAlchemyError as e:
                db_session.rollback()
                flash(f'Error changing password: {str(e)}', 'danger')
    
    return render_template('auth/change_password.html', form=form)

# User management functionality moved to admin.py


@auth.route('/api/refresh-csrf-token', methods=['GET'])
@login_required
def refresh_csrf_token():
    """
    API endpoint for refreshing CSRF tokens.
    
    This endpoint:
    1. Only works for authenticated users (enforced by login_required)
    2. Returns a new CSRF token
    3. Sets appropriate security headers
    
    Returns:
        JSON response with the new CSRF token
    """
    from flask import jsonify, current_app
    from flask_wtf.csrf import generate_csrf
    
    # Generate a new CSRF token
    token = generate_csrf()
    
    # Log the token refresh event
    access_logger.info(f"CSRF token refreshed for user '{current_user.username}'")
    
    # Create response with the new token
    response = jsonify({'status': 'success', 'csrf_token': token})
    
    # Add security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    
    if request.is_secure:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000'
    
    return response


# ============================================
# 2FA Helper Functions
# ============================================

def generate_backup_codes(count=10):
    """Generate a list of backup codes for 2FA."""
    codes = []
    for _ in range(count):
        # Generate 8-character codes in format XXXX-XXXX
        code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
        formatted_code = f"{code[:4]}-{code[4:]}"
        codes.append(formatted_code)
    return codes


def generate_device_token():
    """Generate a secure token for trusted devices."""
    return secrets.token_urlsafe(32)


def verify_device_token(user, token):
    """Verify if a device token is valid and not expired."""
    if not user.twofa_trusted_devices:
        return False
    
    current_time = datetime.utcnow()
    for device in user.twofa_trusted_devices:
        if device['token'] == token:
            # Check if token is expired (30 days)
            expiry = datetime.fromisoformat(device['expiry'])
            if current_time < expiry:
                return True
            else:
                # Remove expired token
                user.twofa_trusted_devices.remove(device)
                db_session.commit()
    return False


def add_trusted_device(user, token, device_info=None):
    """Add a trusted device token to user's account."""
    if not user.twofa_trusted_devices:
        user.twofa_trusted_devices = []
    
    # Remove any existing token for this device (based on user agent)
    user_agent = request.headers.get('User-Agent', 'Unknown')
    user.twofa_trusted_devices = [
        d for d in user.twofa_trusted_devices 
        if d.get('user_agent') != user_agent
    ]
    
    device = {
        'token': token,
        'added': datetime.utcnow().isoformat(),
        'expiry': (datetime.utcnow() + timedelta(days=30)).isoformat(),
        'user_agent': user_agent,
        'ip': request.remote_addr,
        'info': device_info or 'Trusted Device'
    }
    
    user.twofa_trusted_devices.append(device)
    db_session.commit()


def generate_qr_code(user, secret):
    """Generate QR code for 2FA setup."""
    # Create TOTP URI
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user.username,
        issuer_name='WOL Manager'
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


# ============================================
# 2FA Routes
# ============================================

@auth.route('/2fa/verify', methods=['GET', 'POST'])
@login_required
def verify_2fa():
    """Verify 2FA code after successful password authentication."""
    # Check if user has 2FA enabled
    if not current_user.twofa_enabled:
        return redirect(url_for('main.index'))
    
    # Check if already verified in this session
    if session.get('2fa_verified'):
        return redirect(url_for('main.index'))
    
    form = TwoFactorForm()
    
    if form.validate_on_submit():
        otp_code = form.otp_code.data
        trust_device = form.trust_device.data
        
        # Verify OTP code
        totp = pyotp.TOTP(current_user.twofa_secret)
        if totp.verify(otp_code, valid_window=1):  # Allow 30 second window
            # Mark 2FA as verified in session
            session['2fa_verified'] = True
            
            # Handle trusted device
            if trust_device:
                token = generate_device_token()
                add_trusted_device(current_user, token)
                # Set cookie for trusted device
                response = redirect(url_for('main.index'))
                response.set_cookie(
                    'device_token',
                    token,
                    max_age=30*24*60*60,  # 30 days
                    secure=request.is_secure,
                    httponly=True,
                    samesite='Lax'
                )
                
                access_logger.info(f"User '{current_user.username}' verified 2FA and trusted device")
                flash('Two-factor authentication successful. This device has been trusted.', 'success')
                return response
            
            access_logger.info(f"User '{current_user.username}' verified 2FA")
            flash('Two-factor authentication successful!', 'success')
            return redirect(url_for('main.index'))
        else:
            access_logger.warning(f"Failed 2FA verification for user '{current_user.username}'")
            flash('Invalid verification code. Please try again.', 'danger')
    
    return render_template('auth/two_factor.html', form=form)


@auth.route('/2fa/backup', methods=['POST'])
@login_required
def verify_backup_code():
    """Verify backup code as alternative to OTP."""
    if not current_user.twofa_enabled:
        return redirect(url_for('main.index'))
    
    form = BackupCodeForm()
    
    if form.validate_on_submit():
        backup_code = form.backup_code.data.upper()
        
        # Check if backup code is valid
        if current_user.twofa_backup_codes and backup_code in current_user.twofa_backup_codes:
            # Remove used backup code
            current_user.twofa_backup_codes.remove(backup_code)
            current_user.twofa_last_used_backup = backup_code
            db_session.commit()
            
            # Mark 2FA as verified
            session['2fa_verified'] = True
            
            access_logger.info(f"User '{current_user.username}' used backup code for 2FA")
            flash(f'Backup code verified successfully. You have {len(current_user.twofa_backup_codes)} backup codes remaining.', 'warning')
            return redirect(url_for('main.index'))
        else:
            access_logger.warning(f"Invalid backup code attempt for user '{current_user.username}'")
            flash('Invalid backup code.', 'danger')
    
    return redirect(url_for('auth.verify_2fa'))


@auth.route('/2fa/setup', methods=['GET', 'POST'])
@login_required
def setup_2fa():
    """Setup 2FA for user account."""
    if current_user.twofa_enabled:
        flash('Two-factor authentication is already enabled.', 'info')
        return redirect(url_for('auth.profile'))
    
    form = TwoFactorSetupForm()
    
    # Generate or retrieve secret from session
    if 'temp_2fa_secret' not in session:
        session['temp_2fa_secret'] = pyotp.random_base32()
    
    secret = session['temp_2fa_secret']
    
    if form.validate_on_submit():
        # Verify the code to ensure user has set up their authenticator
        totp = pyotp.TOTP(secret)
        if totp.verify(form.verification_code.data, valid_window=1):
            # Enable 2FA for user
            current_user.twofa_enabled = True
            current_user.twofa_secret = secret
            current_user.twofa_backup_codes = generate_backup_codes()
            db_session.commit()
            
            # Clear temp secret from session
            session.pop('temp_2fa_secret', None)
            
            access_logger.info(f"User '{current_user.username}' enabled 2FA")
            
            # Show backup codes
            return render_template(
                'auth/2fa_setup_complete.html',
                backup_codes=current_user.twofa_backup_codes
            )
        else:
            flash('Invalid verification code. Please try again.', 'danger')
    
    # Generate QR code
    qr_code = generate_qr_code(current_user, secret)
    
    return render_template(
        'auth/2fa_setup.html',
        form=form,
        qr_code=qr_code,
        secret=secret
    )


@auth.route('/2fa/disable', methods=['GET', 'POST'])
@login_required
def disable_2fa():
    """Disable 2FA for user account."""
    if not current_user.twofa_enabled:
        flash('Two-factor authentication is not enabled.', 'info')
        return redirect(url_for('auth.profile'))
    
    form = TwoFactorDisableForm()
    
    if form.validate_on_submit():
        # Verify password
        if check_password(current_user.password_hash, form.password.data):
            # Disable 2FA
            current_user.twofa_enabled = False
            current_user.twofa_secret = None
            current_user.twofa_backup_codes = []
            current_user.twofa_trusted_devices = []
            db_session.commit()
            
            # Clear 2FA session
            session.pop('2fa_verified', None)
            
            access_logger.info(f"User '{current_user.username}' disabled 2FA")
            flash('Two-factor authentication has been disabled.', 'success')
            return redirect(url_for('auth.profile'))
        else:
            flash('Incorrect password.', 'danger')
    
    return render_template('auth/2fa_disable.html', form=form)


@auth.route('/2fa/regenerate-backup-codes', methods=['POST'])
@login_required
def regenerate_backup_codes():
    """Regenerate backup codes for 2FA."""
    if not current_user.twofa_enabled:
        flash('Two-factor authentication is not enabled.', 'danger')
        return redirect(url_for('auth.profile'))
    
    # Generate new backup codes
    current_user.twofa_backup_codes = generate_backup_codes()
    db_session.commit()
    
    access_logger.info(f"User '{current_user.username}' regenerated backup codes")
    
    return render_template(
        'auth/2fa_backup_codes.html',
        backup_codes=current_user.twofa_backup_codes,
        regenerated=True
    )

