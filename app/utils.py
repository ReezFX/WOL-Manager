import secrets
import string
from app.models import Host

def generate_unique_token(db_session, length=32):
    """
    Generate a cryptographically secure random token and ensure it's unique in the database.
    
    Args:
        db_session: SQLAlchemy database session
        length: Length of the token to generate (default: 32)
        
    Returns:
        str: A unique random token
    """
    # Use letters and numbers for a URL-friendly token
    alphabet = string.ascii_letters + string.digits
    
    while True:
        # Generate a random token
        token = ''.join(secrets.choice(alphabet) for _ in range(length))
        
        # Check if token already exists
        existing = db_session.query(Host).filter_by(public_access_token=token).first()
        if not existing:
            return token

def validate_public_access_token(token):
    """
    Validate that a token meets our security requirements.
    
    Args:
        token: The token to validate
        
    Returns:
        bool: True if token is valid, False otherwise
    """
    if not token:
        return False
    
    # Check minimum length
    if len(token) < 32:
        return False
        
    # Check that token only contains valid characters
    valid_chars = set(string.ascii_letters + string.digits)
    return all(c in valid_chars for c in token)

