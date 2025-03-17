"""Add public access fields

Revision ID: 001
Create Date: 2024-01-10
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Get existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('hosts')]
    
    # Add public_access column if it doesn't exist
    if 'public_access' not in existing_columns:
        op.add_column('hosts', sa.Column('public_access', sa.Boolean(), nullable=False, server_default='0'))
    
    # Add public_access_token column if it doesn't exist
    if 'public_access_token' not in existing_columns:
        op.add_column('hosts', sa.Column('public_access_token', sa.String(length=64), nullable=True, unique=True))
    
    # Create index if it doesn't exist
    try:
        op.create_index('ix_hosts_public_access_token', 'hosts', ['public_access_token'], unique=True)
    except Exception:
        pass

def downgrade():
    op.drop_index('ix_hosts_public_access_token', 'hosts')
    op.drop_column('hosts', 'public_access_token')
    op.drop_column('hosts', 'public_access')

