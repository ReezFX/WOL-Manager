from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from sqlalchemy import desc, or_
from app import db_session
from app.models import Host, Role, Permission
from app.forms import HostForm
from flask_wtf import FlaskForm
import re
from app.logging_config import get_logger

# Create module-level logger
logger = get_logger('app.host')
access_logger = get_logger('app.access')

host = Blueprint('host', __name__, url_prefix='/hosts')

# Simple form for CSRF protection
class CSRFForm(FlaskForm):
    pass

# MAC address validation regex pattern
MAC_PATTERN = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')

@host.route('/', methods=['GET'])
@login_required
def list_hosts():
    """List all hosts with pagination"""
    # Log access to host list
    access_logger.info(f"Host list accessed by user: {current_user.username} (id: {current_user.id})")
    try:
        page = request.args.get('page', 1, type=int)
        per_page = current_app.config.get('HOSTS_PER_PAGE', 10)
        
        # Get hosts query with pagination
        query = db_session.query(Host)
        
        # Filter by current user unless admin or has specific roles visibility
        if not current_user.is_admin:
            # Get all the role IDs of the current user
            user_role_ids = [role.id for role in current_user.roles]
            # Define filter for hosts created by the current user
            created_by_filter = Host.created_by == current_user.id
            
            try:
                # Find hosts where user's role exists in visible_to_roles
                all_hosts = query.all()
                visible_to_user_hosts = []
                for host in all_hosts:
                    if host.visible_to_roles:
                        logger.debug(f"Host {host.id} ({host.name}) visible_to_roles (raw): {host.visible_to_roles}")
                        # Convert all role IDs to strings for consistent comparison
                        host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
                        logger.debug(f"Host {host.id} ({host.name}) visible_to_roles (processed): {host_role_ids}")
                        
                        # Check if any of the user's role IDs (converted to string) are in the host's visible_to_roles
                        visible_to_this_user = False
                        for role_id in user_role_ids:
                            role_id_str = str(role_id)
                            is_visible = role_id_str in host_role_ids
                            logger.debug(f"Checking if role {role_id} (str: {role_id_str}) is in host {host.id} visible_to_roles: {is_visible}")
                            if is_visible:
                                visible_to_this_user = True
                        
                        if visible_to_this_user:
                            visible_to_user_hosts.append(host.id)
                            logger.debug(f"Host {host.id} ({host.name}) IS visible to user {current_user.id}")
                        else:
                            logger.debug(f"Host {host.id} ({host.name}) is NOT visible to user {current_user.id}")
                
                logger.debug(f"Summary: Hosts visible to user {current_user.id} based on roles: {visible_to_user_hosts}")
                
                # Build query with OR condition
                if visible_to_user_hosts:
                    query = query.filter(or_(
                        created_by_filter,
                        Host.id.in_(visible_to_user_hosts)
                    ))
                else:
                    # If no visible hosts found, just filter by created_by
                    query = query.filter(created_by_filter)
            except Exception as e:
                logger.error(f"Error filtering hosts by visible_to_roles: {str(e)}")
                # Fallback to just showing hosts created by the user
                query = query.filter(created_by_filter)
                flash(f"Limited visibility due to an error: {str(e)}", "warning")
                    
        # Order by recently created first
        query = query.order_by(desc(Host.created_at))
        
        # Apply pagination
        try:
            total = query.count()
            query = query.limit(per_page).offset((page - 1) * per_page)
            hosts = query.all()
            logger.debug(f"Found {total} hosts for user {current_user.id}, showing page {page}")
        except Exception as e:
            logger.error(f"Error applying pagination: {str(e)}")
            total = 0
            hosts = []
            flash(f"An error occurred while retrieving hosts: {str(e)}", "danger")
    
        # Create a pagination object with the necessary attributes
        class Pagination:
            def __init__(self, page, per_page, total_count):
                self.page = page
                self.per_page = per_page
                self.total_count = total_count
                
            @property
            def pages(self):
                return max(0, self.total_count - 1) // self.per_page + 1
                
            @property
            def has_prev(self):
                return self.page > 1
                
            @property
            def has_next(self):
                return self.page < self.pages
                
            @property
            def prev_num(self):
                return self.page - 1 if self.has_prev else None
                
            @property
            def next_num(self):
                return self.page + 1 if self.has_next else None
            
            def iter_pages(self, left_edge=2, left_current=2, right_current=5, right_edge=2):
                """
                Generates page numbers for pagination controls.
                
                Args:
                    left_edge: Number of pages to show at the beginning
                    left_current: Number of pages to show before current page
                    right_current: Number of pages to show after current page
                    right_edge: Number of pages to show at the end
                
                Returns:
                    A list of page numbers with None to indicate gaps
                """
                last = 0
                for num in range(1, self.pages + 1):
                    # Add left edge pages
                    if num <= left_edge:
                        yield num
                        last = num
                    # Add pages around current page
                    elif (num > self.page - left_current - 1 and 
                          num < self.page + right_current):
                        if last + 1 != num:
                            yield None
                        yield num
                        last = num
                    # Add right edge pages
                    elif num > self.pages - right_edge:
                        if last + 1 != num:
                            yield None
                        yield num
                        last = num
                
            @property
            def items(self):
                return hosts
                
        pagination = Pagination(page, per_page, total)
        csrf_form = CSRFForm()
        return render_template('host/host_list.html', hosts=hosts, pagination=pagination, csrf_form=csrf_form)
    except Exception as e:
        logger.error(f"Unexpected error in list_hosts: {str(e)}")
        flash(f"An unexpected error occurred: {str(e)}", "danger")
        csrf_form = CSRFForm()
        return render_template('host/host_list.html', hosts=[], pagination=Pagination(1, per_page, 0), csrf_form=csrf_form)

