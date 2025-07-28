"""Add wol_logs table for statistics

Revision ID: 003
Create Date: 2025-01-28
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None

def upgrade():
    # Check if table already exists
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create wol_logs table if it doesn't exist
    if 'wol_logs' not in existing_tables:
        op.create_table('wol_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('device_id', sa.Integer(), nullable=False),
            sa.Column('timestamp', sa.DateTime(), nullable=False, default=datetime.utcnow),
            sa.Column('success', sa.Boolean(), nullable=False),
            sa.Column('response_time', sa.Integer(), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['device_id'], ['hosts.id'], ),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        
        # Create indexes for better query performance
        op.create_index('ix_wol_logs_device_id', 'wol_logs', ['device_id'])
        op.create_index('ix_wol_logs_timestamp', 'wol_logs', ['timestamp'])
        op.create_index('ix_wol_logs_user_id', 'wol_logs', ['user_id'])

def downgrade():
    # Drop indexes first
    try:
        op.drop_index('ix_wol_logs_user_id', table_name='wol_logs')
        op.drop_index('ix_wol_logs_timestamp', table_name='wol_logs')
        op.drop_index('ix_wol_logs_device_id', table_name='wol_logs')
    except:
        pass  # Indexes might not exist
    
    # Drop table
    op.drop_table('wol_logs')
