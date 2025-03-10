#!/usr/bin/env python3

import sys
from app import create_app
from app.models import User, db_session

def check_admin_exists():
    """
    Check if the admin user exists in the database.
    Returns 0 if admin exists, 1 if not.
    """
    try:
        app = create_app()
        with app.app_context():
            # Query the database for admin user
            admin_user = db_session.query(User).filter_by(username='admin').first()
            
            # If admin user exists, return 0 (success)
            if admin_user:
                return 0
            
            # If admin user does not exist, return 1 (failure)
            return 1
    except Exception as e:
        print(f"Error checking for admin user: {e}", file=sys.stderr)
        # If there's an error (like table doesn't exist), return 1
        return 1

if __name__ == "__main__":
    try:
        # Run the check
        result = check_admin_exists()
        
        # Exit with the appropriate code
        sys.exit(result)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