@host.route('/add', methods=['GET', 'POST'])
@login_required
def add_host():
    """Add a new host"""
    # Check if user has permission to add hosts
    if not current_user.has_permission('create_host'):
        access_logger.warning(f"Permission denied: User {current_user.username} (id: {current_user.id}) attempted to add a host without permission")
        flash('You do not have permission to add hosts', 'danger')
        return redirect(url_for('host.list_hosts'))
        
    form = HostForm()
    
    # Get all roles to populate the multi-select dropdown
    roles = db_session.query(Role).all()
    
    # Populate the visible_to_roles field choices
    form.visible_to_roles.choices = [(role.id, role.name) for role in roles]
    
    # Initialize visible_to_roles data to empty list for GET requests
    if request.method == 'GET':
        form.visible_to_roles.data = []
    
    if form.validate_on_submit():
        # Check if a host with the same MAC address already exists
        existing_host = db_session.query(Host).filter_by(mac_address=form.mac_address.data).first()
        if existing_host:
            flash(f'A host with MAC address {form.mac_address.data} already exists', 'danger')
            return render_template('host/host_form.html', form=form, title='Add Host', roles=roles)
        
        # Create new host
        # Convert role IDs to strings for consistent storage
        visible_roles = [str(role_id) for role_id in form.visible_to_roles.data]
        
        new_host = Host(
            name=form.name.data,
            mac_address=form.mac_address.data,
            ip=form.ip_address.data if form.ip_address.data else '',
            description=form.description.data if form.description.data else '',
            created_by=current_user.id,
            visible_to_roles=visible_roles
        )
        try:
            db_session.add(new_host)
            db_session.commit()
            access_logger.info(f"Host '{form.name.data}' (MAC: {form.mac_address.data}) created by user: {current_user.username} (id: {current_user.id})")
            flash(f'Host {form.name.data} added successfully', 'success')
            return redirect(url_for('host.list_hosts'))
        except Exception as e:
            db_session.rollback()
            flash(f'Error adding host: {str(e)}', 'danger')
    
    return render_template('host/host_form.html', form=form, title='Add Host', roles=roles)

