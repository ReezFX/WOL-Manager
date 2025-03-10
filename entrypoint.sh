#!/bin/bash

cd /app

# Set Flask app
export FLASK_APP=wsgi.py

# Create instance directory
mkdir -p /app/instance

# Check if database exists, initialize if needed
if [ -f /app/instance/wol.db ]; then
    echo "Database already exists. Skipping initialization."
else
    echo "Initializing database..."
    python manage.py init-db
    
    echo "Creating default permissions..."
    python manage.py create-permissions
    
    echo "Creating admin user..."
    python manage.py create-admin
    
    echo "Database initialization complete."
fi

# Start the application
echo "Starting the application..."
exec gunicorn --bind 0.0.0.0:8080 wsgi:app
