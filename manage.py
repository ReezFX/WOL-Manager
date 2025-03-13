#!/usr/bin/env python3
import os
import click
import sys
import logging
import shutil
import datetime
from flask.cli import FlaskGroup
from logging.handlers import RotatingFileHandler
from flask_migrate import Migrate
from sqlalchemy import text
from app import create_app, db_session
from app.models import User, Role, Permission, Base
from app.auth import hash_password
from app.logging_config import LOG_DIR, APP_LOG, ERROR_LOG, ACCESS_LOG, LOG_PROFILES, ensure_log_directory

app = create_app(os.getenv('FLASK_ENV') or 'development')


@app.shell_context_processor
def make_shell_context():
    """Provides key objects to the Flask shell context."""
    return dict(app=app, db_session=db_session, User=User, Role=Role, Permission=Permission)


@app.cli.command("init-db")
def init_db():
    """Initialize the database and create tables."""
    from sqlalchemy import create_engine
    engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
    Base.metadata.create_all(bind=engine)
    click.echo("Database initialized.")


@app.cli.command("create-admin")
@click.option('--username', default='WOLadmin', help='Admin username')
@click.option('--password', default='Manager', help='Admin password')
def create_admin(username, password):
    """Create admin user with all permissions."""
    
    # Check if user already exists
    existing_user = db_session.query(User).filter_by(username=username).first()
    if existing_user:
        click.echo(f"User {username} already exists.")
        return

    # Create admin user
    admin_user = User(
        username=username,
        password_hash=hash_password(password),
        role='admin',
        permissions={
            'hosts': ['create', 'read', 'update', 'delete'],
            'users': ['create', 'read', 'update', 'delete'],
            'wol': ['send', 'view_logs'],
            'system': ['configure']
        }
    )
    
    # Add admin role if it exists
    admin_role = db_session.query(Role).filter_by(name='admin').first()
    if admin_role:
        admin_user.roles.append(admin_role)
    
    # Save user to database
    db_session.add(admin_user)
    db_session.commit()
    
    click.echo(f"Admin user '{username}' created successfully.")


@app.cli.command("create-permissions")
def create_permissions():
    """Create default permissions and roles."""
    # Define default permissions
    permissions_data = [
        # Host permissions
        {'name': 'create_host', 'description': 'Create new hosts', 'category': 'hosts'},
        {'name': 'read_host', 'description': 'View hosts', 'category': 'hosts'},
        {'name': 'update_host', 'description': 'Edit hosts', 'category': 'hosts'},
        {'name': 'delete_host', 'description': 'Delete hosts', 'category': 'hosts'},
        
        # User permissions
        {'name': 'create_user', 'description': 'Create new users', 'category': 'users'},
        {'name': 'read_user', 'description': 'View users', 'category': 'users'},
        {'name': 'update_user', 'description': 'Edit users', 'category': 'users'},
        {'name': 'delete_user', 'description': 'Delete users', 'category': 'users'},
        
        # WOL permissions
        {'name': 'send_wol', 'description': 'Send wake-on-lan packets', 'category': 'wol'},
        {'name': 'view_logs', 'description': 'View wake-on-lan logs', 'category': 'wol'},
        
        # System permissions
        {'name': 'configure_system', 'description': 'Configure system settings', 'category': 'system'},
    ]
    
    # Create permissions if they don't exist
    for perm_data in permissions_data:
        perm = db_session.query(Permission).filter_by(name=perm_data['name']).first()
        if not perm:
            perm = Permission(**perm_data)
            db_session.add(perm)
    
    # Define roles
    roles_data = [
        {
            'name': 'admin',
            'description': 'Administrator with full access',
            'permissions': ['create_host', 'read_host', 'update_host', 'delete_host',
                           'create_user', 'read_user', 'update_user', 'delete_user',
                           'send_wol', 'view_logs', 'configure_system']
        },
        {
            'name': 'user',
            'description': 'Regular user with limited access',
            'permissions': ['create_host', 'read_host', 'update_host', 'delete_host',
                           'send_wol', 'view_logs']
        },
        {
            'name': 'viewer',
            'description': 'Read-only access',
            'permissions': ['read_host', 'view_logs']
        }
    ]
    
    # Create roles if they don't exist
    for role_data in roles_data:
        role = db_session.query(Role).filter_by(name=role_data['name']).first()
        if not role:
            role = Role(name=role_data['name'], description=role_data['description'])
            
            # Add permissions to role
            for perm_name in role_data['permissions']:
                perm = db_session.query(Permission).filter_by(name=perm_name).first()
                if perm:
                    role.permissions.append(perm)
            
            db_session.add(role)
    
    db_session.commit()
    click.echo("Default permissions and roles created successfully.")


