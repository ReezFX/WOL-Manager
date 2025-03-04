from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from sqlalchemy import desc
from app import db_session
from app.models import Host
from app.forms import HostForm
import re

host = Blueprint('host', __name__, url_prefix='/hosts')

# MAC address validation regex pattern
MAC_PATTERN = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')

@host.route('/', methods=['GET'])
@login_required
def list_hosts():
    """List all hosts with pagination"""
    page = request.args.get('page', 1, type=int)
    per_page = current_app.config.get('HOSTS_PER_PAGE', 10)
    
    # Get hosts query with pagination
    query = db_session.query(Host)
    
    # Filter by current user unless admin
    if not current_user.is_admin:
        query = query.filter_by(created_by=current_user.id)
    
    # Order by recently created first
    query = query.order_by(desc(Host.created_at))
    
    # Apply pagination
    total = query.count()
    query = query.limit(per_page).offset((page - 1) * per_page)
    hosts = query.all()
    
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
            
        @property
        def items(self):
            return hosts

    pagination = Pagination(page, per_page, total)
    
    return render_template('host/host_list.html', hosts=hosts, pagination=pagination)

@host.route('/add', methods=['GET', 'POST'])
@login_required
def add_host():
    """Add a new host"""
    form = HostForm()
    
    if form.validate_on_submit():
        # Check if host with same MAC already exists
        existing_host = db_session.query(Host).filter_by(mac_address=form.mac_address.data).first()
        if existing_host:
            flash(f'A host with MAC address {form.mac_address.data} already exists', 'danger')
            return render_template('host/host_form.html', form=form, title='Add Host')
        
        # Create new host
        new_host = Host(
            name=form.name.data,
            mac_address=form.mac_address.data,
            ip=form.ip_address.data if form.ip_address.data else '',
            description=form.description.data if form.description.data else '',
            created_by=current_user.id
        )
        
        try:
            db_session.add(new_host)
            db_session.commit()
            flash(f'Host {form.name.data} added successfully', 'success')
            return redirect(url_for('host.list_hosts'))
        except Exception as e:
            db_session.rollback()
            flash(f'Error adding host: {str(e)}', 'danger')
    
    return render_template('host/host_form.html', form=form, title='Add Host')

@host.route('/edit/<int:host_id>', methods=['GET', 'POST'])
@login_required
def edit_host(host_id):
    """Edit an existing host"""
    host = db_session.query(Host).get(host_id)
    
    if not host:
        flash('Host not found', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if user is allowed to edit this host
    if not current_user.is_admin and host.created_by != current_user.id:
        flash('You do not have permission to edit this host', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Create form and set hidden id field
    form = HostForm()
    # Add an ID field dynamically for the template to differentiate edit/add
    form.id = host_id
    
    if request.method == 'GET':
        # Pre-populate form with existing host data
        form.name.data = host.name
        form.mac_address.data = host.mac_address
        form.ip_address.data = host.ip
        form.description.data = host.description
    
    if form.validate_on_submit():
        # Check if MAC address already exists for a different host
        if form.mac_address.data != host.mac_address:
            existing_host = db_session.query(Host).filter_by(mac_address=form.mac_address.data).first()
            if existing_host and existing_host.id != host_id:
                flash(f'Another host with MAC address {form.mac_address.data} already exists', 'danger')
                return render_template('host/host_form.html', form=form, title='Edit Host')
        
        # Update host
        host.name = form.name.data
        host.mac_address = form.mac_address.data
        host.ip = form.ip_address.data if form.ip_address.data else ''
        host.description = form.description.data if form.description.data else ''
        
        try:
            db_session.commit()
            flash(f'Host {form.name.data} updated successfully', 'success')
            return redirect(url_for('host.list_hosts'))
        except Exception as e:
            db_session.rollback()
            flash(f'Error updating host: {str(e)}', 'danger')
    
    return render_template('host/host_form.html', form=form, title='Edit Host')

@host.route('/delete/<int:host_id>', methods=['POST'])
@login_required
def delete_host(host_id):
    """Delete a host"""
    host = db_session.query(Host).get(host_id)
    
    if not host:
        flash('Host not found', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    # Check if user is allowed to delete this host
    if not current_user.is_admin and host.created_by != current_user.id:
        flash('You do not have permission to delete this host', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    try:
        db_session.delete(host)
        db_session.commit()
        flash(f'Host {host.name} deleted successfully', 'success')
    except Exception as e:
        db_session.rollback()
        flash(f'Error deleting host: {str(e)}', 'danger')
    
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
    if not current_user.is_admin and host.created_by != current_user.id:
        flash('You do not have permission to view this host', 'danger')
        return redirect(url_for('host.list_hosts'))
    
    return render_template('host/view.html', host=host)

