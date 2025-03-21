"""Add last_wake_time field

Revision ID: 002
Create Date: 2024-05-18
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None

def upgrade():
    # Get existing columns
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('hosts')]
    
    # Add last_wake_time column if it doesn't exist
    if 'last_wake_time' not in existing_columns:
        op.add_column('hosts', sa.Column('last_wake_time', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('hosts', 'last_wake_time')

