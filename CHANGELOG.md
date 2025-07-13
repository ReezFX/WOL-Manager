# Changelog

All notable changes to the WOL-Manager application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.1] - 2025-07-13

### Security
- Updated Flask from 3.1.0 to 3.1.1 to address CVE-2025-47278 security vulnerability
- Upgraded Flask-CORS from 5.0.1 to 6.0.0 to address known security issues
- Enhanced overall application security posture with latest dependency updates

### Changed
- Improved cross-platform compatibility for Windows development environments
- Enhanced Docker container compatibility with proper Unix line endings
- Maintained full compatibility with Linux deployment environments
- Updated application version display to 1.5.1 in footer

## [1.5.0] - 2025-04-01

### Added
- Wake confirmation dialog for already-online hosts:
  - Added new function `showWakeConfirm()` with customizable success callback
  - Implemented clear warning message when attempting to wake an already-online host
  - Added cancel and confirm buttons with proper event handler management
  - Created smooth transition between confirmation and animation states
- Enhanced retry functionality:
  - Implemented improved retry button behavior with preserved host context
  - Added seamless transition between retry action and animation restart
  - Created host ID tracking system to maintain context between operations

### Changed
- Refactored wake animation handling system:
  - Improved animation state management with reliable initialization and cleanup
  - Enhanced progress bar transitions with proper timing control
  - Modified polling system to prevent race conditions during status checks
  - Updated animation element selection with proper null checking
  - Added timeout safety mechanism to ensure animations complete properly
  - Implemented `resetWakeAnimation()` call at initialization to ensure clean state
- Enhanced status polling mechanism:
  - Added polling termination flag to prevent redundant status checks
  - Implemented visibility check for status text to prevent unnecessary updates
  - Added proper error handling for network failures during status checks
  - Enhanced timeout handling with race condition prevention
  - Improved cleanup after polling completes to prevent memory leaks

### Fixed
- Status polling and animation interaction issues:
  - Fixed potential infinite polling issue with proper termination mechanism
  - Resolved race conditions between different status check responses
  - Added safety timeout with proper cleanup to prevent stuck animations
  - Fixed repeated polling after user-initiated cancellation
  - Improved error handling during failed network requests
- Animation state inconsistencies:
  - Fixed incomplete animation reset when transitioning between states
  - Resolved element style inconsistencies during animation transitions
  - Added proper reset for progress bar transitions
  - Fixed animation issues when rapidly triggering multiple wake operations
  - Added delayed cleanup after animation completion for smoother transitions
- DOM manipulation errors:
  - Added null checks before manipulating DOM elements to prevent errors
  - Fixed potential issues with missing elements in older browser environments
  - Improved element class handling for animation states
  - Resolved potential race conditions in element updates
  - Enhanced event listener management with clone-and-replace pattern

## [1.4.0] - 2025-03-25

### Added
- Wake animation overlay system:
  - Implemented SVG-based animated circuit paths during host wake operations
  - Added dynamic animation generation based on host status and viewport size
  - Created responsive animation timing with proper CSS transitions
  - Developed animated nodes and connection points that respond to user actions
- AJAX functionality for seamless host management:
  - Implemented asynchronous host wake requests without page reloads
  - Added real-time status updates during wake operations
  - Enhanced form submission with proper CSRF token handling for security
  - Improved error handling and user feedback during failed operations

### Changed
- Enhanced user interface components:
  - Redesigned host cards with animated backgrounds and improved visual hierarchy
  - Updated theme transition system for smoother color changes throughout the application
  - Modified theme application to ensure both HTML and body elements are consistently styled
  - Improved theme preloading to prevent flash of unstyled content when loading pages
  - Enhanced responsive design for better mobile compatibility
- Upgraded animation system:
  - Implemented CSS custom properties for consistent animation timing and easing
  - Added spring physics-based animations for more natural movement
  - Improved transition timing for smoother UI interactions
  - Optimized animation performance for mobile devices

### Fixed
- Resolved flash of incorrect theme during initial page load:
  - Added theme preload script to apply stored theme before any content renders
  - Fixed inconsistent theme application between HTML and body elements
  - Improved theme transition timing to prevent visual glitches
- Enhanced UI consistency across different viewports:
  - Fixed card animation issues on mobile devices
  - Corrected spacing and alignment in host management interfaces
  - Improved border radius consistency across different components

## [1.3.0] - 2025-03-21

### Added
- Public API endpoint for host status updates
  - New token-based authentication for external status updates
  - Secure public URL access for hosts
  - Copy button functionality for public URLs in host cards

### Changed
- Enhanced database management
  - Optimized entrypoint script for better database initialization and upgrades
  - Improved database handling and performance

### Fixed
- UI and Layout Improvements
  - Fixed pagination element spacing on hosts page
  - Optimized navbar layout for better mobile device compatibility
  - Corrected spacing issues on admin users page
  - Improved responsiveness and layout consistency
- Host Status System Enhancements
  - Refactored ping system for better reliability
  - Fixed last wake attempt field functionality
  - Improved host status update mechanism
  - Enhanced status badge behavior
- Performance Optimizations
  - Multiple performance optimization passes
  - Code cleanup and minimization for ping functionality
  - Fixed host visibility role handling in host cards

## [1.2.2] - 2025-03-17

### Added
- Added public host access feature initialization
  - Infrastructure setup for external host access management
  - Initial implementation of public access controls
  - Foundation for expanded public host management

