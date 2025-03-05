# Changelog

All notable changes to the WOL-Manager application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

