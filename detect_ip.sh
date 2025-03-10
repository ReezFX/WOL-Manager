#!/bin/bash
set -e

# Detect the host's IP address
# First try to get the external IP from a public service
EXTERNAL_IP=$(curl -s https://api.ipify.org 2>/dev/null || echo "")

# If external IP detection fails, try to get an IP address that's not localhost and is routable
if [ -z "$EXTERNAL_IP" ] || [ "$EXTERNAL_IP" = "127.0.0.1" ]; then
    # Get the Docker host's IP address (this works when run inside Docker)
    # We look for an IP that's not localhost and is likely to be accessible from outside
    EXTERNAL_IP=$(hostname -I | awk '{print $1}')
fi

# If we still don't have a valid IP, fall back to localhost
if [ -z "$EXTERNAL_IP" ]; then
    EXTERNAL_IP="127.0.0.1"
    echo "Warning: Could not detect external IP, using localhost"
fi

echo "Detected host IP: $EXTERNAL_IP"

# Export as environment variables
# Not setting SESSION_COOKIE_DOMAIN allows Flask to use the domain from the request
# which is more flexible for external access


# Pass environment variables to the Flask application
echo "SESSION_COOKIE_DOMAIN not set (using request domain)"

# If any command was passed to this script, execute it with the new environment variables
if [ $# -gt 0 ]; then
    exec "$@"
else
    echo "No command specified, exiting"
    exit 1
fi

