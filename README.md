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

## Contributing
Contributions to WOL-Manager are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Please adhere to the existing code style and add unit tests for any new functionality.