@app.cli.command("db-init")
def db_init():
    """Initialize database migration support."""
    from flask_migrate import init
    init()
    click.echo("Migration environment initialized.")


@app.cli.command("db-migrate")
@click.option('--message', '-m', default=None, help='Migration message')
def db_migrate(message):
    """Generate a new migration."""
    from flask_migrate import migrate
    migrate(message=message)
    click.echo("Migration generated.")


@app.cli.command("db-upgrade")
@click.option('--revision', default='head', help='Revision identifier')
def db_upgrade(revision):
    """Upgrade database to a later version."""
    from flask_migrate import upgrade
    upgrade(revision=revision)
    click.echo("Database upgraded.")


@app.cli.command("db-downgrade")
@click.option('--revision', default='-1', help='Revision identifier')
@click.option('--force', is_flag=True, help='Force downgrade without confirmation')
def db_downgrade(revision, force):
    """Downgrade database to an earlier version."""
    from flask_migrate import downgrade, current
    from alembic.util.exc import CommandError
    from sqlalchemy.exc import SQLAlchemyError
    
    try:
        # Get current version
        current_version = None
        try:
            with app.app_context():
                migration_context = current.context._proxy._get_impl()
                current_version = migration_context.get_current_revision()
                
            if current_version:
                click.echo(f"Current database version: {current_version}")
            else:
                click.echo("No migrations applied yet.")
                return
        except Exception as e:
            click.echo(f"Warning: Could not determine current migration version: {str(e)}")
        
        # Confirm downgrade with the user
        if not force:
            click.echo("WARNING: Downgrading the database can result in data loss.")
            if not click.confirm('Are you sure you want to downgrade the database?'):
                click.echo("Database downgrade cancelled.")
                return
        
        # Create a backup if possible
        if app.config.get('SQLALCHEMY_DATABASE_URI', '').startswith('sqlite'):
            try:
                import shutil
                import datetime
                
                # Extract database path from URI
                db_path = app.config['SQLALCHEMY_DATABASE_URI'].replace('sqlite:///', '')
                if os.path.exists(db_path):
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    backup_path = f"{db_path}_{timestamp}.bak"
                    shutil.copy2(db_path, backup_path)
                    click.echo(f"Database backup created at: {backup_path}")
            except Exception as e:
                click.echo(f"Warning: Failed to create database backup: {str(e)}")
                
        # Perform the downgrade
        downgrade(revision=revision)
        click.echo("Database downgraded.")
        
        # Basic integrity check
        try:
            with app.app_context():
                db_session.execute(text("SELECT 1")).scalar()
            click.echo("Database integrity check passed.")
        except SQLAlchemyError as e:
            click.echo(f"Warning: Database integrity check failed: {str(e)}")
            click.echo("The schema might be in an inconsistent state.")
            
    except CommandError as e:
        click.echo(f"Migration error: {str(e)}", err=True)
        sys.exit(1)
    except Exception as e:
        click.echo(f"Unexpected error during database downgrade: {str(e)}", err=True)
        sys.exit(1)


@app.cli.command("db-current")
def db_current():
    """Display the current revision for the database."""
    from flask_migrate import current
    try:
        current()
    except Exception as e:
        click.echo(f"Error retrieving current migration version: {str(e)}", err=True)


@app.cli.command("db-history")
def db_history():
    """List migration history."""
    from flask_migrate import history
    try:
        history()
    except Exception as e:
        click.echo(f"Error retrieving migration history: {str(e)}", err=True)


@app.cli.command("db-check")
def db_check():
    """Verify database migration status and integrity."""
    from flask_migrate import current
    from sqlalchemy.exc import SQLAlchemyError
    
    click.echo("Checking database migration status and integrity...")
    
    # Check alembic migration state
    try:
        with app.app_context():
            migration_context = current.context._proxy._get_impl()
            current_version = migration_context.get_current_revision()
        
        if current_version:
            click.echo(f"✓ Current migration version: {current_version}")
        else:
            click.echo("⚠ No migrations have been applied yet.")
    except Exception as e:
        click.echo(f"⚠ Error checking migration status: {str(e)}", err=True)
        
    # Verify database connection and basic queries
    try:
        with app.app_context():
            # Test database connection
            result = db_session.execute(text("SELECT 1")).scalar()
            if result == 1:
                click.echo("✓ Database connection successful")
            else:
                click.echo("⚠ Database connection returned unexpected result")
                
            # Check for presence of essential tables
            tables_to_check = ['user', 'role', 'permission']
            for table in tables_to_check:
                try:
                    db_session.execute(text(f"SELECT 1 FROM {table} LIMIT 1"))
                    click.echo(f"✓ Table '{table}' exists")
                except SQLAlchemyError as e:
                    click.echo(f"⚠ Table '{table}' check failed: {str(e)}")
    except SQLAlchemyError as e:
        click.echo(f"⚠ Database integrity check failed: {str(e)}", err=True)
    except Exception as e:
        click.echo(f"⚠ Unexpected error during database check: {str(e)}", err=True)
        
    click.echo("Database check completed.")


