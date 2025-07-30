"""Add update checker fields to app_settings table

Revision ID: 004
Create Date: 2025-01-30
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None

def upgrade():
    # Get existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('app_settings')]
    
    # Add local_version column if it doesn't exist
    if 'local_version' not in existing_columns:
        op.add_column('app_settings', sa.Column('local_version', sa.String(length=20), nullable=True))
    
    # Add remote_version column if it doesn't exist
    if 'remote_version' not in existing_columns:
        op.add_column('app_settings', sa.Column('remote_version', sa.String(length=20), nullable=True))
    
    # Add update_available column if it doesn't exist
    if 'update_available' not in existing_columns:
        op.add_column('app_settings', sa.Column('update_available', sa.Boolean(), nullable=False, server_default='0'))
    
    # Add last_update_check column if it doesn't exist
    if 'last_update_check' not in existing_columns:
        op.add_column('app_settings', sa.Column('last_update_check', sa.DateTime(), nullable=True))
    
    # Add check_error column if it doesn't exist
    if 'check_error' not in existing_columns:
        op.add_column('app_settings', sa.Column('check_error', sa.Text(), nullable=True))

def downgrade():
    # Remove the added columns
    op.drop_column('app_settings', 'check_error')
    op.drop_column('app_settings', 'last_update_check')
    op.drop_column('app_settings', 'update_available')
    op.drop_column('app_settings', 'remote_version')
    op.drop_column('app_settings', 'local_version')
