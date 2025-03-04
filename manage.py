#!/usr/bin/env python3
import os
import click
from flask.cli import FlaskGroup
from flask_migrate import Migrate
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
def db_downgrade(revision):
    """Downgrade database to an earlier version."""
    from flask_migrate import downgrade
    downgrade(revision=revision)
    click.echo("Database downgraded.")


@app.cli.command("db-current")
def db_current():
    """Display the current revision for the database."""
    from flask_migrate import current
    current()


@app.cli.command("db-history")
def db_history():
    """List migration history."""
    from flask_migrate import history
    history()


if __name__ == '__main__':
    # Create a Flask CLI group with the Flask app
    cli = FlaskGroup(create_app=lambda: app)
    cli()

