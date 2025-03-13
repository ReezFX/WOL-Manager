from flask import Blueprint

# This file has been cleaned of all logging functionality
# No routes are currently defined in this file
# New routes can be added here in the future

# Create the logs blueprint
logs = Blueprint('logs', __name__, url_prefix='/logs')

# Blueprint is kept for compatibility with existing imports
# but contains no routes
