# Changelog

All notable changes to the WOL-Manager application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-03-10

### Security
- Enhanced session and cookie security for external access
  - Improved session cookie handling with secure attribute settings
  - Added stronger validation for session data
  - Hardened cookie security parameters for external facing deployments
  - Implemented more robust session handling mechanisms

### Added
- Database-based authentication event logging
  - Added comprehensive tracking of all authentication attempts
  - Created database schema for storing auth events
  - Implemented logging of login successes, failures, and logouts
  - Added IP address and user agent recording for security analysis

### Changed
- Refactored login method implementation for external login fix
  - Improved login mechanism for better compatibility with external access
  - Enhanced error handling during authentication process
  - Restructured authentication workflow for more reliable operation
  - Fixed edge cases in authentication with external proxies

## [1.1.0] - 2025-03-10

### Security
- Enhanced CSRF token management for multi-worker environments
  - Fixed "Bad Request error CSRF Token is invalid" issues
  - Added consistent CSRF secret key handling across multiple Gunicorn workers
  - Set proper CSRF token time limit to 1 hour
  - Added specific CSRF error handler with user-friendly messages
  - Improved session cookie security with HttpOnly and Secure flags

### Added
- Implemented Redis for session storage
  - Added Redis service to Docker composition
  - Configured session serialization for sharing between worker processes
  - Added fallback to filesystem sessions when Redis is unavailable
  - Enhanced session management for improved reliability in multi-user environments

### Fixed
- Resolved CSRF token validation issues in multi-worker environment
  - Fixed inconsistent token generation across Gunicorn workers
  - Eliminated authentication failures caused by worker process switching
  - Improved overall application stability during form submissions
## [1.0.9.1] - 2025-03-10

### Fixed
- Database migration and initialization improvements:
  - Fixed SQLAlchemy compatibility issue by properly using text() function for raw SQL queries
  - Updated database initialization process in entrypoint.sh to ensure proper setup
  - Improved error handling during database creation and migration
  - Resolved issues with admin user creation during container initialization
  - Enhanced container startup reliability for Docker environments

## [1.0.9] - 2025-03-09

### Added
- Application Settings management
  - Added AppSettings model for centralized application configuration
  - Implemented configurable password policies (minimum length, complexity requirements)
  - Added session timeout configuration options
  - Added support for limiting concurrent user sessions
  - Created admin interface for managing application settings
## [1.0.8.1] - 2025-03-06

### Fixed
- Dark/light mode theme switching hotfixes:
  - Fixed color contrast issues in the admin/users/permissions page
  - Improved card header styling to adapt properly to current theme
  - Enhanced text readability for permission descriptions in both light and dark themes
  - Added proper background color adaptation for permission management interface

## [1.0.8] - 2025-03-06

### Added
- Dark mode/light mode toggle feature
  - Added ability to switch between light and dark themes via a toggle button in the navbar
  - Implemented theme persistence using localStorage to remember user preferences
  - Added system preference detection for automatic theme selection based on user's OS settings
  - Created theme-specific styling for all UI components including navbar, footer, and content areas
  - Enhanced accessibility with appropriate contrast in both themes

### Fixed
- Theme switching visual consistency issues
  - Fixed header font color not changing properly (white in dark mode, black in light mode)
  - Resolved footer background color not changing when switching themes
  - Corrected footer text color contrast issues in both light and dark modes
  - Improved theme application to ensure all UI elements properly reflect the selected theme

## [1.0.7.2] - 2025-03-06

### Fixed
- Fixed permission issue with host creation
  - Corrected permission check in host.py to use 'create_host' instead of 'add_hosts'
  - Resolved inconsistency between permission definition in manage.py and permission check in host.py
  - Users with the 'create_host' permission can now properly create new hosts
## [1.0.7.1] - 2025-03-06

### Fixed
- Fixed internal server error in the admin users page
  - Resolved field name mismatch between the template and the form class
  - Updated admin/users.html to use correct form field names (password_confirm)
  - Ensured proper functioning of the admin user management interface

## [1.0.7] - 2025-03-06

### Removed
- User registration functionality
  - Removed the ability for users to self-register
  - Users can now only be created by administrators
  - Updated login page to inform users that accounts are managed by administrators
  - Simplified authentication workflow to align with administrative user management

## [1.0.6.1] - 2025-03-06

### Documentation
- Updated README.md for accuracy and completeness:
  - Corrected manual installation instructions to use the proper Flask CLI commands
  - Clarified Docker port mapping (8008 external, 8080 internal)
  - Updated database path descriptions to match the actual implementation
  - Added information about environment variables usage (FLASK_ENV and FLASK_CONFIG)
  - Updated database model descriptions to accurately reflect role-based permissions system
  - Fixed inconsistent GitHub repository URLs throughout the documentation
## [1.0.6] - 2025-03-05

