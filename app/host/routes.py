from flask import Blueprint, render_template, request, redirect, url_for, flash, current_app
from flask_login import login_required, current_user
from sqlalchemy import desc, or_
from app import db_session
from app.models import Host, Role, Permission
from app.forms import HostForm
import re
import logging

host = Blueprint('host', __name__, url_prefix='/hosts')

# MAC address validation regex pattern
MAC_PATTERN = re.compile(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$')

@host.route('/', methods=['GET'])
@login_required
def list_hosts():
    """List all hosts with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = current_app.config.get('HOSTS_PER_PAGE', 10)
        
        # Get hosts query with pagination
        query = db_session.query(Host)
        
        # Filter by current user unless admin or has specific roles visibility
        if not current_user.is_admin:
            # Get all the role IDs of the current user
            user_role_ids = [role.id for role in current_user.roles]
            user_role_ids_str = [str(role_id) for role_id in user_role_ids]
            logging.info(f"User {current_user.id} roles (int): {user_role_ids}")
            logging.info(f"User {current_user.id} roles (str): {user_role_ids_str}")
            
            # Filter to hosts created by the user OR where user's role is in visible_to_roles
            if not current_user.has_permission('view_all_hosts'):
                # Start with hosts created by the current user
                created_by_filter = (Host.created_by == current_user.id)
                
                # We need a SQLite-compatible approach instead of PostgreSQL's ?| operator
                visible_to_user_hosts = []
                
                try:
                    # Get all hosts to check visible_to_roles
                    all_hosts = db_session.query(Host).all()
                    
                    # Find hosts where user's role exists in visible_to_roles
                    for host in all_hosts:
                        if host.visible_to_roles:
                            logging.info(f"Host {host.id} ({host.name}) visible_to_roles (raw): {host.visible_to_roles}")
                            # Convert all role IDs to strings for consistent comparison
                            host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
                            logging.info(f"Host {host.id} ({host.name}) visible_to_roles (processed): {host_role_ids}")
                            
                            # Check if any of the user's role IDs (converted to string) are in the host's visible_to_roles
                            visible_to_this_user = False
                            for role_id in user_role_ids:
                                role_id_str = str(role_id)
                                is_visible = role_id_str in host_role_ids
                                logging.info(f"Checking if role {role_id} (str: {role_id_str}) is in host {host.id} visible_to_roles: {is_visible}")
                                if is_visible:
                                    visible_to_this_user = True
                            
                            if visible_to_this_user:
                                visible_to_user_hosts.append(host.id)
                                logging.info(f"Host {host.id} ({host.name}) IS visible to user {current_user.id}")
                            else:
                                logging.info(f"Host {host.id} ({host.name}) is NOT visible to user {current_user.id}")
                    
                    logging.info(f"Summary: Hosts visible to user {current_user.id} based on roles: {visible_to_user_hosts}")
                    
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
                    logging.error(f"Error filtering hosts by visible_to_roles: {str(e)}")
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
            logging.debug(f"Found {total} hosts for user {current_user.id}, showing page {page}")
        except Exception as e:
            logging.error(f"Error applying pagination: {str(e)}")
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
        return render_template('host/host_list.html', hosts=hosts, pagination=pagination)
    except Exception as e:
        logging.error(f"Unexpected error in list_hosts: {str(e)}")
        flash(f"An unexpected error occurred: {str(e)}", "danger")
        return render_template('host/host_list.html', hosts=[], pagination=Pagination(1, per_page, 0))

@host.route('/apple', methods=['GET'])
@login_required
def list_hosts_apple():
    """List all hosts with Apple-styled UI"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = current_app.config.get('HOSTS_PER_PAGE', 10)
        
        # Get hosts query with pagination
        query = db_session.query(Host)
        
        # Filter by current user unless admin or has specific roles visibility
        if not current_user.is_admin:
            # Get all the role IDs of the current user
            user_role_ids = [role.id for role in current_user.roles]
            user_role_ids_str = [str(role_id) for role_id in user_role_ids]
            
            # Filter to hosts created by the user OR where user's role is in visible_to_roles
            if not current_user.has_permission('view_all_hosts'):
                # Start with hosts created by the current user
                created_by_filter = (Host.created_by == current_user.id)
                
                # We need a SQLite-compatible approach instead of PostgreSQL's ?| operator
                visible_to_user_hosts = []
                
                try:
                    # Get all hosts to check visible_to_roles
                    all_hosts = db_session.query(Host).all()
                    
                    # Find hosts where user's role exists in visible_to_roles
                    for host in all_hosts:
                        if host.visible_to_roles:
                            # Convert all role IDs to strings for consistent comparison
                            host_role_ids = [str(role_id) for role_id in host.visible_to_roles]
                            
                            # Check if any of the user's role IDs are in the host's visible_to_roles
                            visible_to_this_user = False
                            for role_id in user_role_ids:
                                role_id_str = str(role_id)
                                if role_id_str in host_role_ids:
                                    visible_to_this_user = True
                            
                            if visible_to_this_user:
                                visible_to_user_hosts.append(host.id)
                    
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
                    logging.error(f"Error filtering hosts by visible_to_roles: {str(e)}")
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
            logging.debug(f"Found {total} hosts for user {current_user.id}, showing page {page}")
        except Exception as e:
            logging.error(f"Error applying pagination: {str(e)}")
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
                """
                last = 0
                for num in range(1, self.pages + 1):
                    if num <= left_edge:
                        yield num
                        last = num
                    elif (num > self.page - left_current - 1 and 
                          num < self.page + right_current):
                        if last + 1 != num:
                            yield None
                        yield num
                        last = num
                    elif num > self.pages - right_edge:
                        if last + 1 != num:
                            yield None
                        yield num
                        last = num
                
            @property
            def items(self):
                return hosts
                
        pagination = Pagination(page, per_page, total)
        return render_template('host/list_hosts_apple.html', hosts=hosts, pagination=pagination)
    except Exception as e:
        logging.error(f"Unexpected error in list_hosts_apple: {str(e)}")
        flash(f"An unexpected error occurred: {str(e)}", "danger")
        return render_template('host/list_hosts_apple.html', hosts=[], pagination=Pagination(1, per_page, 0))

