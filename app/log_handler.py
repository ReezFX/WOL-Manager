import logging
import json
import traceback
from flask import current_app, has_request_context, request, session
from flask_login import current_user
from datetime import datetime

from app.models import SystemLog, db_session


class DatabaseLogHandler(logging.Handler):
    """
    Custom logging handler that writes log messages to the database.
    Extends the standard logging.Handler to store logs in the SystemLog model.
    """
    
    def __init__(self, level=logging.NOTSET, db_session=None):
        """Initialize the handler with an optional minimum log level and db_session."""
        super().__init__(level)
        self.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
    
    def emit(self, record):
        """
        Process and emit a log record to the database.
        
        This method extracts information from the log record, formats it,
        and saves it to the SystemLog table.
        """
        try:
            # Skip if we're in DB initialization or migration to avoid circular dependencies
            if getattr(record, 'name', '').startswith(('sqlalchemy', 'alembic', 'migrate')):
                return
            
            # Get user_id if available from the current request context
            user_id = None
            if has_request_context() and hasattr(current_user, 'id'):
                user_id = current_user.id if not current_user.is_anonymous else None
            
            # Extract metadata
            metadata = self._get_metadata_from_record(record)
            
            # Create and save the log entry
            log_entry = SystemLog(
                log_level=record.levelname,
                source_module=record.name,
                message=self.format(record),
                user_id=user_id,
                metadata=metadata
            )
            
            # Add to session and commit
            db_session.add(log_entry)
            db_session.commit()
            
        except Exception as e:
            # Avoid infinite recursion - don't log errors from the log handler
            import sys
            print(f"Error in DatabaseLogHandler.emit: {str(e)}", file=sys.stderr)
            
            # Print traceback for debugging
            traceback.print_exc(file=sys.stderr)
            
            # Make sure to rollback any failed transaction
            try:
                db_session.rollback()
            except Exception:
                pass
    
    def _get_metadata_from_record(self, record):
        """
        Extract useful metadata from the log record and current request context.
        
        Returns:
            dict: Metadata including traceback (if exception), pathname, line number,
                 function name, and request details (if in request context)
        """
        metadata = {}
        
        # Add exception information if available
        if hasattr(record, 'exc_info') and record.exc_info:
            metadata['traceback'] = traceback.format_exception(*record.exc_info)
            metadata['exception_type'] = record.exc_info[0].__name__ if record.exc_info[0] else None
            metadata['exception_message'] = str(record.exc_info[1]) if record.exc_info[1] else None
        
        # Add source code information
        if hasattr(record, 'pathname'):
            metadata['pathname'] = record.pathname
        if hasattr(record, 'lineno'):
            metadata['lineno'] = record.lineno
        if hasattr(record, 'funcName'):
            metadata['funcName'] = record.funcName
        
        # Add thread and process information
        if hasattr(record, 'threadName'):
            metadata['threadName'] = record.threadName
        if hasattr(record, 'processName'):
            metadata['processName'] = record.processName
        
        # Add request information if we're in a request context
        if has_request_context():
            metadata['request'] = {
                'url': request.url,
                'method': request.method,
                'endpoint': request.endpoint,
                'remote_addr': request.remote_addr,
                'user_agent': str(request.user_agent)
            }
            
            # Add headers (excluding sensitive ones)
            safe_headers = {}
            for key, value in request.headers.items():
                if key.lower() not in ('authorization', 'cookie'):
                    safe_headers[key] = value
            metadata['headers'] = safe_headers
            
            # Include safe session data
            if session:
                safe_session = {}
                for key, value in session.items():
                    # Skip sensitive session keys
                    if not key.startswith('_') and key.lower() not in ('csrf_token', 'password'):
                        safe_session[key] = str(value)
                metadata['session'] = safe_session
        
        # Add any custom attributes added to the record
        for key, value in record.__dict__.items():
            if key not in ('args', 'exc_info', 'exc_text', 'msg', 'message', 'levelno', 'levelname',
                          'pathname', 'filename', 'module', 'lineno', 'funcName', 'created',
                          'msecs', 'relativeCreated', 'name', 'thread', 'threadName', 
                          'processName', 'process') and not key.startswith('_'):
                try:
                    # Attempt to serialize the value to ensure it's JSON compatible
                    json.dumps({key: value})
                    metadata[key] = value
                except (TypeError, OverflowError):
                    metadata[key] = str(value)
        
        return metadata


class LogLevelFilter(logging.Filter):
    """Filter to match specific log levels."""
    
    def __init__(self, level):
        """Initialize with minimum log level to allow."""
        self.level = level
        
    def filter(self, record):
        """Check if record's level is >= the specified level."""
        return record.levelno >= self.level

