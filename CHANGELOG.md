# Changelog

All notable changes to the WOL-Manager application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

