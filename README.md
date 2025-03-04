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
- [Contributing](#contributing)

## Features
- **Host Management**: Add, edit, view, and delete networked devices with MAC addresses
- **Wake-on-LAN**: Send magic packets to wake devices remotely
- **User Authentication**: Secure login system with session management
- **Role-based Access Control**: Different permission levels for users and administrators
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
The easiest way to run WOL-Manager is using Docker:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/WOL-Manager.git
   cd WOL-Manager
   ```

2. Start the application using Docker Compose:
   ```bash
   docker compose build
   docker compose up -d
   ```

3. Access the application at `http://localhost:8008`

The Docker setup includes:
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
   - Edit existing users
   - Assign roles and permissions
   - Delete users

## Application Structure
```
WOL-Manager/
├── app/                        # Main application directory
│   ├── __init__.py             # Application factory and initialization
│   ├── auth.py                 # Authentication routes and functions
│   ├── config.py               # Configuration settings
│   ├── forms.py                # Form definitions and validations
│   ├── host.py                 # Host management routes
│   ├── main.py                 # Main application routes and dashboard
│   ├── models.py               # Database models (SQLAlchemy)
│   ├── wol.py                  # Wake-on-LAN functionality
│   └── templates/              # HTML templates
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

### Database Issues
If you encounter database errors:
1. For Docker: Ensure the volume is properly mounted
2. For manual installation: Check file permissions on the database file
3. Run database initialization: `python manage.py db_init`

### Cannot Access Web Interface
1. Verify the container/service is running
2. Check port mappings (8008 by default)
3. Ensure there are no firewall rules blocking access

## Contributing
Contributions to WOL-Manager are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please adhere to the existing code style and add unit tests for any new functionality.

