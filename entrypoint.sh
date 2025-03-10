#!/bin/bash

cd /app

# Set Flask app and environment
export FLASK_APP=wsgi.py
export FLASK_CONFIG=production

# Create instance directory with proper permissions
mkdir -p /app/instance
chmod 777 /app/instance

# Database initialization and migration process
echo "Starting database initialization and migration process..."

# Initialize the database structure
echo "Initializing database..."
python manage.py db-init || echo "Database already initialized, continuing..."

# Create and run migrations
echo "Creating and running migrations..."
python manage.py db-migrate || echo "Migration creation failed or already exists, continuing..."
python manage.py db-upgrade || echo "Migration upgrade failed, continuing..."

# Check if database exists, initialize if needed
if [ -f /app/instance/wol.db ]; then
    echo "Database already exists, checking if data needs to be initialized..."
    
    # Check if admin user exists
    ADMIN_EXISTS=$(sqlite3 /app/instance/wol.db "SELECT COUNT(*) FROM users WHERE username='admin'" 2>/dev/null || echo "0")
    
    if [ "$ADMIN_EXISTS" = "0" ]; then
        echo "Admin user not found, initializing data..."
        # Run init-db to create tables
        python manage.py init-db || echo "Table creation failed, continuing..."
        
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
    # Run init-db to create tables
    python manage.py init-db
    
    # Create default permissions
    echo "Creating default permissions..."
    python manage.py create-permissions
    
    # Create admin user
    echo "Creating admin user..."
    python manage.py create-admin
    
    echo "Database initialization complete."
fi

# Ensure proper permissions on database file
chown -R nobody:nogroup /app/instance || echo "Failed to set permissions on instance directory, continuing..."

# Start the application
echo "Starting the application in production mode..."
exec gunicorn --bind 0.0.0.0:8080 --workers 4 --timeout 120 wsgi:app
