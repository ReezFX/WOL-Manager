# Wake-on-LAN Manager - Application Structure

## 1. Application Overview

The Wake-on-LAN Manager is a web-based application designed to provide a centralized solution for managing and executing Wake-on-LAN (WoL) operations across a network. It allows administrators and authorized users to remotely power on networked devices by sending "magic packets" to target machines.

**Key Features:**
- Remote device power-on via Wake-on-LAN
- Centralized management of host devices
- User-friendly web interface
- Role-based access control
- Public host access with secure permalinks
- Secure authentication
- Logging and auditing of wake attempts
- Docker-based deployment

The application solves the problem of having to manually access each machine or use command-line tools to send wake-up packets, providing instead a unified interface that can be accessed from anywhere on the network.

## 2. Core Components

The application is built using the Flask web framework and follows a modular blueprint-based architecture:

### Framework and Libraries
- **Flask**: Core web framework
- **Flask-SQLAlchemy**: ORM for database operations
- **Flask-Login**: User session management
- **Flask-WTF**: Form handling and CSRF protection with comprehensive validation
- **bcrypt**: Password hashing
- **redis**: Session storage and caching

### Architecture
The application follows a Model-View-Controller (MVC) pattern:
- **Models**: Database entities (User, Role, Permission, Host, AppSettings)
- **Views**: Flask routes and Jinja2 templates
- **Controllers**: Logic in route handlers

### Component Diagram
```
[User Browser] <--> [Gunicorn WSGI Server] <--> [Flask Application]
                                                      |
                       [Redis Cache/Session] <--------|------> [SQLite Database]
                                                      |
                                                      v
                                               [Network Interface]
                                                      |
                                                      v
                                            [WoL Target Devices]
```

### Application Structure Tree
```
WOL-Manager/
├── app/                              # Main application package
│   ├── __init__.py                   # App initialization and factory
│   ├── admin.py                      # Admin interface routes & logic
│   ├── auth.py                       # Authentication routes & logic
│   ├── config.py                     # Configuration settings
│   ├── forms.py                      # Form definitions & validation
│   ├── host.py                       # Host management routes & logic
│   ├── logging_config.py             # Logging system configuration
│   ├── main.py                       # Main routes & dashboard
│   ├── models.py                     # Database models
│   ├── ping.py                       # ICMP ping implementation
│   ├── ping_cache.py                 # Redis-based ping caching
│   ├── wol.py                        # Wake-on-LAN implementation
│   ├── static/                       # Static assets
│   │   ├── css/                      # Stylesheets
│   │   ├── js/                       # JavaScript files
│   │   └── img/                      # Images and icons
│   └── templates/                    # Jinja2 templates
│       ├── base.html                 # Base template with layout
│       ├── index.html                # Main landing page
│       ├── admin/                    # Admin interface templates
│       │   ├── dashboard.html        # Admin dashboard
│       │   ├── logs.html             # Log viewer
│       │   ├── settings.html         # App settings
│       │   └── users.html            # User management
│       ├── auth/                     # Authentication templates
│       │   ├── login.html            # Login form
│       │   └── profile.html          # User profile
│       ├── host/                     # Host management templates
│       │   ├── create.html           # Create/edit host
│       │   ├── list.html             # Host listing
│       │   └── view.html             # Host details
│       └── wol/                      # WoL templates
│           ├── confirm.html          # Wake confirmation
│           └── success.html          # Wake result
├── instance/                         # Instance-specific config
│   ├── wol.db                        # SQLite database
│   └── logs/                         # Logfiles
│       ├── app.log                   # Create/edit host
│       ├── access.log                # Host listing
│       └── error.log                 # Host details
├── Dockerfile                        # Docker container definition
├── docker-compose.yml                # Multi-container setup
├── entrypoint.sh                     # Container startup script
├── detect_ip.sh                      # Network configuration helper
└── requirements.txt                  # Python dependencies
```
## 3. Database Structure

The application uses SQLAlchemy ORM with the following models:

### User Model
- Stores user authentication information and profile details
- Fields:
  - `id`: Primary key
  - `username`: Unique username
  - `email`: User's email address
  - `password_hash`: Bcrypt-hashed password
  - `active`: Account status
  - `roles`: Relationship to Role model (many-to-many)

### Role Model
- Defines user roles for access control
- Fields:
  - `id`: Primary key
  - `name`: Role name (e.g., Admin, User)
  - `permissions`: Relationship to Permission model (many-to-many)

### Permission Model
- Defines specific permissions for actions
- Fields:
  - `id`: Primary key
  - `name`: Permission name (e.g., view_hosts, wake_hosts)
  - `description`: Human-readable description