@app.cli.group()
def logs():
    """Log management commands."""
    pass


@logs.command("view")
@click.option('--log-type', type=click.Choice(['app', 'error', 'access', 'all']), default='app',
              help='Type of log to view')
@click.option('--lines', '-n', default=50, help='Number of lines to display')
@click.option('--follow', '-f', is_flag=True, help='Follow the log (show new entries as they are added)')
def logs_view(log_type, lines, follow):
    """View application logs."""
    ensure_log_directory()
    
    # Map log type to file paths
    log_files = {
        'app': os.path.join(LOG_DIR, APP_LOG),
        'error': os.path.join(LOG_DIR, ERROR_LOG),
        'access': os.path.join(LOG_DIR, ACCESS_LOG)
    }
    
    if log_type == 'all':
        files_to_view = list(log_files.values())
    else:
        files_to_view = [log_files[log_type]]
    
    for log_file in files_to_view:
        if not os.path.exists(log_file):
            click.echo(f"Log file does not exist: {log_file}")
            continue
            
        click.echo(f"\n=== {os.path.basename(log_file)} ===")
        
        # Use the 'tail' command for efficient viewing of large log files
        try:
            if follow:
                # Execute tail with follow option
                import subprocess
                cmd = ['tail', f'-n{lines}', '-f', log_file]
                click.echo(f"Press Ctrl+C to exit follow mode\n")
                try:
                    subprocess.run(cmd)
                except KeyboardInterrupt:
                    pass
            else:
                # Read the last n lines from the file
                with open(log_file, 'r') as f:
                    # Simple implementation of tail
                    lines_list = f.readlines()
                    for line in lines_list[-lines:]:
                        click.echo(line.rstrip())
        except Exception as e:
            click.echo(f"Error reading log file: {str(e)}", err=True)


@logs.command("rotate")
@click.option('--log-type', type=click.Choice(['app', 'error', 'access', 'all']), default='all',
              help='Type of log to rotate')
def logs_rotate(log_type):
    """Force log rotation."""
    ensure_log_directory()
    
    # Map log type to file paths
    log_files = {
        'app': os.path.join(LOG_DIR, APP_LOG),
        'error': os.path.join(LOG_DIR, ERROR_LOG),
        'access': os.path.join(LOG_DIR, ACCESS_LOG)
    }
    
    if log_type == 'all':
        files_to_rotate = list(log_files.values())
    else:
        files_to_rotate = [log_files[log_type]]
    
    for log_file in files_to_rotate:
        if not os.path.exists(log_file):
            click.echo(f"Log file does not exist: {log_file}")
            continue
        
        try:
            # Get the handler for this log file
            for handler in logging.getLogger().handlers + logging.getLogger('app').handlers:
                if isinstance(handler, RotatingFileHandler) and handler.baseFilename == log_file:
                    handler.doRollover()
                    click.echo(f"Rotated log file: {log_file}")
                    break
            else:
                # Fallback: manually rotate the file
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_file = f"{log_file}.{timestamp}"
                shutil.copy2(log_file, backup_file)
                # Clear the original file
                open(log_file, 'w').close()
                click.echo(f"Manually rotated log file: {log_file} → {backup_file}")
        except Exception as e:
            click.echo(f"Error rotating log file {log_file}: {str(e)}", err=True)


@logs.command("clear")
@click.option('--log-type', type=click.Choice(['app', 'error', 'access', 'all']), default=None,
              help='Type of log to clear')
@click.option('--force', is_flag=True, help='Force clearing without confirmation')
def logs_clear(log_type, force):
    """Clear log files."""
    ensure_log_directory()
    
    if not log_type:
        click.echo("Please specify a log type to clear using --log-type option.")
        return
    
    # Map log type to file paths
    log_files = {
        'app': os.path.join(LOG_DIR, APP_LOG),
        'error': os.path.join(LOG_DIR, ERROR_LOG),
        'access': os.path.join(LOG_DIR, ACCESS_LOG)
    }
    
    if log_type == 'all':
        files_to_clear = list(log_files.values())
    else:
        files_to_clear = [log_files[log_type]]
    
    # Confirm with the user unless --force is used
    if not force:
        file_list = "\n  ".join([os.path.basename(f) for f in files_to_clear])
        click.echo(f"This will clear the following log files:\n  {file_list}")
        if not click.confirm('Are you sure you want to continue?'):
            click.echo("Operation cancelled.")
            return
    
    # Create backups before clearing
    backups_created = []
    
    for log_file in files_to_clear:
        if not os.path.exists(log_file):
            click.echo(f"Log file does not exist: {log_file}")
            continue
        
        try:
            # Create a backup
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = f"{log_file}.bak.{timestamp}"
            shutil.copy2(log_file, backup_file)
            backups_created.append((log_file, backup_file))
            
            # Clear the log file
            open(log_file, 'w').close()
            os.chmod(log_file, 0o640)  # Set proper permissions
            click.echo(f"Cleared log file: {log_file}")
        except Exception as e:
            click.echo(f"Error clearing log file {log_file}: {str(e)}", err=True)
    
    if backups_created:
        click.echo("\nBackups created:")
        for original, backup in backups_created:
            click.echo(f"  {os.path.basename(original)} → {os.path.basename(backup)}")


