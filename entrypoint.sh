#!/bin/bash

cd /app

# Set Flask app and environment
export FLASK_APP=wsgi.py
export FLASK_CONFIG=production

# Create instance directory with proper permissions
mkdir -p /app/instance
chmod 770 /app/instance

# Create flask_session directory with proper permissions
mkdir -p /app/instance/flask_session
chmod 770 /app/instance/flask_session

# Create logs directory with proper permissions
mkdir -p /app/logs
chmod 770 /app/logs

# Database initialization and migration process
echo "Starting database initialization and migration process..."

# Initialize the database structure
echo "Initializing database..."
python manage.py db-init || echo "Database already initialized, continuing..."

# Create and run migrations
echo "Creating and running migrations..."
python manage.py db-migrate || echo "Migration creation failed or already exists, continuing..."
python manage.py db-upgrade || echo "Migration upgrade failed, continuing..."

# Always run init-db to ensure all tables are created (regardless of whether the database exists)
echo "Ensuring all database tables are created..."
python manage.py init-db

# Verify critical tables exist and create them if needed
echo "Verifying critical tables exist..."
python -c "
import sqlite3
from app import create_app
from app.models import Base, SystemLog, AuthLog
from sqlalchemy import inspect, create_engine

app = create_app()
with app.app_context():
    # Get database URI from app config
    db_uri = app.config['SQLALCHEMY_DATABASE_URI']
    engine = create_engine(db_uri)
    inspector = inspect(engine)
    
    # Check if the tables exist
    existing_tables = inspector.get_table_names()
    print(f'Existing tables: {existing_tables}')
    
    # Check SystemLog table
    if 'system_logs' not in existing_tables:
        print('SystemLog table not found, creating...')
        SystemLog.__table__.create(engine, checkfirst=True)
    
    # Check AuthLog table
    if 'auth_logs' not in existing_tables:
        print('AuthLog table not found, creating...')
        AuthLog.__table__.create(engine, checkfirst=True)
    
    print('Table verification complete.')
" || echo "Table verification failed, please check database configuration."

# Check if database exists and need to initialize data
if [ -f /app/instance/wol.db ]; then
    echo "Database exists, checking if data needs to be initialized..."
    
    # Check if admin user exists using Python script
    python check_admin.py
    ADMIN_EXISTS=$?
    
    if [ "$ADMIN_EXISTS" -ne 0 ]; then
        echo "Admin user not found, initializing data..."
        
        # Create default permissions
        echo "Creating default permissions..."
        python manage.py create-permissions || echo "Failed to create permissions, continuing..."
        
        # Create admin user
        echo "Creating admin user..."
        python manage.py create-admin || echo "Failed to create admin user, continuing..."
    else
        echo "Admin user already exists, skipping data initialization."
    fi
else
    echo "Initializing database from scratch..."
    # Tables already created above, so we don't need to run init-db again
    
    # Create default permissions
    echo "Creating default permissions..."
    python manage.py create-permissions
    
    # Create admin user
    echo "Creating admin user..."
    python manage.py create-admin
    
    echo "Database initialization complete."
fi

# Make check_admin.py executable
chmod +x check_admin.py

# Ensure proper permissions on database file
chown -R nobody:nogroup /app/instance /app/instance/flask_session /app/logs || echo "Failed to set permissions on instance directory, continuing..."

# Start the application
echo "Starting the application in production mode..."

# Ensure we're binding to all interfaces
echo "Binding gunicorn to 0.0.0.0:8008 to accept connections from all network interfaces"

# Check current network interfaces for diagnostic purposes
echo "Network interfaces on this container:"
ip addr show || echo "ip command not available"
# Pass the SESSION_COOKIE_DOMAIN to the Flask application
if [ -n "$SESSION_COOKIE_DOMAIN" ]; then
  echo "Setting session cookie domain to $SESSION_COOKIE_DOMAIN"
else
  echo "SESSION_COOKIE_DOMAIN not set, using empty value"
  export SESSION_COOKIE_DOMAIN=""
fi
export SESSION_COOKIE_DOMAIN="${SESSION_COOKIE_DOMAIN}"

# Explicitly set host to 0.0.0.0 to ensure binding to all interfaces
HOST="0.0.0.0"
PORT="8008"
echo "Starting Gunicorn on ${HOST}:${PORT} with 4 workers"

# Execute gunicorn with binding to all interfaces
exec gunicorn --user nobody --bind ${HOST}:${PORT} --workers 4 --timeout 120 wsgi:app

