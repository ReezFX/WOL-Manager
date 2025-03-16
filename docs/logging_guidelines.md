# Logging Guidelines for WOL-Manager

## 1. Introduction to the Logging System

The WOL-Manager application uses Python's built-in `logging` module with custom configurations to provide comprehensive logging capabilities. Our logging system is designed to:

- Track application events at various levels of detail
- Aid in debugging and troubleshooting
- Provide audit trails for security events
- Monitor application performance and usage patterns

The logging configuration is centralized in `app/logging_config.py`, which defines various logging profiles (LOW, MEDIUM, HIGH, DEBUG) that control the verbosity and destinations of log messages. The system also includes special features like request context inclusion and sensitive data filtering.

## 2. How to Get a Logger in Modules

To use logging in your module, import the `get_logger` function from the logging configuration module:

```python
from app.logging_config import get_logger

# Create a logger for your module
logger = get_logger(__name__)
```

The `__name__` parameter passes the module name to the logger, which helps identify the source of log messages. Always use this approach rather than instantiating loggers directly to ensure consistent configuration across the application.

## 3. When to Use Different Log Levels

The logging system provides five standard levels, each appropriate for different types of messages:

### DEBUG
- Detailed diagnostic information
- Used during development to trace code execution
- Example: `logger.debug("Processing user input: %s", user_input)`
- Contains detailed data useful for troubleshooting but excessive for normal operation

### INFO
- Confirmation that things are working as expected
- Notable but regular events in the application
- Example: `logger.info("User %s successfully authenticated", username)`
- Useful for tracking normal application flow

### WARNING
- Indication that something unexpected happened or may happen
- The application continues working but requires attention
- Example: `logger.warning("High memory usage detected: %s%%", memory_percentage)`
- Used for potential issues that don't cause immediate problems

### ERROR
- Due to a more serious problem, the software was unable to perform some function
- Requires intervention but doesn't necessarily crash the application
- Example: `logger.error("Failed to connect to database: %s", error_message)`
- Used when functionality is impaired but execution continues

### CRITICAL
- A very serious error that may prevent the program from continuing
- System failures that require immediate attention
- Example: `logger.critical("Application cannot start due to missing configuration")`
- Used for severe errors that might lead to data loss or service unavailability

## 4. Best Practices for Log Messages

### Content
- Be specific and descriptive
- Include relevant context (user IDs, request IDs, etc.)
- Include actionable information for troubleshooting
- Use consistent terminology across the application
- Log the exception traceback when catching exceptions

### Formatting
- Use parameterized logging to avoid string concatenation:
  - Good: `logger.info("User %s performed action %s", username, action)`
  - Bad: `logger.info("User " + username + " performed action " + action)`
- Structure complex data for readability:
  - Consider using JSON formatting for complex objects
  - Use pprint for debugging complex structures

### Quantity
- Don't log too much or too little
- Avoid logging in tight loops without rate limiting
- Consider the performance impact of verbose logging

## 5. Security Considerations

### Sensitive Data Protection
- Never log passwords, access tokens, or security credentials
- Use the built-in `SensitiveDataFilter` for fields that might contain sensitive data:
  ```python
  logger.info("Processing payment for order %s", order_id)  # Don't include payment details
  ```
- Mask personally identifiable information (PII) when logging user data
- Be careful with stack traces in production as they may reveal internal structure

### Compliance
- Consider data protection regulations (GDPR, CCPA, etc.) when logging user information
- Implement appropriate log retention policies
- Ensure log access is properly secured and audited

## 6. Examples of Proper Logging

### Authentication Example
```python
def authenticate_user(username, password):
    logger.info("Authentication attempt for user: %s", username)
    try:
        user = User.query.filter_by(username=username).first()
        if not user:
            logger.warning("Authentication failed: User %s not found", username)
            return False
            
        if not user.verify_password(password):
            logger.warning("Authentication failed: Invalid password for user %s", username)
            return False
            
        logger.info("User %s authenticated successfully", username)
        return True
    except Exception as e:
        logger.error("Authentication error: %s", str(e), exc_info=True)
        return False
```

### Database Operation Example
```python
def get_device(device_id):
    logger.debug("Fetching device with ID: %s", device_id)
    try:
        device = Device.query.get(device_id)
        if device:
            logger.debug("Successfully retrieved device: %s", device.name)
            return device
        else:
            logger.info("Device not found with ID: %s", device_id)
            return None
    except SQLAlchemyError as e:
        logger.error("Database error while fetching device %s: %s", device_id, str(e))
        raise
```

