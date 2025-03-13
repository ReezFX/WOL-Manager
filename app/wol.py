import socket
import re
from datetime import datetime, timedelta
from collections import defaultdict
from functools import lru_cache
from flask import Blueprint, request, flash, redirect, url_for, render_template
from flask_login import login_required, current_user
from flask_wtf import FlaskForm

from app.models import Host
from app import db_session

# Create blueprint
wol = Blueprint('wol', __name__, url_prefix='/wol')

class CSRFForm(FlaskForm):
    """A simple form that provides CSRF protection."""
    pass


# Rate limiting storage - in a production app, this would use Redis or similar
# Format: {user_id: [(timestamp1), (timestamp2), ...]}
wake_attempts = defaultdict(list)
# Maximum number of wake attempts per user within time window
MAX_ATTEMPTS = 10
# Time window for rate limiting (in seconds)
TIME_WINDOW = 60 * 5  # 5 minutes

def send_magic_packet(mac_address, broadcast_ip='255.255.255.255', port=9):
    """
    Sends a magic packet to wake a host with the given MAC address.
    
    Args:
        mac_address (str): MAC address of the target device
        broadcast_ip (str): Broadcast IP address (default: 255.255.255.255)
        port (int): UDP port to send the packet (default: 9)
        
    Returns:
        bool: True if packet was sent successfully, False otherwise
    """
    try:
        # Clean the MAC address by removing any separators
        mac_clean = mac_address.replace(':', '').replace('-', '').replace('.', '')
        
        # Validate MAC address format
        if len(mac_clean) != 12:
            raise ValueError("Invalid MAC address format")
        
        # Convert MAC address to bytes
        mac_bytes = bytes.fromhex(mac_clean)
        
        # Create the magic packet (FF FF FF FF FF FF followed by MAC repeated 16 times)
        packet = b'\xff' * 6 + mac_bytes * 16
        
        # Create a UDP socket
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            sock.sendto(packet, (broadcast_ip, port))
            
        return True
    except ValueError:
        return False
    except Exception:
        return False
def check_rate_limit(user_id):
    """
    Check if a user has exceeded the rate limit for wake attempts.
    
    Args:
        user_id (int): The ID of the user to check
        
    Returns:
        bool: True if rate limit is exceeded, False otherwise
    """
    global wake_attempts
    
    now = datetime.now()
    cutoff_time = now - timedelta(seconds=TIME_WINDOW)
    
    # Efficiently remove attempts outside the time window and count recent attempts
    recent_attempts = [ts for ts in wake_attempts[user_id] if ts > cutoff_time]
    wake_attempts[user_id] = recent_attempts
    
    # Check if the user has exceeded the maximum number of attempts
    if len(recent_attempts) >= MAX_ATTEMPTS:
        return True
    
    # Add the current attempt
    wake_attempts[user_id].append(now)
    return False
def check_host_permission(host, user):
    """
    Check if a user has permission to access or wake a host.
    
    Args:
        host (Host): The host to check
        user: The current user
        
    Returns:
        bool: True if user has permission, False otherwise
    """
    # 1. User is the creator of the host
    if host.created_by == user.id:
        return True
    
    # 2. User has the 'send_wol' permission
    if user.has_permission('send_wol'):
        return True
    
    # 3. User is an admin
    if user.is_admin:
        return True
    
    # 4. Host is visible to the user's roles
    if host.visible_to_roles:
        user_role_ids = {str(role.id) for role in user.roles}  # Using set for O(1) lookups
        host_visible_roles = {str(role_id) for role_id in host.visible_to_roles}
        
        # Check if any of the user's roles are in the host's visible_to_roles
        if user_role_ids.intersection(host_visible_roles):
            return True
    
    return False


