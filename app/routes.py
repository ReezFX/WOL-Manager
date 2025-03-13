import csv
import io
from datetime import datetime
from flask import Blueprint, render_template, request, redirect, url_for, current_app, flash, Response, send_file
from flask_login import login_required, current_user
import os
import re
import subprocess
from werkzeug.exceptions import BadRequest
import json

# Create logs blueprint
logs = Blueprint('logs', __name__)

def get_system_logs(search_term='', log_level='', start_date=None, end_date=None, use_db=False):
    """
    Retrieve system logs with optional filtering
    
    Args:
        search_term: Optional text to search for in logs
        log_level: Optional log level to filter by
        start_date: Optional start date for filtering
        end_date: Optional end date for filtering
        use_db: Whether to use database logs instead of journalctl (no longer supported)
    """
    # Database logging no longer supported, use journalctl
    try:
        logs = []
        journalctl_cmd = ['journalctl', '-r']  # Reverse order to show newest first
        
        # Add date filters if provided
        if start_date:
            journalctl_cmd.extend(['--since', start_date])
        if end_date:
            journalctl_cmd.extend(['--until', end_date])
            
        # Add log level filter if provided
        if log_level:
            journalctl_cmd.extend(['-p', log_level])
            
        # Execute the command
        process = subprocess.Popen(journalctl_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        output, error = process.communicate()
        output, error = process.communicate()
        
        # Process the output
            if search_term and search_term.lower() not in line.lower():
                continue
                
            logs.append(line)
            
        return logs
    except Exception as e:
        return []

def get_auth_logs(search_term='', start_date=None, end_date=None):
    """
    Retrieve authentication logs with optional filtering
    """
    try:
        logs = []
        auth_log_path = '/var/log/auth.log'
        
        if not os.path.exists(auth_log_path):
            return []
            
        with open(auth_log_path, 'r') as f:
            for line in f:
                # Apply search filter if provided
                if search_term and search_term.lower() not in line.lower():
                    continue
                    
                # Apply date filters if provided
                if start_date or end_date:
                    try:
                        # Extract date from log line (assuming format: "Month Day HH:MM:SS")
                        date_str = re.search(r'^\w+\s+\d+\s+\d+:\d+:\d+', line)
                        if date_str:
                            log_date = datetime.strptime(date_str.group(0), '%b %d %H:%M:%S')
                            
                            # Add current year since auth logs typically don't include year
                            current_year = datetime.now().year
                            log_date = log_date.replace(year=current_year)
                            
                            if start_date and log_date < datetime.strptime(start_date, '%Y-%m-%d'):
                                continue
                            if end_date and log_date > datetime.strptime(end_date, '%Y-%m-%d'):
                                continue
                    except Exception as date_error:
                        pass
                
                logs.append(line)
                
        return logs
    except Exception as e:
        return []

def get_wol_logs(search_term='', start_date=None, end_date=None):
    """
    Retrieve Wake-on-LAN logs with optional filtering
    """
    try:
        logs = []
        wol_log_path = current_app.config.get('WOL_LOG_PATH', '/var/log/wol.log')
        
        if not os.path.exists(wol_log_path):
            return []
            
        with open(wol_log_path, 'r') as f:
            for line in f:
                # Apply search filter if provided
                if search_term and search_term.lower() not in line.lower():
                    continue
                    
                # Apply date filters if provided
                if start_date or end_date:
                    try:
                        # Extract date from log line (assuming ISO format date at beginning)
                        date_match = re.search(r'\d{4}-\d{2}-\d{2}', line)
                        if date_match:
                            log_date = datetime.strptime(date_match.group(0), '%Y-%m-%d')
                            
                            if start_date and log_date < datetime.strptime(start_date, '%Y-%m-%d'):
                                continue
                            if end_date and log_date > datetime.strptime(end_date, '%Y-%m-%d'):
                                continue
                    except Exception as date_error:
                        pass
                
                logs.append(line)
                
        return logs
    except Exception as e:
        return []
def metadata_to_dict(metadata):
    """
    Safely convert MetaData objects to dictionaries for serialization.
    
    Args:
        metadata: The metadata object or dictionary to convert
        
    Returns:
        dict: A dictionary representation of the metadata safe for JSON serialization
    """
    if metadata is None:
        return {}
        
    # If it's already a dict, make a copy to avoid modifying the original
    if isinstance(metadata, dict):
        result = metadata.copy()
    # If it's an SQLAlchemy object with a specific attribute for metadata
    elif hasattr(metadata, 'log_metadata'):
        result = metadata.log_metadata if metadata.log_metadata is not None else {}
    # If it's a SQLAlchemy Table object
    elif hasattr(metadata, 'columns') and hasattr(metadata, 'name'):
        # For SQLAlchemy Table objects, extract useful properties
        result = {
            'table_name': getattr(metadata, 'name', 'unknown'),
            'schema': getattr(metadata, 'schema', None),
            'columns': [col.name for col in getattr(metadata, 'columns', []) if hasattr(col, 'name')]
        }
    # If it's a SQLAlchemy MetaData object
    elif hasattr(metadata, 'tables') and str(metadata.__class__.__name__) == 'MetaData':
        # For SQLAlchemy MetaData objects, extract table names
        result = {
            'type': 'SQLAlchemy MetaData',
            'tables': [table_name for table_name in metadata.tables.keys()]
        }
    # If it has a __dict__ attribute
    elif hasattr(metadata, '__dict__'):
        result = {key: value for key, value in metadata.__dict__.items() 
                 if not key.startswith('_')}
    else:
        try:
            result = {'value': str(metadata)}
        except Exception:
            return {'error': 'Unable to convert metadata to string'}
            
    # Recursively process nested dictionaries and lists
    for key, value in list(result.items()):
        if isinstance(value, dict):
            result[key] = metadata_to_dict(value)
        elif isinstance(value, list):
            result[key] = [metadata_to_dict(item) if isinstance(item, dict) else item 
                           for item in value]
        elif hasattr(value, '__dict__') or (hasattr(value, 'columns') and hasattr(value, 'name')):
            # Convert nested objects with __dict__ or Table objects to dictionaries
            result[key] = metadata_to_dict(value)
            
    # Ensure all values are JSON serializable
    for key, value in list(result.items()):
        try:
            json.dumps({key: value})
        except (TypeError, OverflowError):
            # If not serializable, convert to string
            try:
                result[key] = str(value)
            except Exception:
                # If string conversion fails, remove the key
                del result[key]
                
    return result

def generate_csv(data, header_row):
    """
    Helper function to generate CSV data with proper metadata serialization.
    
    Args:
        data: List of data entries to format as CSV rows
        header_row: List of column headers for the CSV
        
    Returns:
        StringIO object containing the generated CSV
    """
    try:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(header_row)
        
        # Write data with proper metadata handling
        for row in data:
            try:
                # Convert row to safe dictionary if it's a complex object
                if hasattr(row, '__dict__') or isinstance(row, dict):
                    safe_row = metadata_to_dict(row)
                    csv_row = []
                    
                    if isinstance(safe_row, dict) and len(header_row) > 1:
                        # For multi-column CSV with dictionary data
                        for column in header_row:
                            value = safe_row.get(column, '')
                            if not isinstance(value, str):
                                value = str(value)
                            csv_row.append(value)
                    else:
                        # For single column CSV or non-dictionary data
                        if isinstance(safe_row, dict):
                            csv_row = [str(safe_row)]
                        else:
                            csv_row = [str(safe_row)]
                else:
                    # For simple string entries
                    csv_row = [str(row)]
                    
                writer.writerow(csv_row)
            except Exception as e:
                # Try a simple string conversion as fallback
                writer.writerow([str(row)])
                continue
        
        output.seek(0)
        return output

@logs.route('/')
@login_required
def index():
    """
    Main logs page showing WOL and authentication logs
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get the logs
        auth_logs = get_auth_logs(search_term, start_date, end_date)
        wol_logs = get_wol_logs(search_term, start_date, end_date)
        
        return render_template('logs/index.html', 
                              auth_logs=auth_logs,
                              wol_logs=wol_logs,
                              search_term=search_term,
                              start_date=start_date, 
                              end_date=end_date)
    except Exception as e:
        flash(f"Error retrieving logs: {str(e)}", "danger")
        return redirect(url_for('main.dashboard'))

@logs.route('/system')
@login_required
def system_logs():
    """
    System logs page
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        log_level = request.args.get('level', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get system logs
        system_logs = get_system_logs(search_term, log_level, start_date, end_date)
        
        return render_template('logs/system.html',
                              system_logs=system_logs,
                              search_term=search_term,
                              log_level=log_level,
                              start_date=start_date,
                              end_date=end_date)
    except Exception as e:
        flash(f"Error retrieving system logs: {str(e)}", "danger")
        return redirect(url_for('logs.index'))

@logs.route('/auth')
@login_required
def auth_logs():
    """
    Authentication logs page
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get auth logs
        auth_logs = get_auth_logs(search_term, start_date, end_date)
        
        return render_template('logs/auth.html',
                              auth_logs=auth_logs,
                              search_term=search_term,
                              start_date=start_date,
                              end_date=end_date)
    except Exception as e:
        flash(f"Error retrieving authentication logs: {str(e)}", "danger")
        return redirect(url_for('logs.index'))

@logs.route('/wol')
@login_required
def wol_logs():
    """
    Wake-on-LAN logs page
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get WOL logs
        wol_logs = get_wol_logs(search_term, start_date, end_date)
        
        return render_template('logs/wol.html',
                              wol_logs=wol_logs,
                              search_term=search_term,
                              start_date=start_date,
                              end_date=end_date)
    except Exception as e:
        flash(f"Error retrieving WOL logs: {str(e)}", "danger")
        return redirect(url_for('logs.index'))

@logs.route('/combined')
@login_required
def combined_logs():
    """
    Combined logs view page
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        log_level = request.args.get('level', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        page = request.args.get('page', 1, type=int)
        per_page = 20  # Set a reasonable number of logs per page
        
        # Create a pagination class similar to the one in host.py
        class Pagination:
            def __init__(self, items, page, per_page, total_count):
                self.items = items
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
        
        # Get logs from all sources
        system_logs = get_system_logs(search_term, log_level, start_date, end_date)
        auth_logs = get_auth_logs(search_term, start_date, end_date)
        wol_logs = get_wol_logs(search_term, start_date, end_date)
        
        # Combine all logs
        combined = []
        
        for log in system_logs:
            combined.append({'type': 'system', 'content': log})
            
        for log in auth_logs:
            combined.append({'type': 'auth', 'content': log})
            
        for log in wol_logs:
            combined.append({'type': 'wol', 'content': log})
        
        # Get total log count for pagination
        total = len(combined)
        
        # Calculate start and end for slicing
        start = (page - 1) * per_page
        end = start + per_page
        
        # Get the logs for the current page
        current_page_logs = combined[start:end]
        
        # Create pagination object
        pagination = Pagination(current_page_logs, page, per_page, total)
        
        return render_template('logs/combined.html',
                              pagination=pagination,
                              search_term=search_term,
                              log_level=log_level,
                              start_date=start_date,
                              end_date=end_date)
    except Exception as e:
        flash(f"Error retrieving combined logs: {str(e)}", "danger")
        return redirect(url_for('logs.index'))

@logs.route('/system/export')
@login_required
def export_system_logs():
    """
    Export system logs to CSV
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        log_level = request.args.get('level', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get system logs
        system_logs = get_system_logs(search_term, log_level, start_date, end_date)
        
        # Generate CSV using helper function with proper metadata handling
        output = generate_csv(system_logs, ['Log Entry'])
        
        # Create response
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"system_logs_{timestamp}.csv"
        
        # Log export activity with safely converted metadata
        try:
            metadata = {
                'filters': {
                    'search': search_term,
                    'level': log_level,
                    'start_date': start_date,
                    'end_date': end_date
                }
            }
            safe_metadata = metadata_to_dict(metadata)
        except Exception as e:
            pass
        
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename={filename}"}
        )
    except Exception as e:
        flash(f"Error exporting system logs: {str(e)}", "danger")
        return redirect(url_for('logs.system_logs'))

@logs.route('/auth/export')
@login_required
def export_auth_logs():
    """
    Export authentication logs to CSV
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get auth logs
        auth_logs = get_auth_logs(search_term, start_date, end_date)
        
        # Generate CSV using helper function with proper metadata handling
        output = generate_csv(auth_logs, ['Log Entry'])
        
        # Create response
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"auth_logs_{timestamp}.csv"
        
        # Log export activity with safely converted metadata
        try:
            metadata = {
                'filters': {
                    'search': search_term,
                    'start_date': start_date,
                    'end_date': end_date
                }
            }
            safe_metadata = metadata_to_dict(metadata)
        except Exception as e:
            pass
        
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename={filename}"}
        )
    except Exception as e:
        flash(f"Error exporting auth logs: {str(e)}", "danger")
        return redirect(url_for('logs.auth_logs'))

@logs.route('/wol/export')
@login_required
def export_wol_logs():
    """
    Export Wake-on-LAN logs to CSV
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get WOL logs
        wol_logs = get_wol_logs(search_term, start_date, end_date)
        
        # Generate CSV using helper function with proper metadata handling
        output = generate_csv(wol_logs, ['Log Entry'])
        
        # Create response
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"wol_logs_{timestamp}.csv"
        
        # Log export activity with safely converted metadata
        try:
            metadata = {
                'filters': {
                    'search': search_term,
                    'start_date': start_date,
                    'end_date': end_date
                }
            }
            safe_metadata = metadata_to_dict(metadata)
        except Exception as e:
            pass
        
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": f"attachment;filename={filename}"}
        )
    except Exception as e:
        flash(f"Error exporting WOL logs: {str(e)}", "danger")
        return redirect(url_for('logs.wol_logs'))

@logs.route('/combined/export')
@login_required
def export_combined_logs():
    """
    Export combined logs to CSV or JSON
    
    This function combines system, authentication, and WOL logs into a single export file.
    It handles all database operations safely and provides proper error handling.
    """
    try:
        # Get all request parameters
        search_term = request.args.get('search', '')
        log_level = request.args.get('level', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        export_format = request.args.get('format', 'csv').lower()
        
        # Create timestamp for filename
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Get the username before any database operations to avoid detached instance errors
        username = current_user.username if hasattr(current_user, 'username') else 'unknown'
        
        # Log the export attempt with safe metadata
        log_metadata = {
            'export_type': 'combined_logs',
            'format': export_format,
            'filters': {
                'search': search_term,
                'level': log_level,
                'start_date': start_date,
                'end_date': end_date
            }
        }
        
        try:
            # Safely convert metadata for potential use
            safe_metadata = metadata_to_dict(log_metadata)
        except Exception as e:
            # If metadata conversion fails, continue silently
            pass
        
        # Initialize container for all logs
        combined_logs = []
        
        # 1. Get system logs directly from the database using direct column access
        try:
            from app.models import SystemLog, db_session
            from sqlalchemy import select, text
            
            with db_session() as session:
                # Build query with explicit column selection to avoid metadata issues
                query = select(
                    SystemLog.id,
                    SystemLog.timestamp,
                    SystemLog.log_level,
                    SystemLog.message,
                    SystemLog.source_module
                )
                
                # Add filters
                if log_level:
                    query = query.where(SystemLog.log_level == log_level)
                
                if start_date:
                    try:
                        start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                        query = query.where(SystemLog.timestamp >= start_datetime)
                    except ValueError:
                        pass
                if end_date:
                    try:
                        end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
                        end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
                        query = query.where(SystemLog.timestamp <= end_datetime)
                    except ValueError as e:
                        pass
                
                if search_term:
                    # Use text instead of direct reference for message search to avoid metadata issues
                    search_condition = text("message ILIKE :search")
                    query = query.where(search_condition.bindparams(search=f"%{search_term}%"))
                
                # Execute the query with timeout
                system_log_rows = session.execute(query).fetchall()
                
                for row in system_log_rows:
                    # Create a simplified dict with just text data, no complex objects
                    log_entry = {
                        'id': str(row[0]),  # Convert ID to string to ensure serialization
                        'timestamp': row[1].strftime('%Y-%m-%d %H:%M:%S') if row[1] else '',
                        'level': row[2],
                        'message': row[3],
                        'source': row[4]
                    }
                    combined_logs.append({'type': 'system', 'content': log_entry})
        except Exception as e:
            pass
            # Continue with other logs even if this fails
        
        # 2. Get auth log file entries directly
        try:
            auth_log_path = '/var/log/auth.log'
            if os.path.exists(auth_log_path):
                with open(auth_log_path, 'r', errors='replace') as f:
                    for line in f:
                        if search_term and search_term.lower() not in line.lower():
                            continue
                        
                        # Simple date filtering
                        if start_date or end_date:
                            # Extract date from log line (assuming format: "Month Day HH:MM:SS")
                            date_match = re.search(r'^(\w+\s+\d+\s+\d+:\d+:\d+)', line)
                            if date_match:
                                try:
                                    log_date = datetime.strptime(date_match.group(0), '%b %d %H:%M:%S')
                                    # Add current year since auth logs typically don't include year
                                    current_year = datetime.now().year
                                    log_date = log_date.replace(year=current_year)
                                    
                                    # Apply date filters
                                    if start_date and log_date < datetime.strptime(start_date, '%Y-%m-%d'):
                                        continue
                                    if end_date and log_date > datetime.strptime(end_date + ' 23:59:59', '%Y-%m-%d %H:%M:%S'):
                                        continue
                                except Exception:
                                    pass
                        combined_logs.append({'type': 'auth', 'content': line.strip()})
        except Exception as e:
            # Continue with other logs even if this fails
            pass
        
        # 3. Get WOL log file entries
        try:
            wol_log_path = current_app.config.get('WOL_LOG_PATH', '/var/log/wol.log')
            if os.path.exists(wol_log_path):
                with open(wol_log_path, 'r', errors='replace') as f:
                    for line in f:
                        if search_term and search_term.lower() not in line.lower():
                            continue
                        
                        # Simple date filtering
                        if start_date or end_date:
                            # Extract date from WOL log (assuming ISO format date)
                            date_match = re.search(r'(\d{4}-\d{2}-\d{2})', line)
                            if date_match:
                                try:
                                    log_date = datetime.strptime(date_match.group(0), '%Y-%m-%d')
                                    
                                    # Apply date filters
                                    if start_date and log_date < datetime.strptime(start_date, '%Y-%m-%d'):
                                        continue
                                    if end_date and log_date > datetime.strptime(end_date, '%Y-%m-%d'):
                                        continue
                                except Exception:
                                    pass
                        
                        combined_logs.append({'type': 'wol', 'content': line.strip()})
        except Exception:
            # Continue with other logs even if this fails
            pass
        
        # 4. Generate export file based on requested format
        if export_format == 'json':
            # JSON export
            try:
                filename = f"combined_logs_{timestamp}.json"
                
                # Format the logs for JSON export
                json_data = []
                for log in combined_logs:
                    if isinstance(log['content'], dict):
                        # System logs are already dictionaries
                        json_data.append({
                            'type': log['type'],
                            'timestamp': log['content'].get('timestamp', ''),
                            'level': log['content'].get('level', ''),
                            'message': log['content'].get('message', ''),
                            'source': log['content'].get('source', '')
                        })
                    else:
                        # Text logs (auth and WOL)
                        json_data.append({
                            'type': log['type'],
                            'content': log['content']
                        })
                
                # Create a JSON string, handling serialization issues
                json_str = json.dumps(json_data, indent=2, default=str)
                
                
                return Response(
                    json_str,
                    mimetype="application/json",
                    headers={"Content-Disposition": f"attachment;filename={filename}"}
                )
            except Exception as e:
                flash(f"JSON export error: {str(e)}", "danger")
                return redirect(url_for('logs.combined_logs'))
        else:
            # CSV export
            try:
                filename = f"combined_logs_{timestamp}.csv"
                
                # Create CSV file
                output = io.StringIO()
                writer = csv.writer(output)
                
                # Write header row
                writer.writerow(['Log Type', 'Timestamp', 'Level', 'Message', 'Source'])
                
                # Write data rows
                for log in combined_logs:
                    if isinstance(log['content'], dict):
                        # Format system logs (dictionaries)
                        writer.writerow([
                            log['type'],
                            log['content'].get('timestamp', ''),
                            log['content'].get('level', ''),
                            log['content'].get('message', ''),
                            log['content'].get('source', '')
                        ])
                    else:
                        # Format text logs (auth and WOL)
                        writer.writerow([
                            log['type'],
                            '',  # Timestamp column empty for raw log entries
                            '',  # Level column empty for raw log entries
                            log['content'],
                            ''   # Source column empty for raw log entries
                        ])
                
                
                return Response(
                    output.getvalue(),
                    mimetype="text/csv",
                    headers={"Content-Disposition": f"attachment;filename={filename}"}
                )
            except Exception as e:
                flash(f"CSV export error: {str(e)}", "danger")
                return redirect(url_for('logs.combined_logs'))
    
    except Exception as e:
        error_msg = f"Combined logs export error: {str(e)}"
        flash(error_msg, "danger")
        return redirect(url_for('logs.combined_logs'))

@logs.route('/combined/export_simple')
@login_required
def export_simplified_logs():
    """
    Alternative export function that uses a simplified approach to avoid serialization issues
    """
    # Parameters
    search_term = request.args.get('search', '')
    log_level = request.args.get('level', '')
    start_date = request.args.get('start_date', '')
    end_date = request.args.get('end_date', '')
    export_format = request.args.get('format', 'csv').lower()
    
    # Create timestamp filename suffix
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    
    try:
        # Empty array to store all log entries
        combined_logs = []
        
        # Get system logs directly from DB
        try:
            from app.models import SystemLog, db_session
            
            with db_session() as session:
                # Base query
                query = session.query(
                    SystemLog.id,
                    SystemLog.timestamp,
                    SystemLog.log_level,
                    SystemLog.message,
                    SystemLog.source_module
                )
                
                # Add filters
                if log_level:
                    query = query.filter(SystemLog.log_level == log_level)
                
                if start_date:
                    try:
                        start_datetime = datetime.strptime(start_date, '%Y-%m-%d')
                        query = query.filter(SystemLog.timestamp >= start_datetime)
                    except:
                        pass
                
                if end_date:
                    try:
                        end_datetime = datetime.strptime(end_date, '%Y-%m-%d')
                        end_datetime = end_datetime.replace(hour=23, minute=59, second=59)
                        query = query.filter(SystemLog.timestamp <= end_datetime)
                    except:
                        pass
                
                if search_term:
                    query = query.filter(SystemLog.message.ilike(f"%{search_term}%"))
                
                # Execute the query
                results = query.all()
                
                # Process results (using named tuple to avoid SQLAlchemy objects)
                for row in results:
                    log_entry = {
                        'id': row[0],
                        'timestamp': row[1].strftime('%Y-%m-%d %H:%M:%S'),
                        'level': row[2],
                        'message': row[3],
                        'source': row[4]
                    }
                    combined_logs.append({'type': 'system', 'content': log_entry})
        except Exception:
            pass
        
        # Export based on format
        if export_format == 'json':
            # JSON export
            filename = f"simple_logs_{timestamp}.json"
            
            # Create a safe JSON string
            json_str = json.dumps([
                {'type': log['type'], 'content': log['content']} 
                for log in combined_logs
            ], indent=2, default=str)
            
            # Return response
            return Response(
                json_str,
                mimetype="application/json",
                headers={"Content-Disposition": f"attachment;filename={filename}"}
            )
        else:
            # CSV export
            filename = f"simple_logs_{timestamp}.csv"
            
            # Create CSV
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow(['Log Type', 'Timestamp', 'Level', 'Message', 'Source'])
            
            # Write rows
            for log in combined_logs:
                content = log['content']
                if isinstance(content, dict):
                    writer.writerow([
                        log['type'],
                        content.get('timestamp', ''),
                        content.get('level', ''),
                        content.get('message', ''),
                        content.get('source', '')
                    ])
                else:
                    writer.writerow([log['type'], '', '', str(content), ''])
            
            # Return response
            return Response(
                output.getvalue(),
                mimetype="text/csv",
                headers={"Content-Disposition": f"attachment;filename={filename}"}
            )
    
    except Exception as e:
        error_msg = f"Error in simplified export: {str(e)}"
        flash(error_msg, "danger")
        return redirect(url_for('logs.combined_logs'))