### Host Model
- Stores device information for Wake-on-LAN targets
- Fields:
  - `id`: Primary key
  - `name`: Descriptive name for the device
  - `mac_address`: Device MAC address (target for WoL packet)
  - `ip_address`: Device IP address (optional)
  - `port`: WoL port (default: 9)
  - `subnet_mask`: Network subnet mask
  - `broadcast_address`: Network broadcast address
  - `notes`: Additional device information
  - `public_access`: Boolean flag for public accessibility
  - `access_hash`: Unique hash for public access links
  - `created_at`: Timestamp of creation
  - `updated_at`: Timestamp of last update
  - `user_id`: Creator/owner of the host entry

### AppSettings Model
- Stores application-wide configuration settings
- Fields:
  - `id`: Primary key
  - `key`: Setting name
  - `value`: Setting value
  - `description`: Human-readable description

## 4. Authentication System

The authentication system is implemented in `auth.py` with forms defined in `forms.py` and provides:

### Login Process
- Uses Flask-Login for session management
- Bcrypt for secure password hashing
- CSRF protection on login forms via Flask-WTF
- Form validation with custom validators for username and password requirements
- Redis-backed sessions for reliability

### Security Features
- Password complexity requirements
- Rate limiting to prevent brute force attacks
- Session timeout configuration
- Remember-me functionality with secure cookies

### User Management
- Account creation (admin only)
- Password reset
- Profile management
- Account deactivation

## 5. Wake-on-LAN Functionality Implementation

The Wake-on-LAN functionality is implemented in `wol.py` using the following approach:

### Magic Packet Construction
- Crafts "magic packets" containing:
  - 6 bytes of `FF` (0xFF repeated 6 times)
  - Target MAC address repeated 16 times
- Uses raw socket programming to send packets

### Key Features
- Support for broadcast and directed packets
- Port configuration (default: 9)
- Subnet mask consideration for proper broadcasting
- Rate limiting to prevent network flooding
- Comprehensive logging of all wake attempts

### User Flow
1. Select a host from the managed hosts list
2. Confirm the wake operation
3. System sends the magic packet to the target
4. User receives confirmation of the attempt
5. Logs record the action with timestamp and user info
1## 7. User Roles and Permissions
cation includes a comprehensive ping system to monitor device availability:

### ICMP Implementation
- Uses Python's `subprocess` module to execute ICMP ping requests
- Configurable timeout and packet count settings
- Handles platform-specific differences (Windows/Linux/macOS)
- Parses response time and packet loss statistics
- Thread-safe implementation for concurrent pinging

### Redis-Backed Cache
- Implements a `PingCache` class in `ping_cache.py` for efficient status storage
- Uses Redis as a high-performance backend for ping results
- TTL (Time To Live) based caching to prevent stale data
- Keys structured as `ping:{host_ip}` for easy lookup
- Atomic operations to prevent race conditions
- Batch operations for efficiently checking multiple hosts

### Status Integration
- Host list displays real-time ping status indicators
- Dashboard shows aggregate statistics of online/offline hosts
- Status history tracking for uptime analysis
- Configurable alert thresholds for consecutive failed pings

### Performance Optimization
- Asynchronous ping execution to prevent UI blocking
- Prioritized pinging for recently accessed hosts
- Background ping service for automatic status updates
- Configurable ping interval through application settings

## 7. User Roles and Permissions

The application implements a role-based access control (RBAC) system:

### Default Roles
- **Admin**: Full access to all features and settings
- **Manager**: Can manage hosts and send wake packets
- **User**: Limited to sending wake packets to authorized hosts
- **Guest**: View-only access

### Permission Types
- `view_hosts`: Ability to see host listings
- `add_host`: Ability to add new hosts
- `edit_host`: Ability to modify existing hosts
- `delete_host`: Ability to remove hosts
- `wake_host`: Ability to send wake packets
- `manage_users`: Ability to create/edit/delete users
- `view_logs`: Ability to view system logs
- `edit_settings`: Ability to modify application settings

### Access Control
- Decorators on routes enforce permission checks
- Template conditionals hide unauthorized UI elements
- API endpoints validate permissions before processing requests

## 8. Security Measures

The application implements several security measures:

### Authentication Security
- Bcrypt for secure password hashing
- Session management with Redis
- CSRF protection on all forms
- Flask-Talisman for security headers

### Network Security
- Rate limiting for login attempts and WoL operations
- Hash-based validation for public host access links
- Rate limiting for public access requests
- Access logging for public host interactions
- Permission validation before packet transmission
- Configurable port and broadcast settings

### Deployment Security
- Docker container isolation
- Principle of least privilege (NET_RAW capability only)
- Environment variable injection for sensitive settings
- Volume mounting for data persistence

### Audit Trail
- Comprehensive logging of all security-relevant actions
- Admin interface for log review and filtering
- Failed login attempt tracking

## 9. Logging System

