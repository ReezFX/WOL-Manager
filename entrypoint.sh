#!/bin/bash

cd /app

# Set Flask app and environment
export FLASK_APP=wsgi.py
export FLASK_CONFIG=development

# Create necessary directories with proper permissions
echo "Creating necessary directories..."
mkdir -p /app/instance/flask_session /app/instance/logs
chmod 770 /app/instance /app/instance/flask_session /app/instance/logs

# Start Redis server in the background
echo "Starting Redis server in the background..."
if redis-server --daemonize yes; then
    echo "Redis server started successfully"
    # Set Redis URL environment variable
    export REDIS_URL="redis://localhost:6379/0"
    echo "REDIS_URL set to $REDIS_URL"
else
    echo "Failed to start Redis server, exiting."
    exit 1
fi

# Make check_admin.py executable (before it's used)
chmod +x check_admin.py || {
    echo "Failed to make check_admin.py executable, this may cause issues later."
}

# Database initialization
echo "Starting database initialization..."

# Apply database migrations (covers both schema creation and updates)
# This eliminates the redundancy of running init-db separately
echo "Applying database migrations..."
if python manage.py db-upgrade; then
    echo "Database migrations applied successfully"
else
    echo "Error applying migrations, attempting to initialize database..."
    if python manage.py init-db; then
        echo "Database initialized successfully"
    else
        echo "Database initialization failed, exiting."
        exit 1
    fi
fi

# Verify critical tables exist
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
    
    # Verify minimum required tables exist
    if len(existing_tables) == 0:
        raise Exception('No tables found in database')
    
    print('Table verification complete.')
" || {
    echo "Table verification failed, please check database configuration."
    exit 1
}

# Check if admin user exists using Python script
echo "Checking if admin user exists..."
if python check_admin.py; then
    echo "Admin user already exists, skipping data initialization."
else
    echo "Admin user not found or database is new, initializing permissions and admin user..."
    
    # Create default permissions
    echo "Creating default permissions..."
    if python manage.py create-permissions; then
        echo "Permissions created successfully"
    else
        echo "Failed to create permissions, but continuing..."
    fi
    
    # Create admin user
    echo "Creating admin user..."
    if python manage.py create-admin; then
        echo "Admin user created successfully"
    else
        echo "Failed to create admin user, but continuing..."
    fi
    
    echo "Data initialization complete."
fi

# Ensure proper permissions on instance directories
echo "Setting proper permissions on instance directories..."
if chown -R nobody:nogroup /app/instance /app/instance/flask_session /app/instance/logs; then
    echo "Permissions set successfully"
else
    echo "Failed to set permissions on instance directories, but continuing..."
fi

# Start the application
echo "Starting the application in production mode..."

# Ensure we're binding to all interfaces
echo "Binding gunicorn to 0.0.0.0:8008 to accept connections from all network interfaces"

# Pass the SESSION_COOKIE_DOMAIN to the Flask application
if [ -n "$SESSION_COOKIE_DOMAIN" ]; then
  echo "Setting session cookie domain to $SESSION_COOKIE_DOMAIN"
else
  echo "SESSION_COOKIE_DOMAIN not set, using empty value"
  export SESSION_COOKIE_DOMAIN=""
fi

# Explicitly set host to 0.0.0.0 to ensure binding to all interfaces
HOST="0.0.0.0"
PORT="8008"
echo "Starting Gunicorn on ${HOST}:${PORT} with 1 worker"

# Set Python optimization environment variables to reduce memory usage
# Python Performance Optimizations
export PYTHONOPTIMIZE=2                    # Enable aggressive optimizations
export PYTHONHASHSEED=random              # Random hash seed for better performance
export PYTHONMALLOC=malloc                # Use system malloc
export PYTHONFAULTHANDLER=1               # Enable faulthandler for better crash reports
export PYTHONWARNINGS="ignore"            # Ignore warnings
export PYTHONGC_STATS=0                   # Disable GC stats
# For better memory management
export MALLOC_TRIM_THRESHOLD_=65536
export MALLOC_TOP_PAD_=1
export MALLOC_MMAP_THRESHOLD_=1024

# Execute gunicorn with binding to all interfaces and memory optimization flags
exec gunicorn \
    --bind ${HOST}:${PORT} \
    --workers 1 \
    --worker-class gthread \
    --backlog 2048 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    "wsgi:app"