### Security
- Fixed missing CSRF token in the change_password.html template
  - Added the required CSRF token input field to protect against Cross-Site Request Forgery attacks
  - Ensured proper integration with Flask-WTF's CSRFProtect middleware
  - Improved form security for password change functionality

## [1.0.5] - 2025-03-05

### Fixed
- Fixed dashboard visibility to respect visible_to_roles for non-admin users
- Updated wake permission checks to properly respect the send_wol permission
- Improved UI consistency for permission checks in templates

## [1.0.4] - 2025-03-05

### Fixed
- Fixed critical issue with role-based host visibility
  - Resolved inconsistent handling of role IDs (strings vs integers) in visibility checks
  - Standardized role ID storage as strings in the database
  - Corrected comparison logic in host visibility checks to ensure proper matching
  - Fixed incorrect substring matching that caused false positives in role checks
  - Ensured consistent type handling across all host management functions
  - Users will now correctly see all hosts assigned to their roles in the dashboard
- Fixed user role assignment during registration and user creation
  - Resolved issue where new users were not properly assigned to the "user" role in the user_roles table
  - Updated user registration process to properly create entries in the user_roles table
  - Fixed admin user creation to consistently assign roles using the new role relationship system
  - Improved compatibility between legacy role column and new role relationship system

### Security
- Improved permission validation throughout host management system
  - Enhanced role-based access checks in view_host, edit_host, and delete_host functions
  - Standardized authorization logic across all host-related operations
  - Eliminated potential for unauthorized access due to inconsistent type handling
## [1.0.3] - 2025-03-5

### Fixed
- Fixed SQLite compatibility issue with JSON operator in host list view
  - Replaced PostgreSQL-specific JSON operator with SQLite-compatible code
  - Implemented fallback mechanism for role-based visibility filtering
  - Enhanced query construction for cross-database compatibility

### Added
- Added comprehensive logging configuration
  - Configured both file and console logging with rotation
  - Added environment-based log levels (DEBUG in development, INFO in production)
  - Improved troubleshooting capabilities with detailed contextual logs

### Improved
- Improved error handling in host listing functionality
  - Added robust exception handling with appropriate user feedback
  - Enhanced error logging for easier debugging
  - Implemented graceful fallbacks for edge cases

## [1.0.2] - 2025-03-05

### Security
- Enhanced role-based access control for host management
  - Implemented proper validation of user roles against allowed host visibility roles
  - Fixed permission validation in host visibility controls to prevent unauthorized access
  - Strengthened input validation for role assignment during host creation and updates

### Changed
- Refactored host management implementation
  - Moved host visibility logic to dedicated functions for improved maintainability
  - Standardized error handling patterns across host management endpoints
  - Improved type validation for form submissions in host routes

### Fixed
- Resolved critical internal server error (500) in `/hosts/add` endpoint
  - Fixed improper handling of the `visible_to_roles` field during host creation
  - Addressed edge case where role validation failed during form submission
  - Corrected JSON serialization issue when processing role assignments
- Resolved host visibility inconsistencies
  - Fixed logic flaw in the role-based filtering mechanism
  - Corrected database query constraints for host visibility that caused incorrect results
  - Standardized role verification across all host-related endpoints
- Improved user management functionality
  - Fixed user promotion and demotion operations with proper error handling when user not found
  - Corrected user addition process to prevent internal server errors and data inconsistencies
  - Enhanced error handling throughout user management operations for improved stability
  - Refactored user management code from auth.py to admin.py for better separation of concerns

## [1.0.1] - 2025-03-05

### Added
- User deletion functionality in the admin interface
  - New route `/admin/users/<int:user_id>/delete` for user deletion
  - Delete button added to user management interface with confirmation dialog
  - Security checks to prevent self-deletion
  - Cascade deletion for user-related records

- Granular permission management for users
  - New route `/admin/users/<int:user_id>/permissions` for managing individual user permissions
  - New template `edit_permissions.html` for setting specific permissions
  - "Edit Permissions" button added to user management interface
  - Permission grouping by category for easier management

- Role-based host visibility
  - New `visible_to_roles` field added to Host model
  - Multi-select dropdown in host form to choose which roles can see a host
  - Admin ability to control which hosts are visible to specific roles

### Changed
- Enhanced permission enforcement
  - Host operations (view/edit/delete/wake) now properly check specific permissions
  - Template updates to conditionally show action buttons based on permissions
  - Permission checks now consider both user permissions and role-based visibility

### Fixed
- Permission system now correctly restricts users according to their assigned permissions
- Fixed "Edit Permissions" page internal server error by adding missing import
- Fixed host pagination error by implementing the missing `iter_pages()` method
- Fixed host creation error by correcting form handling

## [1.0.0] - 2025-03-04

### Added
- Initial release of WOL-Manager application
- Wake-on-LAN functionality for remote host management
- User authentication and basic role-based access control
- Admin interface for user management
- Host management interface