The application implements a sophisticated multi-level logging architecture:

### Log Types and Storage
- **Application Logs**: Records application events, errors, and operations
- **Access Logs**: Tracks HTTP requests and user interactions
- **Error Logs**: Dedicated high-priority error tracking
- **Security Logs**: Records authentication attempts and security events
- **Log Rotation**: Automatic archiving and management of log files

### Logging Profiles
- **LOW**: Production-level logging with minimal verbosity (ERROR and above)
- **MEDIUM**: Standard logging level (INFO and above)
- **HIGH**: Verbose logging for troubleshooting (DEBUG and above)
- **DEBUG**: Maximum verbosity for development environments

### Security Features
- **Sensitive Data Filtering**: Automatically masks passwords, tokens, and credentials
- **Request Context Enrichment**: Logs include user ID, session info, and IP address
- **Tamper Resistance**: Log files use restricted permissions and are write-only for the application
- **Full Audit Trail**: All security-relevant actions are logged

### Configuration
- **Environment-Driven**: Logging level controlled via environment variables
- **Custom Formatters**: RequestFormatter adds contextual information to log entries
- **Performance Optimization**: Asynchronous logging for high-traffic operations
- **Configurable Paths**: Log file locations can be adjusted via configuration

### Admin Interface
- Web-based log viewer with filtering and search capabilities
- Real-time log monitoring for system administrators
- Export functionality for log analysis

## 10. Deployment Information

The application supports deployment via Docker:

### Docker Deployment
- Dockerfile defines the container build process
- docker-compose.yml orchestrates the complete deployment
- Uses Python 3.9 base image
- Gunicorn as the WSGI server
- Redis for session management
- Persistent volume for database storage

### Environment Configuration
The following environment variables can be configured:
- `FLASK_ENV`: Development or production mode
- `SECRET_KEY`: Application secret key
- `DATABASE_URL`: SQLite or other database connection string
- `REDIS_URL`: Redis server connection string
- `WOL_INTERFACE`: Network interface for sending packets

## 11. Key Files

### Application Core
- `app/__init__.py`: Application factory and initialization
- `app/models.py`: Database models and relationships
- `app/config.py`: Configuration settings

### Functional Modules
- `app/auth.py`: Authentication functionality
- `app/host.py`: Host management functionality
- `app/wol.py`: Wake-on-LAN implementation
- `app/admin.py`: Administrative functions
- `app/main.py`: Dashboard and main pages
- `app/logging_config.py`: Logging system configuration
- `app/ping.py`: ICMP ping implementation
- `app/ping_cache.py`: Redis-based ping result caching
- `app/forms.py`: Form definitions and validation
### Templates
- `app/templates/`: HTML templates using Jinja2
- `app/templates/base.html`: Base template with common layout
- `app/templates/auth/`: Authentication-related templates
- `app/templates/host/`: Host management templates
- `app/templates/wol/`: Wake-on-LAN interface templates
- `app/templates/admin/`: Administrative interface templates

### Deployment
- `Dockerfile`: Container definition
- `docker-compose.yml`: Multi-container setup
- `entrypoint.sh`: Container startup script
- `requirements.txt`: Python dependencies
- `detect_ip.sh`: Network configuration helper

### Static Assets
- `app/static/css/`: Stylesheets
- `app/static/js/`: JavaScript files
- `app/static/img/`: Images and icons

## 12. API and Integration Points

The application offers several integration points:

### Internal APIs
- WoL packet sending endpoint
- Host management CRUD operations
- User management functions
- Settings configuration

### Future Integration Possibilities
- REST API for external systems to trigger wake operations
- LDAP/Active Directory integration for authentication
- Scheduled wake operations
- Integration with monitoring systems

## 13. Core Workflows

### User Authentication
1. User navigates to login page
2. Credentials are validated
3. On success, user session is established
4. User is redirected to dashboard

### Host Management
1. Admin/Manager navigates to host management
2. Creates/edits hosts with required information (name, MAC address)
3. Host is validated and saved to database
4. Host appears in the host list

### Wake-on-LAN Process
1. User selects a host from the list
2. Clicks "Wake" button
3. Confirmation dialog appears
4. On confirmation, system sends magic packet
5. Success/failure notification is displayed
6. Action is logged for audit purposes

### User Management (Admin)
1. Admin navigates to user management
2. Creates new user accounts or edits existing ones
3. Assigns appropriate roles
4. User receives notification (if email configured)

### Form Handling and Validation
1. User accesses a form (login, host creation, user management, etc.)
2. Form is pre-populated with existing data if in edit mode
3. User submits the form
4. Flask-WTF validates the data against defined rules in `forms.py`
5. If validation fails, form is re-rendered with error messages
6. If validation succeeds, data is processed and saved
7. User is redirected to appropriate page with feedback message