@logs.command("set-level")
@click.option('--profile', type=click.Choice(['LOW', 'MEDIUM', 'HIGH', 'DEBUG']), required=True,
              help='Logging profile to set')
def logs_set_level(profile):
    """Change the logging level at runtime."""
    if profile not in LOG_PROFILES:
        click.echo(f"Invalid logging profile: {profile}", err=True)
        return
    
    try:
        # Get the configuration for the selected profile
        config = LOG_PROFILES[profile]
        
        # Update root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(config['root']['level'])
        
        # Update app loggers
        for logger_name, logger_config in config['loggers'].items():
            logger = logging.getLogger(logger_name)
            logger.setLevel(logger_config['level'])
        
        # Update handler levels
        for handler_name, handler_config in config['handlers'].items():
            if handler_name == 'app_file':
                for handler in root_logger.handlers + logging.getLogger('app').handlers:
                    if isinstance(handler, RotatingFileHandler) and os.path.basename(handler.baseFilename) == APP_LOG:
                        handler.setLevel(handler_config['level'])
            elif handler_name == 'error_file':
                for handler in root_logger.handlers + logging.getLogger('app').handlers:
                    if isinstance(handler, RotatingFileHandler) and os.path.basename(handler.baseFilename) == ERROR_LOG:
                        handler.setLevel(handler_config['level'])
            elif handler_name == 'access_file':
                for handler in logging.getLogger('app.access').handlers:
                    if isinstance(handler, RotatingFileHandler) and os.path.basename(handler.baseFilename) == ACCESS_LOG:
                        handler.setLevel(handler_config['level'])
        
        # Set the environment variable for future processes
        os.environ['LOG_PROFILE'] = profile
        
        click.echo(f"Logging level changed to {profile} profile.")
        
        # Log the level change
        app_logger = logging.getLogger('app')
        app_logger.info(f"Logging level changed to {profile} profile via CLI command.")
        
    except Exception as e:
        click.echo(f"Error changing logging level: {str(e)}", err=True)


@logs.command("status")
def logs_status():
    """Display current logging configuration and status."""
    ensure_log_directory()
    
    # Map log type to file paths
    log_files = {
        'app': os.path.join(LOG_DIR, APP_LOG),
        'error': os.path.join(LOG_DIR, ERROR_LOG),
        'access': os.path.join(LOG_DIR, ACCESS_LOG)
    }
    
    # Get current profile
    current_profile = os.environ.get('LOG_PROFILE', 'MEDIUM')
    
    click.echo(f"Current logging profile: {current_profile}")
    click.echo(f"Log directory: {LOG_DIR}")
    
    # Display log files info
    click.echo("\nLog files:")
    for log_type, log_file in log_files.items():
        if os.path.exists(log_file):
            size = os.path.getsize(log_file)
            size_str = f"{size / 1024:.2f} KB" if size < 1024 * 1024 else f"{size / (1024 * 1024):.2f} MB"
            mtime = os.path.getmtime(log_file)
            mtime_str = datetime.datetime.fromtimestamp(mtime).strftime('%Y-%m-%d %H:%M:%S')
            click.echo(f"  {log_type}: {size_str}, last modified: {mtime_str}")
            
            # Check for rotated log files
            rotated_logs = [f for f in os.listdir(LOG_DIR) if f.startswith(os.path.basename(log_file) + '.')]
            if rotated_logs:
                click.echo(f"    Rotated logs: {len(rotated_logs)}")
        else:
            click.echo(f"  {log_type}: Not created yet")
    
    # Display logger levels
    click.echo("\nCurrent log levels:")
    click.echo(f"  Root: {logging.getLogger().level}")
    click.echo(f"  App: {logging.getLogger('app').level}")
    click.echo(f"  Access: {logging.getLogger('app.access').level}")


if __name__ == '__main__':
    # Create a Flask CLI group with the Flask app
    cli = FlaskGroup(create_app=lambda: app)
    cli()

