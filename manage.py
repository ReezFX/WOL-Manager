#!/usr/bin/env python3
import os
import click
import sys
import logging
from flask.cli import FlaskGroup
from flask_migrate import Migrate
from sqlalchemy import text
from app import create_app, db_session
from app.models import User, Role, Permission, Base
from app.auth import hash_password

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
if __name__ == '__main__':
    # Create a Flask CLI group with the Flask app
    cli = FlaskGroup(create_app=lambda: app)
    cli()