@host.route('/edit/<int:host_id>', methods=['GET', 'POST'])
@login_required
def edit_host(host_id):
    """Edit an existing host"""
    host = db_session.query(Host).get(host_id)
    
    if not host:
        flash('Host not found', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if user is allowed to edit this host
    is_owner = host.created_by == current_user.id
    has_edit_perm = current_user.has_permission('edit_hosts')
    user_role_ids = [role.id for role in current_user.roles]
    # Convert role IDs to strings for consistent comparison
    if host.visible_to_roles:
        host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
        visible_to_user = any(str(role_id) in host_role_ids for role_id in user_role_ids)
    else:
        visible_to_user = False
    
    if not (has_edit_perm or (is_owner and visible_to_user) or current_user.is_admin):
        access_logger.warning(f"Permission denied: User {current_user.username} (id: {current_user.id}) attempted to edit host {host.id} ({host.name}) without permission")
        flash('You do not have permission to edit this host', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Create form and set hidden id field
    form = HostForm()
    # Add an ID field dynamically for the template to differentiate edit/add
    form.id = host_id
    
    # Get all roles to populate the multi-select dropdown
    roles = db_session.query(Role).all()
    
    # Populate the visible_to_roles field choices
    form.visible_to_roles.choices = [(role.id, role.name) for role in roles]
    
    if request.method == 'GET':
        # Pre-populate form with existing host data
        form.name.data = host.name
        form.mac_address.data = host.mac_address
        form.ip_address.data = host.ip
        form.description.data = host.description
        # Convert string role IDs back to integers for the form
        if host.visible_to_roles:
            form.visible_to_roles.data = [int(role_id) for role_id in host.visible_to_roles]
        else:
            form.visible_to_roles.data = []
    
    if form.validate_on_submit():
        # Check if MAC address already exists for a different host
        if form.mac_address.data != host.mac_address:
            existing_host = db_session.query(Host).filter_by(mac_address=form.mac_address.data).first()
            if existing_host and existing_host.id != host_id:
                flash(f'Another host with MAC address {form.mac_address.data} already exists', 'danger')
                return render_template('host/host_form.html', form=form, title='Edit Host', roles=roles)
        
        # Update host
        host.name = form.name.data
        host.mac_address = form.mac_address.data
        host.ip = form.ip_address.data if form.ip_address.data else ''
        host.description = form.description.data if form.description.data else ''
        
        # Update visible_to_roles
        # Convert role IDs to strings for consistent storage
        host.visible_to_roles = [str(role_id) for role_id in form.visible_to_roles.data]
        
        try:
            db_session.commit()
            access_logger.info(f"Host {host.id} '{form.name.data}' updated by user: {current_user.username} (id: {current_user.id})")
            flash(f'Host {form.name.data} updated successfully', 'success')
            return redirect(url_for('host.list_hosts'))
        except Exception as e:
            db_session.rollback()
            flash(f'Error updating host: {str(e)}', 'danger')
    
    return render_template('host/host_form.html', form=form, title='Edit Host', roles=roles)

@host.route('/delete/<int:host_id>', methods=['POST'])
@login_required
def delete_host(host_id):
    """Delete a host"""
    host = db_session.query(Host).get(host_id)
    
    if not host:
        flash('Host not found', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if user is allowed to delete this host
    is_owner = host.created_by == current_user.id
    has_delete_perm = current_user.has_permission('delete_hosts')
    user_role_ids = [role.id for role in current_user.roles]
    # Convert role IDs to strings for consistent comparison
    if host.visible_to_roles:
        host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
        visible_to_user = any(str(role_id) in host_role_ids for role_id in user_role_ids)
    else:
        visible_to_user = False
    
    if not (has_delete_perm or (is_owner and visible_to_user) or current_user.is_admin):
        access_logger.warning(f"Permission denied: User {current_user.username} (id: {current_user.id}) attempted to delete host {host.id} ({host.name}) without permission")
        flash('You do not have permission to delete this host', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    try:
        db_session.delete(host)
        db_session.commit()
        access_logger.info(f"Host {host.id} '{host.name}' deleted by user: {current_user.username} (id: {current_user.id})")
        flash(f'Host {host.name} deleted successfully', 'success')
    except Exception as e:
        db_session.rollback()
        flash(f'Error deleting host: {str(e)}', 'danger')
    
    # Check request.referrer to determine where the request came from
    referer = request.referrer or ''
    if 'dashboard' in referer:
        # Redirect to dashboard if deletion was initiated from there
        return redirect(url_for('main.dashboard'))
    else:
        # Otherwise redirect to the hosts list page
        return redirect(url_for('host.list_hosts'))

@host.route('/view/<int:host_id>')
@login_required
def view_host(host_id):
    """View details of a host"""
    host = db_session.query(Host).get(host_id)
    
    if not host:
        flash('Host not found', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if user is allowed to view this host
    user_role_ids = [role.id for role in current_user.roles]
    can_view = (current_user.has_permission('view_hosts') or 
                host.created_by == current_user.id or 
                current_user.is_admin or
                (host.visible_to_roles and any(str(role_id) in [str(r) for r in host.visible_to_roles] for role_id in user_role_ids)))
    
    if not can_view:
        access_logger.warning(f"Permission denied: User {current_user.username} (id: {current_user.id}) attempted to view host {host.id} ({host.name}) without permission")
        flash('You do not have permission to view this host', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    access_logger.info(f"Host {host.id} '{host.name}' viewed by user: {current_user.username} (id: {current_user.id})")
    return render_template('host/view.html', host=host)