@wol.route('/wake/<int:host_id>', methods=['POST'])
@login_required
def wake_host(host_id):
    """
    Route to wake a host by ID.
    
    Args:
        host_id (int): ID of the host to wake
        
    Returns:
        Redirect to the host list or dashboard
    """
    # Check if the user has exceeded the rate limit
    if check_rate_limit(current_user.id):
        flash('You have exceeded the rate limit for wake attempts. Please try again later.', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Get the host
    host = db_session.query(Host).get(host_id)
    if not host:
        flash('Host not found.', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if the user has permission to wake this host
    if not check_host_permission(host, current_user):
        flash('You do not have permission to wake this host.', 'danger')
        return redirect(url_for('host.list_hosts'))
    # Attempt to wake the host
    success = send_magic_packet(host.mac_address)
    
    # Show a success or error message
    if success:
        flash(f'Wake-on-LAN packet sent to {host.name} ({host.mac_address}).', 'success')
    else:
        flash(f'Failed to send Wake-on-LAN packet to {host.name}.', 'danger')
    
    # Redirect to the host list
    return redirect(url_for('host.list_hosts'))


@wol.route('/send/<int:host_id>', methods=['GET'])
@login_required
def wol_send(host_id):
    """
    Show confirmation page before sending a WOL packet.
    
    Args:
        host_id (int): ID of the host to wake
        
    Returns:
        Rendered template with host details
    """
    # Create a CSRF form instance for protection
    csrf_form = CSRFForm()
    
    host = db_session.query(Host).get(host_id)
    if not host:
        flash('Host not found.', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if the user has permission to wake this host
    # Check if the user has permission to wake this host
    has_permission = False
    
    # 1. User is the creator of the host
    if host.created_by == current_user.id:
        has_permission = True
    # 2. User has the 'send_wol' permission
    elif current_user.has_permission('send_wol'):
        has_permission = True
    # 3. User is an admin
    elif current_user.is_admin:
        has_permission = True
    # 4. Host is visible to the user's roles
    elif host.visible_to_roles:
        # Get the user's role IDs
        user_role_ids = [str(role.id) for role in current_user.roles]
        # Get the host's visible_to_roles (ensuring they're strings)
        host_visible_roles = [str(role_id) for role_id in host.visible_to_roles]
        # Check if any of the user's roles are in the host's visible_to_roles
        for role_id in user_role_ids:
            if role_id in host_visible_roles:
                has_permission = True
                break
    
    if not has_permission:
        flash('You do not have permission to wake this host.', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    return render_template('wol/wol_send.html', host=host, csrf_form=csrf_form)


@wol.route('/logs')
@login_required
def view_logs():
    """
    View wake attempt logs.
    
    Returns:
        Rendered template with logs
    """
    # Logs functionality has been removed
    message = "The logging functionality has been removed from the application."
    return render_template('wol/logs.html', message=message, title="Wake-on-LAN Logs")


@wol.route('/test', methods=['GET', 'POST'])
@login_required
def test_wol():
    """
    Test page for sending magic packets directly by MAC address.
    Only available to admin users.
    
    Returns:
        Rendered template or redirect
    """
    # Check if the user is an admin
    if not current_user.is_admin:
        flash('You do not have permission to access this page.', 'danger')
        return redirect(url_for('main.dashboard'))
    
    # Create a CSRF form instance for protection
    form = CSRFForm()
    
    mac_error = None
    ip_error = None
    
    if request.method == 'POST':
        mac_address = request.form.get('mac_address', '')
        broadcast = request.form.get('broadcast', '255.255.255.255')
        
        # Validate MAC address format
        if not is_valid_mac(mac_address):
            mac_error = 'Invalid MAC address format. Use format XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX.'
            return render_template('wol/test.html', mac_error=mac_error, ip_error=ip_error, form=form)
        
        # Validate IP address format
        try:
            socket.inet_aton(broadcast)
        except socket.error:
            ip_error = 'Invalid broadcast IP address format.'
            return render_template('wol/test.html', mac_error=mac_error, ip_error=ip_error, mac_address=mac_address, form=form)
        
        # Attempt to wake the host
        success = send_magic_packet(mac_address, broadcast)
        
        # Show a success or error message
        if success:
            flash(f'Wake-on-LAN packet sent to {mac_address}.', 'success')
        else:
            flash(f'Failed to send Wake-on-LAN packet to {mac_address}.', 'danger')
    
    return render_template('wol/test.html', mac_error=mac_error, ip_error=ip_error, title="Test Wake-on-LAN", form=form)


def is_valid_mac(mac_address):
    """
    Validate MAC address format.
    
    Args:
        mac_address (str): MAC address to validate
        
    Returns:
        bool: True if valid, False otherwise
    """
    # re is already imported at the top of the file
    # Regular expression for MAC address validation
    # Matches formats: AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABBCCDDEEFF
    pattern = r'^([0-9A-Fa-f]{2}[:-]?){5}([0-9A-Fa-f]{2})$'
    return bool(re.match(pattern, mac_address))

