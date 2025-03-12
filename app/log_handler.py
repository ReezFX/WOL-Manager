import logging
import json
import traceback
import os
import queue
import threading
import time
import enum
import sys
from flask import current_app, has_request_context, request, session, g
from flask_login import current_user
from datetime import datetime
from contextlib import contextmanager
from app.models import SystemLog, db_session, AppSettings


class LoggingProfile(enum.Enum):
    """
    Defines different logging profiles to control the verbosity and types of logs
    that are recorded in the database.
    
    Profiles:
    - LOW: Only essential logs (auth, WOL operations, critical system events)
    - MEDIUM: Adds important operational logs, warnings, and errors
    - HIGH: All logs including detailed debugging information
    """
    LOW = "LOW"         # Minimal logging - auth, WOL operations, critical errors
    MEDIUM = "MEDIUM"   # Standard logging - adds important operational logs
    HIGH = "HIGH"       # Verbose logging - includes all debug information
    
    @classmethod
    def get_current_profile(cls):
        """
        Get the current logging profile from application settings.
        Defaults to LOW if not configured.
        """
        # Try to get profile from g object (if already loaded in this request)
        if hasattr(g, 'logging_profile'):
            return g.logging_profile
        
        # If not in request context or not loaded yet, load from database
        try:
            if current_app:
                # Get from app config if available (for faster access)
                profile = current_app.config.get('LOGGING_PROFILE')
                if profile and isinstance(profile, LoggingProfile):
                    return profile
                
                # Otherwise load from database
                with db_session() as session:
                    settings = AppSettings.get_settings(session)
                    profile_name = getattr(settings, 'logging_profile', cls.LOW.value)
                    profile = cls(profile_name)
                    
                    # Cache in app config for subsequent access
                    current_app.config['LOGGING_PROFILE'] = profile
                    
                    # If in request context, store in g for this request
                    if has_request_context():
                        g.logging_profile = profile
                        
                    return profile
        except Exception as e:
            sys.stderr.write(f"Error loading logging profile: {str(e)}\n")
            
        # Default to LOW if we couldn't determine the profile
        return cls.LOW
    
    def should_log_module(self, module_name):
        """
        Determines if logs from the given module should be recorded
        based on the current logging profile.
        
        Args:
            module_name (str): The name of the module generating the log
            
        Returns:
            bool: True if the log should be recorded, False otherwise
        """
        # Always log authentication and WOL operations in all profiles
        if any(x in module_name.lower() for x in ['auth', 'wol', 'login', 'security']):
            return True
            
        # System-critical modules that should always be logged
        if any(x in module_name.lower() for x in ['error', 'exception', 'crash']):
            return True
            
        # In LOW profile, filter out non-essential logs
        if self == LoggingProfile.LOW:
            # Skip cache, database queries, and debug logs
            if any(x in module_name.lower() for x in ['cache', 'redis', 'query', 'debug', 'sql']):
                return False
                
            # Skip detailed HTTP request logs
            if any(x in module_name.lower() for x in ['request', 'http']):
                return False
                
        # In MEDIUM profile, filter out only detailed diagnostic logs
        elif self == LoggingProfile.MEDIUM:
            # Skip detailed cache operations
            if 'cache.detail' in module_name.lower():
                return False
                
            # Skip SQL query details
            if 'sql.query' in module_name.lower():
                return False
                
        # HIGH profile logs everything
        return True
