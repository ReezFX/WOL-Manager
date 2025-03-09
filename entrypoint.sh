#!/bin/bash
set -e

cd /app

# Make sure FLASK_APP is set
export FLASK_APP=manage.py

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
else
    echo "Database already exists, skipping initialization"
fi

# Start the application
exec gunicorn --bind 0.0.0.0:8080 wsgi:app
