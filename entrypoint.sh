#!/bin/bash
set -e

cd /app

# Make sure FLASK_APP is set
export FLASK_APP=manage.py

# Ensure instance directory exists and has proper permissions
if [ ! -d /app/instance ]; then
    echo "Creating instance directory..."
    mkdir -p /app/instance
fi

# Set proper permissions on instance directory
echo "Setting proper permissions on instance directory..."
chmod 755 /app/instance

# Explicitly set the database URI
export SQLALCHEMY_DATABASE_URI=${SQLALCHEMY_DATABASE_URI:-"sqlite:////app/instance/wol.db"}
echo "Using database: $SQLALCHEMY_DATABASE_URI"

# Initialize database if it doesn't exist
if [ ! -f /app/instance/wol.db ]; then
    echo "Database not found, initializing..."
    
    # Use set +e to continue despite errors
    set +e
    
    flask init-db
    flask db-init
    flask db-migrate -m "Initial migration"
    flask db-upgrade
    flask create-permissions
    flask create-admin
    
    # Re-enable exit on error
    set -e
    
    echo "Database initialization complete!"
    
    # Ensure the database file has proper permissions
    if [ -f /app/instance/wol.db ]; then
        echo "Setting proper permissions on database file..."
        chmod 664 /app/instance/wol.db
    fi
else
    echo "Database already exists, skipping initialization"
    
    # Still ensure proper permissions on existing database
    echo "Setting proper permissions on existing database file..."
    chmod 664 /app/instance/wol.db
fi

# Start the application
exec gunicorn --bind 0.0.0.0:8080 wsgi:app
