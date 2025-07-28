from flask import render_template, abort, current_app, request, redirect, url_for, flash, jsonify
from app.models import Host, WolLog, db_session
from datetime import datetime
from app.utils import validate_public_access_token
from . import bp
from app.wol import send_magic_packet
from flask_wtf import FlaskForm

@bp.route('/host/<token>')
def public_host_view(token):
    """
    Public view endpoint for hosts with public access enabled.
    """
    # Validate token format first
    if not validate_public_access_token(token):
        abort(404)
    
    # Look up host by token
    host = db_session.query(Host).filter_by(
        public_access_token=token,
        public_access=True
    ).first()
    
    if not host:
        abort(404)
    
    # Log the access
    current_app.logger.info(
        f"Public access to host {host.id} from IP {request.remote_addr}"
    )
    
    return render_template(
        'public/host_public_view.html',
        host=host
    )


@bp.route('/host/wake', methods=['POST'])
def wake_host():
    """
    Public endpoint to wake a host with public access enabled.
    """
    # Check CSRF token
    form = FlaskForm()
    if not form.validate_on_submit():
        abort(400)  # Bad request if CSRF validation fails
    
    # Get host_id from the form
    host_id = request.form.get('host_id')
    if not host_id:
        abort(400)  # Bad request if host_id is missing
    
    try:
        host_id = int(host_id)
    except ValueError:
        abort(400)  # Bad request if host_id is not an integer
    
    # Look up host and validate it has public access enabled
    host = db_session.query(Host).filter_by(
        id=host_id,
        public_access=True
    ).first()
    
    if not host:
        abort(404)  # Not found if host doesn't exist or doesn't have public access
    
    # Log the wake attempt
    current_app.logger.info(
        f"Public wake attempt for host {host.id} ({host.name}) from IP {request.remote_addr}"
    )
    
    # Record start time for response time calculation
    start_time = datetime.now()
    success = send_magic_packet(host.mac_address)
    end_time = datetime.now()
    
    # Calculate response time in milliseconds
    response_time = int((end_time - start_time).total_seconds() * 1000)
    
    # Log the WoL attempt to the database for statistics (no user_id for public access)
    try:
        wol_log = WolLog(
            device_id=host_id,
            timestamp=start_time,
            success=success,
            response_time=response_time,
            user_id=None  # Public access has no user
        )
        db_session.add(wol_log)
        
        if success:
            # Update the last wake time
            host.last_wake_time = start_time
            flash('Wake-on-LAN packet sent successfully.', 'success')
        else:
            flash('Failed to send Wake-on-LAN packet.', 'danger')
        
        # Commit all changes
        db_session.commit()
        
    except Exception as e:
        current_app.logger.error(f"Failed to log public WoL attempt for host {host_id}: {str(e)}")
        db_session.rollback()
        
        # Still show user feedback even if logging fails
        if success:
            flash('Wake-on-LAN packet sent successfully.', 'success')
        else:
            flash('Failed to send Wake-on-LAN packet.', 'danger')
    
    # Redirect back to the public view
    return redirect(url_for('public.public_host_view', token=host.public_access_token))


@bp.route('/host/<token>/status')
def get_host_status(token):
    """
    Public endpoint to get the status of a host with public access enabled.
    """
    # Validate token format first
    if not validate_public_access_token(token):
        return jsonify({"error": "Invalid token"}), 404
    
    # Look up host by token
    host = db_session.query(Host).filter_by(
        public_access_token=token,
        public_access=True
    ).first()
    
    if not host:
        return jsonify({"error": "Host not found"}), 404
    
    # Get host status from Redis
    from app.ping_service import get_host_status
    status_data = get_host_status(host.id)
    
    return jsonify({
        "host_id": host.id,
        "name": host.name,
        "status": status_data["status"],
        "last_check": status_data["last_check"]
    })
