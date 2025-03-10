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
- **User Authentication**: Secure login system with session management (admin-managed user accounts)
- **Role-based Access Control**: Different permission levels for users and administrators, with host visibility controls based on user roles
- **Logging**: Track wake attempts and results for auditing purposes
- **Responsive UI**: Web interface that works on desktop and mobile devices
- **Dark/Light Mode**: Toggle between dark and light themes with automatic system preference detection
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

The official Docker image supports both arm64 and amd64 architectures.

1. Pull the image from Docker Hub:
   ```bash
   docker pull officialreez/wol-manager-web:latest
   ```

2. Run the container with proper environment variables:
   ```bash
   docker run -d --name wol-manager -p 8008:8080 -v wol_data:/app/instance -e FLASK_APP=wsgi.py -e FLASK_CONFIG=development -e FLASK_DEBUG=1 -e SECRET_KEY=dev-key-change-in-production --restart unless-stopped officialreez/wol-manager-web:latest
   ```

   **Important Environment Variables:**
   - `FLASK_APP`: Set to `wsgi.py` (default)
   - `FLASK_CONFIG`: Set to `production` for production deployments
   - `SECRET_KEY`: **Required** - Set a secure, unique key for session encryption (change this from the example!)

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

#### Option 3: Building Multi-architecture Images (Advanced)

If you need to build the image for multiple architectures (arm64/amd64):

1. Set up Docker buildx:
   ```bash
   docker buildx create --name mybuilder --use
   ```

2. Build and push multi-architecture images:
   ```bash
   docker buildx build --platform linux/amd64,linux/arm64 \
     -t yourusername/wol-manager-web:latest \
     --push .
   ```

All Docker setups include:
- Application container running internally on port 8080, mapped to external port 8008
- Persistent database storage using Docker volumes
- Automatic database initialization
- Cross-platform compatibility (arm64/amd64) - Docker images are built for both architectures and will automatically use the correct one for your system
### Manual Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ReezFX/WOL-Manager.git
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
   python manage.py init-db
   python manage.py db-init
   python manage.py db-migrate
   python manage.py db-upgrade
   python manage.py create-permissions  # Creates standard permissions: create_host, read_host, update_host, delete_host, admin
   ```

6. Create an admin user:
   ```bash
   python manage.py create-admin
   ```

7. Run the application:
   ```bash
   gunicorn --bind 0.0.0.0:8000 wsgi:app
   ```

## Configuration

### Environment Variables
The application can be configured using the following environment variables:
- `FLASK_APP`: Set to `wsgi.py` (default)
- `FLASK_ENV`: Used in application factory to determine environment (`development`, `testing`, `production`)
- `FLASK_CONFIG`: Configuration environment used in config.py (`development`, `testing`, `production`)
- `FLASK_DEBUG`: Enable debug mode (1 for enabled, 0 for disabled)
- `SECRET_KEY`: Secret key for session management (change this in production!)

### Configuration Classes
The application uses class-based configuration defined in `app/config.py`:

- `DevelopmentConfig`: For development environments with debugging enabled
- `TestingConfig`: For running tests
- `ProductionConfig`: For production deployments with security features enabled

### Database Configuration
By default, the application uses SQLite:
- Development: `sqlite:///{os.path.join(BASE_DIR, "..", "wol.db")}` (relative to BASE_DIR)
- Docker: `/app/instance/wol.db` (persisted in a Docker volume)

To change database settings, modify `app/config.py`.

## Usage

### Initial Login
After installation, you can log in with the default admin account:
- Username: `WOLadmin`
- Password: `Manager`

**Important:** Change the default admin password immediately after first login.

### Adding Hosts
1. Log in to the application (user must have the 'create_host' permission)
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
2. Click on "Settings" to configure application-wide settings
3. Manage user accounts:
   - Create new users (only administrators can create user accounts)
   - Edit existing users
   - Assign roles and permissions
   - Delete users
   - Control host visibility by role (added in v1.0.4)

