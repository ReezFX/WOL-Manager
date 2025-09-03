"""Add 2FA fields to users table

Revision ID: 005
Create Date: 2025-01-03
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None

def upgrade():
    """Add 2FA fields to the users table."""
    
    # Get existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Add twofa_enabled column if it doesn't exist
    if 'twofa_enabled' not in existing_columns:
        op.add_column('users', sa.Column('twofa_enabled', sa.Boolean(), nullable=False, server_default='0'))
        # Update default value for any existing records
        conn.execute(text("UPDATE users SET twofa_enabled = 0 WHERE twofa_enabled IS NULL"))
    
    # Add twofa_secret column if it doesn't exist
    if 'twofa_secret' not in existing_columns:
        op.add_column('users', sa.Column('twofa_secret', sa.String(length=32), nullable=True))
    
    # Add twofa_backup_codes column if it doesn't exist (JSON stored as Text)
    if 'twofa_backup_codes' not in existing_columns:
        op.add_column('users', sa.Column('twofa_backup_codes', sa.Text(), nullable=True))
        # Initialize with empty array for existing records
        conn.execute(text("UPDATE users SET twofa_backup_codes = '[]' WHERE twofa_backup_codes IS NULL"))
    
    # Add twofa_trusted_devices column if it doesn't exist (JSON stored as Text)
    if 'twofa_trusted_devices' not in existing_columns:
        op.add_column('users', sa.Column('twofa_trusted_devices', sa.Text(), nullable=True))
        # Initialize with empty array for existing records
        conn.execute(text("UPDATE users SET twofa_trusted_devices = '[]' WHERE twofa_trusted_devices IS NULL"))
    
    # Add twofa_last_used_backup column if it doesn't exist
    if 'twofa_last_used_backup' not in existing_columns:
        op.add_column('users', sa.Column('twofa_last_used_backup', sa.String(length=16), nullable=True))
    
    print("✓ Added 2FA fields to users table")

def downgrade():
    """Remove 2FA fields from the users table."""
    
    # Get existing columns before dropping
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('users')]
    
    # Remove the added columns if they exist
    if 'twofa_last_used_backup' in existing_columns:
        op.drop_column('users', 'twofa_last_used_backup')
    
    if 'twofa_trusted_devices' in existing_columns:
        op.drop_column('users', 'twofa_trusted_devices')
    
    if 'twofa_backup_codes' in existing_columns:
        op.drop_column('users', 'twofa_backup_codes')
    
    if 'twofa_secret' in existing_columns:
        op.drop_column('users', 'twofa_secret')
    
    if 'twofa_enabled' in existing_columns:
        op.drop_column('users', 'twofa_enabled')
    
    print("✓ Removed 2FA fields from users table")
