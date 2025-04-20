<div align="center">
  <img src="app/static/img/WOL-Manager-DIsplay.png" alt="WOL-Manager Display" width="650"><br><br>
</div>

## Overview
WOL-Manager is a Flask-based web application designed to provide a user-friendly interface for managing and waking devices using the Wake-on-LAN (WOL) protocol. This application allows users to store host information, including MAC addresses, and remotely power on these devices over a network.

## How to use and install
**Deployment and Usage Guide has moved to the [WOL-Manager Wiki](https://github.com/ReezFX/WOL-Manager/wiki)**

## Table of Contents
- [Features](#features)
- [System Requirements](#system-requirements)
- [Security](#security)
- [Release Notes](#release-notes)
- [Contributing](#contributing)

## Features
- **Host Management**: Add, edit, view, and delete networked devices with MAC addresses
- **Wake-on-LAN**: Send magic packets to wake devices remotely
- **User Authentication**: Secure login system with session management (admin-managed user accounts)
- **Role-based Access Control**: Different permission levels for users and administrators, with host visibility controls based on user roles
- **Host Status API**: External API endpoint for automated host status updates with token-based authentication
- **Public Host Access**: Configurable public access controls for selected hosts with hash encrypted permalinks
- **Responsive UI**: Web interface that works on desktop and mobile devices
- **Dark/Light Mode**: Toggle between dark and light themes with automatic system preference detection
- **Docker Support**: Easy deployment using containers

## System Requirements
- Python 3.8 or higher (if installing manually)
- Docker and Docker Compose (if using containerized deployment)
- Network with support for broadcast UDP packets
- Devices configured to support Wake-on-LAN

## Security
- Passwords are hashed using Werkzeug's security functions
- CSRF protection on all forms
- Rate limiting on wake attempts (10 per 5 minutes)
- Role-based access control to protected resources
- Input validation for all form fields
- Enhanced session and cookie security for external access deployments
- Automatic session expiration with configurable timeout periods
- Protection against session hijacking through secure session management
- Session validation on critical operations to ensure continued authentication
- Proper cleanup of expired sessions to prevent unauthorized access

## Release Notes

### Version 1.4.0 (2025-03-25)
- Enhanced UI with advanced animations and visual feedback:
  - Implemented wake animation overlay with animated circuit paths for host wake requests
  - Added AJAX functionality for host management operations without page reloads
  - Enhanced theme transitions with smoother color changes and improved visual consistency
- Improved user experience with interactive elements:
  - Redesigned host cards with animated backgrounds and modern styling
  - Added responsive animations for user interactions across the application
  - Implemented improved wake button with dynamic visual feedback based on host status
- Optimized frontend performance:
  - Enhanced JavaScript components for better responsiveness
  - Improved mobile compatibility with optimized animations
  - Implemented debounced event handlers to prevent performance issues

### Version 1.3.0 (2025-03-21)
- Added public API endpoint for host status updates with token-based authentication
- Enhanced database management with optimized initialization and upgrades
- Improved UI and layout across multiple pages:
  - Better mobile device compatibility
  - Fixed pagination and spacing issues
  - Enhanced responsiveness
- Refactored ping system for improved reliability
- Optimized performance with multiple code cleanup passes
- Fixed various host status and visibility issues

### Version 1.2.2 (2025-03-17)
- Added initial implementation of public host access feature
  - Set up infrastructure for external host access management
  - Implemented foundational public access controls
  - Prepared groundwork for expanded public host management capabilities

### Version 1.2.1 (2025-03-17)
- Changed:
  - Webapp branding update with refreshed visual identity and improved brand consistency
- Fixed:
  - Enhanced ping/host status functionality with improved caching, logging, and accuracy
  - Resolved various UI design issues in footer layout, host list action buttons, and /hosts/ view
  - Fixed several issues with host deletion logic and error handling

### Version 1.2.0 (2025-03-15)
- Enhanced User Interface (UI 2.0):
  - Completely overhauled interface with modern design principles
  - Improved responsive layout for better mobile and tablet experience
  - Upgraded to Bootstrap 5 with streamlined navigation and card layout
  - Enhanced color scheme with better accessibility and contrast ratios
  - Redesigned dashboard for improved information hierarchy
  - Modernized footer with improved content organization and responsive layout
  - Implemented standardized color palette base with consistent theming across all components
- Improved Device Status Monitoring:
  - Enhanced ICMP ping mechanism for more accurate device status detection
  - New status badges with dynamic color indicators (green for online, red for offline, yellow for transitioning)
  - Automatic Bootstrap version detection for consistent badge styling
  - Reduced online stability period from 30 to 15 seconds for faster status updates
  - Enhanced offline detection logic to prevent false status indicators
- New refactored logging system:
  - Consolidated logging configuration in `app/logging_config.py`
  - Enhanced contextual logging with request information
  - Added sensitive data filtering to prevent credential exposure in logs
  - Improved log formatting for better readability and analysis

### Version 1.1.5 (2025-03-13)
- Upgraded pip packages to latest compatible versions to patch security vulnerabilities
- Enhanced dependency management with updated requirements
- Improved application security through third-party library updates

### Version 1.1.4 (2025-03-12)
- Improved ICMP ping reliability for host status checks
- Fixed color contrast issues in dark theme

### Version 1.1.3 (2025-03-11)
- Enhanced session security and improved session expiration handling
- Fixed inconsistent session timeout behavior
- Implemented stronger session validation checks
- Added proper session cleanup for timed-out sessions
- Enhanced protection against session fixation attacks

### Version 1.1.2 (2025-03-11)
- Fixed port consistency issues between Dockerfile, entrypoint.sh, and application settings
- Improved Wake-on-LAN functionality with Docker host network mode
- Fixed UDP port 9 access for proper magic packet delivery
- Enhanced broadcast packet handling for local networks
- Added configuration for compatibility with buildx-built images

### Version 1.1.1 (2025-03-10)
- Refactored login method to fix issues with external access
- Enhanced session and cookie security for external deployments

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