### Theme Switching
1. Click the theme toggle button in the top-right corner of the navigation bar
2. The icon shows a sun when in dark mode (click to switch to light mode)
3. The icon shows a moon when in light mode (click to switch to dark mode)
4. Your preference is automatically saved in your browser and will persist across sessions
5. By default, the application will use your system's theme preference
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
- Role ID: Foreign key to Role model (legacy)
- Active: Account status flag
- Roles: Many-to-many relationship with Role model through an association table

### Role Model
Defines user roles with permissions:
- ID: Primary key
- Name: Role name (e.g., User, Admin)
- Default: Boolean indicating if this is the default role
- Permissions: Bitmask of assigned permissions
- Users: Many-to-many relationship with User model through an association table

### Permission Model
Individual access rights used in the application:
- HOST_READ: View hosts (permission name: `read_host`)
- HOST_WRITE: Create/modify hosts (permission names: `create_host`, `update_host`)
- HOST_ADMIN: Full control over all hosts (permission name: `delete_host`)
- ADMIN: Administrative access to the application (permission name: `admin`)

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
- `GET/POST /admin/settings`: Configure application settings

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
3. Ensure that newly created users are properly assigned to the 'user' role (fixed in v1.0.4)
4. For admin users, verify they have both 'admin' and 'user' roles if they need to see hosts visible to 'user' role

### Database Issues
If you encounter database errors:
1. For Docker: Ensure the volume is properly mounted
2. For manual installation: Check file permissions on the database file
3. Run database initialization: `python manage.py init-db` or `python manage.py db-init`

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

## Release Notes

### Version 1.1.0 (2025-03-10)
- Improved CSRF token management for multi-worker environments
- Added Redis session storage for consistent session handling across worker processes
- Enhanced security with configurable session cookie parameters
- Fixed "Bad Request error CSRF Token is invalid" during login and form submissions
- Implemented more robust error handling for CSRF validation failures
- Extended CSRF token validity period to improve user experience

### Version 1.0.9.2 (2023-03-10)
- Added multi-architecture Docker image support for both amd64 and arm64 platforms
- Fixed container startup issues with gunicorn bind address configuration
- Corrected Config class initialization issue in configuration system
- Updated Docker deployment documentation with specific version tags
- Improved Docker Hub integration with automated multi-platform builds

### Version 1.0.9 (2025-03-09)
- Added new AppSettings feature for application-wide configuration
- Created dedicated Settings page in Admin interface for managing application settings
- Implemented configurable password policies (minimum length, special characters, numbers)
- Added session timeout configuration
- Added password expiration policies
- Enhanced security with configurable concurrent session limits
- All settings accessible through a centralized admin interface

### Version 1.0.8.1 (2025-03-06)
- Hotfixes for dark/light mode theme switching:
  - Fixed color contrast issues in the admin/users/permissions page
  - Improved styling of card headers and form elements to properly adapt to theme changes
  - Enhanced text readability for permission descriptions in both light and dark modes
  - Resolved background color adaptation issues in the permission management interface
  - Improved overall visual consistency when switching between themes

### Version 1.0.8 (2025-03-6)
- Added dark/light mode toggle feature
- Implemented theme switching with user preference persistence
- Added system theme preference detection
- Enhanced UI accessibility for different lighting conditions
- Improved visual consistency across all components in both themes

### Version 1.0.7.2 (2025-03-06)
- Fixed permission issue with host creation functionality
- Corrected permission check from 'add_hosts' to 'create_host' to match the actual permission in the system
- Improved permission system documentation for clarity

### Version 1.0.7.1 (2025-03-06)
- Fixed internal server error on the admin users page caused by field name mismatch
- Corrected template field reference from password2 to password_confirm

### Version 1.0.7 (2025-03-06)
- Removed user self-registration functionality
- User accounts are now exclusively managed by administrators
- Updated UI to reflect the new user management workflow
- Enhanced security by centralizing user account creation

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


