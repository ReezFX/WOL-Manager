# WOL-Manager

## Overview
WOL-Manager is a Flask-based web application designed to provide a user-friendly interface for managing and waking devices using the Wake-on-LAN (WOL) protocol. This application allows users to store host information, including MAC addresses, and remotely power on these devices over a network.

## Table of Contents
- [Features](#features)
- [System Requirements](#system-requirements)
- [Installation](#installation)
  - [Docker Installation (Recommended)](#docker-installation-recommended)
  - [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Application Structure](#application-structure)
- [Database](#database)
- [API Endpoints](#api-endpoints)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Release Notes](#release-notes)
- [Contributing](#contributing)

## Features
- **Host Management**: Add, edit, view, and delete networked devices with MAC addresses
- **Wake-on-LAN**: Send magic packets to wake devices remotely
- **User Authentication**: Secure login system with session management
- **Role-based Access Control**: Different permission levels for users and administrators, with host visibility controls based on user roles
- **Logging**: Track wake attempts and results for auditing purposes
- **Responsive UI**: Web interface that works on desktop and mobile devices
- **Docker Support**: Easy deployment using containers

## System Requirements
- Python 3.8 or higher (if installing manually)
- Docker and Docker Compose (if using containerized deployment)
- Network with support for broadcast UDP packets
- Devices configured to support Wake-on-LAN

## Installation

### Docker Installation (Recommended)
The easiest way to run WOL-Manager is using Docker. You have two options:

#### Option 1: Using Pre-built Docker Image (Quickest)

1. Pull the image from Docker Hub:
   ```bash
   docker pull officialreez/wol-manager-web
   ```

2. Run the container:
   ```bash
   docker run -d -p 8008:8008 -v wol-manager-data:/app/instance --name wol-manager officialreez/wol-manager-web
   ```

3. Access the application at `http://localhost:8008`

#### Option 2: Building from Source

1. Clone the repository:
   ```bash
   git clone https://github.com/ReezFX/WOL-Manager.git
   cd WOL-Manager
   ```

2. Start the application using Docker Compose:
   ```bash
   docker compose build
   docker compose up -d
   ```

3. Access the application at `http://localhost:8008`

Both Docker setups include:
- Application container running on port 8008
- Persistent database storage using Docker volumes
- Automatic database initialization
### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/WOL-Manager.git
   cd WOL-Manager
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the application (see Configuration section)

5. Initialize the database:
   ```bash
   python manage.py db_init
   ```

6. Create an admin user:
   ```bash
   python manage.py create_admin
   ```

7. Run the application:
   ```bash
   gunicorn --bind 0.0.0.0:8000 wsgi:app
   ```

## Configuration

### Environment Variables
The application can be configured using the following environment variables:

- `FLASK_APP`: Set to `wsgi.py` (default)
- `FLASK_CONFIG`: Configuration environment (`development`, `testing`, `production`)
- `FLASK_DEBUG`: Enable debug mode (1 for enabled, 0 for disabled)
- `SECRET_KEY`: Secret key for session management (change this in production!)

### Configuration Classes
The application uses class-based configuration defined in `app/config.py`:

- `DevelopmentConfig`: For development environments with debugging enabled
- `TestingConfig`: For running tests
- `ProductionConfig`: For production deployments with security features enabled

### Database Configuration
By default, the application uses SQLite:
- Development: `sqlite:///wol.db` (project root)
- Docker: `/app/instance/wol.db` (persisted in a Docker volume)

To change database settings, modify `app/config.py`.

## Usage

### Initial Login
After installation, you can log in with the default admin account:
- Username: `WOLadmin`
- Password: `Manager`

**Important:** Change the default admin password immediately after first login.

### Adding Hosts
1. Log in to the application
2. Navigate to "Hosts" > "Add Host"
3. Enter the required information:
   - Name: A descriptive name for the device
   - MAC Address: The physical address in any standard format (e.g., 00:11:22:33:44:55)
   - IP Address (optional): The device's IP address
   - Description (optional): Additional information about the device
   - Visible to Roles: Select which user roles can view this host

### Waking Devices
1. Go to the dashboard or hosts list
2. Find the host you want to wake
3. Click the "Wake" button next to the host
4. The application will send a magic packet to the device
5. Check the wake status in the logs

### User Management (Admin Only)
1. Navigate to "Admin" > "Users"
2. Manage user accounts:
   - Create new users
   - Create new users
   - Edit existing users
   - Assign roles and permissions
   - Delete users
   - Control host visibility by role (added in v1.0.4)
## Application Structure
```
WOL-Manager/
├── app/                        # Main application directory
│   ├── __init__.py             # Application factory and initialization
│   ├── admin.py                # Admin panel routes and functions
│   ├── auth.py                 # Authentication routes and functions
│   ├── config.py               # Configuration settings
│   ├── forms.py                # Form definitions and validations
│   ├── host.py                 # Host management routes
│   ├── main.py                 # Main application routes and dashboard
│   ├── models.py               # Database models (SQLAlchemy)
│   ├── routes.py               # General routing functions
│   ├── wol.py                  # Wake-on-LAN functionality
│   └── templates/              # HTML templates
│       ├── admin/              # Admin panel templates
│       ├── auth/               # Authentication templates
│       ├── host/               # Host management templates
│       ├── main/               # Main page templates
│       └── wol/                # WOL-specific templates
├── instance/                   # Instance-specific data (database)
├── manage.py                   # Management script
├── Dockerfile                  # Docker configuration
├── docker-compose.yml          # Docker Compose configuration
├── entrypoint.sh               # Docker entrypoint script
├── requirements.txt            # Python dependencies
└── wsgi.py                     # WSGI application entry point
```

## Database
The application uses SQLAlchemy ORM with the following models:

### User Model
Stores user account information:
- ID: Primary key
- Email: Unique user identifier
- Password Hash: Securely stored password
- Name: User's display name
- Role ID: Foreign key to Role model
- Active: Account status flag

### Role Model
Defines user roles with permissions:
- ID: Primary key
- Name: Role name (e.g., User, Admin)
- Default: Boolean indicating if this is the default role
- Permissions: Bitmask of assigned permissions

### Permission Model
Individual access rights used in the application:
- HOST_READ: View hosts
- HOST_WRITE: Create/modify hosts
- HOST_ADMIN: Full control over all hosts
- ADMIN: Administrative access to the application

### Host Model
Stores device information for Wake-on-LAN:
- ID: Primary key
- Name: Descriptive name for the device
- MAC Address: Physical hardware address
- IP Address: Optional IP address
- User ID: Foreign key to the owner
- Description: Optional additional information
- Created At: Timestamp
- Visible to Roles: Array of role IDs that can view this host

### Log Model
Records of wake attempts:
- ID: Primary key
- Host ID: Foreign key to the host
- User ID: Foreign key to the user who initiated
- Success: Boolean indicating operation success
- Message: Details about the operation
- Timestamp: When the operation occurred

## API Endpoints

### Authentication Routes
- `GET/POST /auth/login`: User login
- `GET /auth/logout`: User logout
- `GET/POST /auth/register`: New user registration
- `GET/POST /auth/reset-password`: Password reset

### Host Management
- `GET /hosts`: List hosts
- `GET/POST /host/add`: Add a new host
- `GET/POST /host/<id>/edit`: Edit host details
- `POST /host/<id>/delete`: Delete a host
- `POST /host/<id>/wake`: Wake a host

### Main Routes
- `GET /`: Dashboard
- `GET /profile`: User profile
- `GET /logs`: View operation logs

### Admin Routes
- `GET /admin/users`: List users
- `GET/POST /admin/user/<id>/edit`: Edit user details
- `POST /admin/user/<id>/delete`: Delete a user

## Security
- Passwords are hashed using Werkzeug's security functions
- CSRF protection on all forms
- Rate limiting on wake attempts (10 per 5 minutes)
- Role-based access control to protected resources
- Input validation for all form fields

## Troubleshooting

### Wake-on-LAN Not Working
1. Ensure the target device has WOL enabled in BIOS/UEFI
2. Verify the MAC address is correct
3. Check if your network allows broadcast UDP packets
4. Try using a specific IP address if broadcast packets are blocked

### Host Visibility Issues
If users cannot see hosts that should be visible to them:
1. Verify the user has the correct role assignment in the user_roles table
2. Check that the host's visible_to_roles field includes the user's role ID
3. Ensure that newly registered users are properly assigned to the 'user' role (fixed in v1.0.4)
4. For admin users, verify they have both 'admin' and 'user' roles if they need to see hosts visible to 'user' role

### Database Issues
If you encounter database errors:
1. For Docker: Ensure the volume is properly mounted
2. For manual installation: Check file permissions on the database file
3. Run database initialization: `python manage.py db_init`

### Cannot Access Web Interface
1. Verify the container/service is running
2. Check port mappings (8008 by default)
3. Ensure there are no firewall rules blocking access

### Form Submission Errors
If you encounter 400 Bad Request errors when submitting forms:
1. Check for CSRF token errors in the error message (e.g., "The CSRF token is missing")
2. Ensure all forms include the CSRF token with `<input type="hidden" name="csrf_token" value="{{ csrf_token() }}">`
3. For forms using WTForms, include `{{ form.hidden_tag() }}` at the beginning of the form
4. Verify that your session hasn't expired, as CSRF tokens are session-specific
5. If using AJAX requests, ensure the CSRF token is included in the request headers
6. Clear browser cache and cookies if persistent CSRF issues occur

## Contributing
## Release Notes

### Version 1.0.6 (2025-03-05)
- Fixed CSRF token missing in the change_password.html template
- Improved security for password change functionality
- Added protection against cross-site request forgery attacks

### Version 1.0.4 (2025-03-05)
- Fixed role-based host visibility issues with user role assignment
- Improved role handling to ensure proper visibility of hosts to users with assigned roles
- Added proper role assignment for newly registered users
- Updated role assignment in admin user creation to maintain both legacy role column and new role system
- Fixed permission validation to ensure consistent access control

### Version 1.0.3 (2025-03-05)
- Fixed SQLite compatibility issues with JSON operators in host list view
- Improved database query performance for host filtering

### Version 1.0.2 (2025-04-05)
- Fixed host visibility issues related to admin users
- Enhanced error handling for wake-on-lan operations

### Version 1.0.1 (2025-03-04)
- Added role-based host visibility feature
- Database schema updated to include visible_to_roles field for hosts
- UI improvements for mobile devices

## Contributing
Contributions to WOL-Manager are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please adhere to the existing code style and add unit tests for any new functionality.