class DatabaseLogHandler(logging.Handler):
    """
    Custom logging handler that writes log messages to the database.
    Extends the standard logging.Handler to store logs in the SystemLog model.
    Uses an asynchronous queue to prevent blocking the application.
    """
    
    def __init__(self, level=logging.NOTSET, db_session=None, queue_size=1000, 
                 flush_interval=5.0, worker_thread_count=1):
        """
        Initialize the handler with configuration options.
        
        Args:
            level: The minimum log level to process
            db_session: Optional DB session to use
            queue_size: Maximum size of the log queue before blocking
            flush_interval: How often (in seconds) to flush queued logs
            worker_thread_count: Number of worker threads for processing logs
        """
        super().__init__(level)
        self.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        
        # Set up the async logging queue
        self.log_queue = queue.Queue(maxsize=queue_size)
        self.flush_interval = flush_interval
        self.worker_threads = []
        self.shutting_down = threading.Event()
        
        # Start worker threads
        for i in range(worker_thread_count):
            worker = threading.Thread(
                target=self._process_log_queue,
                name=f"LogWorker-{i}",
                daemon=True
            )
            self.worker_threads.append(worker)
            worker.start()
        
        # Register shutdown handler
        import atexit
        atexit.register(self.shutdown)
    
    def emit(self, record):
        """
        Process a log record and put it in the async queue.
        
        Instead of writing directly to the database, this method
        extracts information and puts it in a queue for async processing.
        """
        try:
            # Skip if we're in DB initialization or migration to avoid circular dependencies
            if getattr(record, 'name', '').startswith(('sqlalchemy', 'alembic', 'migrate')):
                return
                
            # Get the current logging profile and check if this module should be logged
            module_name = getattr(record, 'name', '')
            current_profile = LoggingProfile.get_current_profile()
            
            # Skip logging if the current profile doesn't want logs from this module
            if not current_profile.should_log_module(module_name):
                return
            
            # Get user_id if available from the current request context
            user_id = None
            if has_request_context() and hasattr(current_user, 'id'):
                user_id = current_user.id if not current_user.is_anonymous else None
            
            # Extract all the information we need from the record
            log_data = {
                'log_level': record.levelname,
                'source_module': record.name,
                'message': self.format(record),
                'user_id': user_id,
                'metadata': self._get_metadata_from_record(record),
                'timestamp': datetime.fromtimestamp(record.created)
            }
            
            # Put the log data in the queue for async processing
            # If queue is full, we'll wait up to 1 second, then drop the log to avoid blocking
            try:
                self.log_queue.put(log_data, timeout=1.0)
            except queue.Full:
                sys.stderr.write(f"WARNING: Log queue full, dropping log: {log_data['message']}\n")
                
        except Exception as e:
            # Avoid infinite recursion - don't log errors from the log handler
            sys.stderr.write(f"Error in DatabaseLogHandler.emit: {str(e)}\n")
            traceback.print_exc(file=sys.stderr)

    def _process_log_queue(self):
        """
        Worker thread function that processes logs from the queue.
        Runs in a separate thread to avoid blocking the main application.
        """
        while not self.shutting_down.is_set():
            try:
                # Process up to 100 logs in batch if available
                logs_to_process = []
                
                # Get at least one log entry, blocking until one is available or timeout
                try:
                    log_data = self.log_queue.get(timeout=self.flush_interval)
                    logs_to_process.append(log_data)
                    self.log_queue.task_done()
                except queue.Empty:
                    # No logs available, continue the loop
                    continue
                
                # See if more logs are available and batch them
                while len(logs_to_process) < 100:
                    try:
                        log_data = self.log_queue.get_nowait()
                        logs_to_process.append(log_data)
                        self.log_queue.task_done()
                    except queue.Empty:
                        break
                
                # Process the batch of logs
                self._write_logs_to_database(logs_to_process)
                
            except Exception as e:
                sys.stderr.write(f"Error in log processing thread: {str(e)}\n")
                traceback.print_exc(file=sys.stderr)
                # Sleep briefly to avoid tight error loops
                time.sleep(1)
    
    @contextmanager
    def _get_session(self):
        """
        Context manager to handle database sessions and error handling.
        """
        session = db_session
        try:
            yield session
        except Exception as e:
            sys.stderr.write(f"Database error in log handler: {str(e)}\n")
            try:
                session.rollback()
            except Exception as rollback_error:
                sys.stderr.write(f"Error during rollback: {str(rollback_error)}\n")
            # Re-raise to be handled by the caller
            raise
    
    def _write_logs_to_database(self, logs_data):
        """
        Write a batch of logs to the database with error handling.
        
        Args:
            logs_data: List of log data dictionaries to write
        """
        if not logs_data:
            return
            
        # Count retry attempts
        max_retries = 3
        retry_delay = 1  # seconds
        
        for attempt in range(max_retries):
            try:
                with self._get_session() as session:
                    for log_data in logs_data:
                        log_entry = SystemLog(
                            log_level=log_data['log_level'],
                            source_module=log_data['source_module'],
                            message=log_data['message'],
                            user_id=log_data['user_id'],
                            log_metadata=log_data['metadata'],
                            timestamp=log_data.get('timestamp')
                        )
                        session.add(log_entry)
                    
                    session.commit()
                # Successfully wrote logs, break out of retry loop
                break
                
            except Exception as e:
                sys.stderr.write(f"Error writing logs to database (attempt {attempt+1}/{max_retries}): {str(e)}\n")
                
                if attempt < max_retries - 1:
                    # Sleep before retrying (with exponential backoff)
                    time.sleep(retry_delay * (2 ** attempt))
                else:
                    # Final attempt failed, log the error
                    sys.stderr.write(f"Failed to write {len(logs_data)} logs after {max_retries} attempts\n")
                    # If in debug mode, print the first few records that failed
                    if current_app and current_app.debug:
                        for i, log_data in enumerate(logs_data[:5]):
                            sys.stderr.write(f"Failed log {i+1}: {log_data['message']}\n")

    def shutdown(self):
        """
        Shutdown the log handler, ensuring all queued logs are processed.
        """
        if self.shutting_down.is_set():
            return
            
        self.shutting_down.set()
        sys.stderr.write("Shutting down log handler and flushing queue...\n")
        
        # Wait for the queue to be fully processed (up to 10 seconds)
        try:
            # Use a timeout approach since queue.join() doesn't accept a timeout parameter
            start_time = time.time()
            timeout = 10.0  # 10 seconds timeout
            
            # Wait until queue is empty or timeout occurs
            while not self.log_queue.empty():
                if time.time() - start_time > timeout:
                    sys.stderr.write("Timeout waiting for log queue to drain\n")
                    break
                time.sleep(0.1)  # Small sleep to avoid CPU spinning
        except Exception as e:
            sys.stderr.write(f"Error while waiting for log queue to drain: {str(e)}\n")
        # Final attempt to process any remaining logs
        remaining_logs = []
        while not self.log_queue.empty():
            try:
                remaining_logs.append(self.log_queue.get_nowait())
                self.log_queue.task_done()
            except queue.Empty:
                break
                
        if remaining_logs:
            sys.stderr.write(f"Processing {len(remaining_logs)} remaining logs before shutdown\n")
            try:
                self._write_logs_to_database(remaining_logs)
            except Exception as e:
                sys.stderr.write(f"Error processing remaining logs during shutdown: {str(e)}\n")
                
        sys.stderr.write("Log handler shutdown complete\n")
        
    def flush(self):
        """
        Flush the log handler, ensuring all queued logs are processed.
        """
        try:
            # Wait for the queue to empty
            start_time = time.time()
            
            # Wait until queue is empty or timeout occurs
            while not self.log_queue.empty():
                if time.time() - start_time > self.flush_interval:
                    sys.stderr.write("Timeout waiting for log queue to drain during flush\n")
                    break
                time.sleep(0.1)  # Small sleep to avoid CPU spinning
        except Exception as e:
            sys.stderr.write(f"Error during log flush: {str(e)}\n")
    
    def _get_metadata_from_record(self, record):
        """
        Extract useful metadata from the log record and current request context.
        
        Returns:
            dict: Metadata including full stack traces (if exception), pathname, line number,
                 function name, detailed request context (URL, method, headers),
                 sanitized session data, and environment variables relevant to debugging
        """
        metadata = {}
        
        # Add exception information if available
        if hasattr(record, 'exc_info') and record.exc_info:
            metadata['traceback'] = traceback.format_exception(*record.exc_info)
            metadata['exception_type'] = record.exc_info[0].__name__ if record.exc_info[0] else None
            metadata['exception_message'] = str(record.exc_info[1]) if record.exc_info[1] else None
            
            # Get full stack trace, including variables at each level
            if record.exc_info[2]:  # If we have a traceback object
                try:
                    frames = []
                    tb = record.exc_info[2]
                    while tb:
                        frame = {
                            'filename': tb.tb_frame.f_code.co_filename,
                            'name': tb.tb_frame.f_code.co_name,
                            'lineno': tb.tb_lineno,
                            'locals': {k: str(v) for k, v in tb.tb_frame.f_locals.items() 
                                      if not k.startswith('__') and not callable(v)}
                        }
                        frames.append(frame)
                        tb = tb.tb_next
                    metadata['stack_frames'] = frames
                except Exception as e:
                    metadata['stack_trace_error'] = f"Error capturing stack frames: {str(e)}"
        
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
                'full_path': request.full_path,
                'base_url': request.base_url,
                'path': request.path,
                'query_string': request.query_string.decode('utf-8', errors='replace') if request.query_string else '',
                'method': request.method,
                'endpoint': request.endpoint,
                'remote_addr': request.remote_addr,
                'user_agent': str(request.user_agent),
                'referrer': request.referrer,
                'content_type': request.content_type,
                'content_length': request.content_length,
                'cookies': {k: '******' for k in request.cookies.keys()},  # Just record cookie names, not values
                'scheme': request.scheme,
                'is_secure': request.is_secure
            }
            
            # Add sanitized session data
            if session:
                safe_session = {
                    k: '******' if any(x in k.lower() for x in ('csrf', 'token', 'password', 'secret', 'key', 'auth'))
                      else v for k, v in session.items()
                }
                metadata['session'] = safe_session
            
        # Add environment variables relevant to debugging
        debug_env_vars = [
            'FLASK_ENV', 'FLASK_DEBUG', 'FLASK_APP',
            'SERVER_NAME', 'SERVER_SOFTWARE', 'REMOTE_ADDR',
            'HTTP_HOST', 'HTTPS', 'APPLICATION_ROOT',
            'PYTHONPATH', 'PATH', 'HOSTNAME',
            # Add any custom environment variables relevant to your application
            'APP_CONFIG', 'DATABASE_URL', 'REDIS_URL', 'APP_ENVIRONMENT'
        ]
        env_data = {}
        for var in debug_env_vars:
            if var in os.environ:
                # Mask sensitive values that might contain credentials
                value = os.environ[var]
                if any(x in var.lower() for x in ('key', 'secret', 'token', 'password', 'credential')):
                    env_data[var] = '******'
                elif any(x in value.lower() for x in ('://', '@')) and (':' in value):
                    # Likely a URL with credentials - mask the password portion
                    parts = value.split('@')
                    if len(parts) > 1 and '://' in parts[0]:
                        protocol_parts = parts[0].split('://')
                        if len(protocol_parts) > 1:
                            credential_parts = protocol_parts[1].split(':')
                            if len(credential_parts) > 1:
                                masked = f"{protocol_parts[0]}://{credential_parts[0]}:******@{parts[1]}"
                                env_data[var] = masked
                            else:
                                env_data[var] = value
                        else:
                            env_data[var] = value
                    else:
                        env_data[var] = value
                else:
                    env_data[var] = value
        
        metadata['environment'] = env_data
        
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