## [1.2.1] - 2025-03-17

### Changed
- Webapp branding update
  - Refreshed visual identity across the application
  - Updated logo and brand elements for consistency
  - Improved brand alignment with organizational guidelines

### Fixed
- Fixed ping/host status functionality issues
  - Corrected ping latency check value for more accurate host status reporting
  - Improved ping/host status caching mechanism for better performance
  - Enhanced ping logging for better troubleshooting capabilities
  - Resolved inconsistencies in ping status reporting
- Resolved UI design issues
  - Fixed footer layout formatting for proper alignment and spacing
  - Corrected design for action buttons in host list to improve usability
  - Addressed various design inconsistencies in the /hosts/ view
  - Improved overall visual consistency across the application
- Fixed host management functionality
  - Resolved several issues with host deletion logic to prevent orphaned records
  - Enhanced error handling during host deletion operations
  - Improved validation checks during host management operations

## [1.2.0] - 2025-03-15

### Added
- New refactored logging system
  - Consolidated logging configuration in `app/logging_config.py`
  - Enhanced contextual logging with request information
  - Added sensitive data filtering to prevent credential exposure in logs
  - Improved log formatting for better readability and analysis
  - Implementation of standardized logging patterns across all modules
  - Added comprehensive logging documentation in `/docs/logging_guidelines.md`
- Enhanced User Interface (UI 2.0)
  - Completely redesigned frontend with modern design principles
  - Implemented responsive layout with improved mobile and tablet experience
  - Upgraded from Bootstrap 4 to Bootstrap 5 framework
  - Redesigned dashboard with improved information hierarchy and visual appeal
  - Enhanced dark/light mode implementation with smoother transitions
  - Comprehensive footer rework with improved navigation links, social media integration, and responsive behavior
  - Refined color palette with better accessibility compliance, increased contrast ratios, and consistent application across components
### Security
- Upgraded pip packages to latest compatible versions to patch security vulnerabilities
  - Updated Flask to 3.1.0 and related dependencies
  - Upgraded cryptography package to 44.0.2
  - Updated SQLAlchemy to 2.0.39 and Flask-SQLAlchemy to 3.1.1
  - Enhanced overall application security posture with latest security patches
  - Implemented more secure version constraints in requirements.txt

### Fixed
- Improved host status checking mechanism in ping.js
  - Reduced online stability period from 30 to 15 seconds for faster status updates
  - Enhanced offline detection logic to prevent false status indicators
  - Improved error handling and status smoothing algorithm
  - Added more robust detection of Bootstrap version for proper styling
  - Fixed intermittent ping failures on complex networks

### Changed
- Removed legacy logging components
  - Cleaned up outdated logging configuration
  - Streamlined logging implementation for better performance
  - Removed unused logging code paths
  - Enhanced log clarity by eliminating redundant information
  - Centralized all logging configuration in a single module

## [1.1.5] - 2025-03-13

### Security
- Upgraded pip packages to latest compatible versions to patch security vulnerabilities
  - Updated Flask to 3.1.0 and related dependencies
  - Upgraded cryptography package to 44.0.2
  - Updated SQLAlchemy to 2.0.39 and Flask-SQLAlchemy to 3.1.1
  - Enhanced overall application security posture with latest security patches
  - Implemented more secure version constraints in requirements.txt

### Fixed
- Improved host status checking mechanism in ping.js
  - Reduced online stability period from 30 to 15 seconds for faster status updates
  - Enhanced offline detection logic to prevent false status indicators
  - Improved error handling and status smoothing algorithm
  - Added more robust detection of Bootstrap version for proper styling

### Changed
- Removed legacy logging components
  - Cleaned up outdated logging configuration
  - Streamlined logging implementation for better performance
  - Removed unused logging code paths
  - Enhanced log clarity by eliminating redundant information

## [1.1.4] - 2025-03-12

### Added
- Logging Profiles feature in admin settings
  - Configurable logging levels and handlers through admin interface
  - Multiple logging profile support for different environments
  - Enhanced logging configuration management

### Fixed
- ICMP ping improvements
  - Enhanced reliability of host status checks
  - Fixed color contrast issues in dark theme for logging profile details
  - Improved error handling for ping operations

## [1.1.3] - 2025-03-11

### Fixed
- Session handling improvements
  - Resolved intermittent session expiration issues
  - Fixed inconsistent session timeout behavior
  - Improved error handling for expired sessions
  - Enhanced session management for multi-worker environments

### Security
- Enhanced session security measures
  - Implemented stronger session validation checks
  - Improved handling of session expiration to prevent unauthorized access
  - Added proper session cleanup for timed-out sessions
  - Enhanced protection against session fixation attacks
## [1.1.2] - 2025-03-11

### Fixed
- Port consistency improvements
  - Aligned port configuration across Dockerfile, entrypoint.sh, and application settings
  - Fixed inconsistent port references between 8008 and 8080
  - Updated documentation to consistently reference port 8008
  - Improved port configuration clarity in startup scripts

### Enhanced
- Wake-on-LAN (WoL) functionality improvements
  - Changed Docker network mode to host mode to allow WoL packets to reach physical network
  - Fixed UDP port 9 access for proper magic packet delivery
  - Enhanced broadcast packet handling to ensure compatibility with local networks
  - Updated documentation with WoL troubleshooting information
  - Added configuration to maintain compatibility with buildx-built images

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