### API Request Example
```python
@app.route('/api/wake/<device_id>', methods=['POST'])
def wake_device(device_id):
    logger.info("Wake request received for device ID: %s", device_id)
    try:
        device = Device.query.get(device_id)
        if not device:
            logger.warning("Wake request failed: Device not found: %s", device_id)
            return jsonify({"error": "Device not found"}), 404
            
        result = send_magic_packet(device.mac_address)
        if result:
            logger.info("Magic packet sent successfully to %s (%s)", 
                       device.name, device.mac_address)
            return jsonify({"status": "success"}), 200
        else:
            logger.error("Failed to send magic packet to %s (%s)", 
                        device.name, device.mac_address)
            return jsonify({"error": "Failed to send packet"}), 500
    except Exception as e:
        logger.critical("Unexpected error in wake_device: %s", str(e), exc_info=True)
        return jsonify({"error": "Server error"}), 500
```

## 7. How to Change Log Levels

### During Development
- Modify the `.env` file to set `LOG_LEVEL=DEBUG` for verbose output
- For quick testing, you can temporarily modify the level in your code:
  ```python
  import logging
  logger.setLevel(logging.DEBUG)  # Temporarily increase verbosity
  ```
- You can also use the configuration API to change log levels dynamically:
  ```python
  from app.logging_config import configure_logging
  configure_logging('DEBUG')  # Switch to debug profile
  ```

### In Production
- Set the appropriate log level in environment variables or deployment configuration
- Lower log levels (INFO or WARNING) are recommended for production to reduce disk usage
- Consider implementing a dynamic log level adjustment endpoint (admin-only, secured)
- Use log rotation to manage log file sizes in long-running deployments

## 8. Troubleshooting Common Logging Issues

### Logs Not Appearing
- Check that the log level you're using is enabled in the current configuration
- Verify that the handlers are properly configured
- Ensure you're looking at the correct log file location
- Check file permissions if logging to files

### Excessive Logging
- Review the log level being used (DEBUG produces much more output)
- Look for logging statements in loops
- Consider adding rate limiting for high-frequency events
- Adjust log rotation settings to manage file sizes

### Performance Issues
- Avoid string formatting operations before checking log levels:
  - Bad: `logger.debug("Complex calculation result: " + calculate_expensive_result())`
  - Good: `if logger.isEnabledFor(logging.DEBUG): logger.debug("Complex calculation result: %s", calculate_expensive_result())`
- Consider using asynchronous logging for high-throughput applications
- Monitor log file growth and adjust rotation settings

### Missing Context
- Ensure you're using the correct logger for your module
- Check that request middleware is properly configured
- Verify that log formatters include all necessary fields

### Security Concerns
- Review logs for accidentally logged sensitive information
- Ensure the `SensitiveDataFilter` is properly configured
- Implement periodic log audits to check for security issues

## 9. Logging Profiles Feature (New in v1.2.0)

The application now includes a configurable logging profiles feature accessible through the admin interface.
This allows administrators to adjust logging behavior without changing code or restarting the application.

### Available Profiles
- **LOW**: Minimal logging (errors and warnings only)
- **MEDIUM**: Standard production logging (errors, warnings, and important information)
- **HIGH**: Detailed logging suitable for troubleshooting
- **DEBUG**: Maximum verbosity for development purposes

### Configuring Logging Profiles
1. Log in as an administrator
2. Navigate to "Admin" > "Settings"
3. Find the "Logging Profile" section
4. Select the desired logging level
5. Save changes

### Profile Characteristics

| Profile | Console Level | File Level | Performance Impact | Use Case |
|---------|--------------|------------|-------------------|----------|
| LOW     | WARNING      | ERROR      | Minimal           | Production (minimal overhead) |
| MEDIUM  | INFO         | WARNING    | Low               | Production (standard) |
| HIGH    | DEBUG        | INFO       | Moderate          | Troubleshooting |
| DEBUG   | DEBUG        | DEBUG      | High              | Development |

### Dynamic Configuration

The logging profile can be changed at runtime without application restart. This is particularly useful for:
- Temporarily increasing verbosity to diagnose issues
- Reducing log volume in high-traffic production environments
- Balancing troubleshooting needs with performance considerations

Changes to the logging profile are applied within 60 seconds and are automatically logged to assist with audit trails.

