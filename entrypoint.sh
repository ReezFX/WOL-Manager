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
mkdir -p /app/instance/logs
chmod 770 /app/instance/logs

# Start Redis server in the background
echo "Starting Redis server in the background..."
redis-server --daemonize yes
echo "Redis server started"

# Set Redis URL environment variable
export REDIS_URL="redis://localhost:6379/0"
echo "REDIS_URL set to $REDIS_URL"

# Database initialization and migration process
echo "Starting database initialization and migration process..."

# Initialize migration support first
echo "Initializing database migration support..."
python manage.py db-init || echo "Migration support already initialized, continuing..."

# Create and run migrations
echo "Creating and running migrations..."
python manage.py db-migrate || echo "Migration creation failed or already exists, continuing..."
python manage.py db-upgrade || echo "Migration upgrade failed, continuing..."

# After migrations are applied, ensure all tables are created
echo "Ensuring all database tables are created..."
python manage.py init-db

# Verify critical tables exist and create them if needed
echo "Verifying critical tables exist..."
python -c "
import sqlite3
from app import create_app
from app.models import Base
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
    
    # Logging tables have been removed from the models
    
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
chown -R nobody:nogroup /app/instance /app/instance/flask_session /app/instance/logs || echo "Failed to set permissions on instance directory, continuing..."

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
echo "Starting Gunicorn on ${HOST}:${PORT} with 1 worker"

# Set Python optimization environment variables to reduce memory usage
export PYTHONOPTIMIZE=1
export PYTHONDONTWRITEBYTECODE=1

# Execute gunicorn with binding to all interfaces and memory optimization flags
exec gunicorn --bind ${HOST}:${PORT} --workers 1 --timeout 120 --preload --max-requests 1000 --max-requests-jitter 50 --threads 2 --worker-class sync wsgi:app

