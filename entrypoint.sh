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

# Always run init-db to ensure all tables are created (regardless of whether the database exists)
echo "Ensuring all database tables are created..."
python manage.py init-db || echo "Table creation failed, continuing..."

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
chown -R nobody:nogroup /app/instance || echo "Failed to set permissions on instance directory, continuing..."

# Start the application
echo "Starting the application in production mode..."

# Ensure we're binding to all interfaces
echo "Binding gunicorn to 0.0.0.0:8080 to accept connections from all network interfaces"

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
PORT="8080"
echo "Starting Gunicorn on ${HOST}:${PORT} with 4 workers"

# Execute gunicorn with binding to all interfaces
exec gunicorn --bind ${HOST}:${PORT} --workers 4 --timeout 120 wsgi:app

