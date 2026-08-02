"""
Add must change password to doctors

Revision ID: d3c2b1a0f9e8
Revises: c2d3e4f5a6b7
Create Date: 2026-08-02 17:32:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd3c2b1a0f9e8'
down_revision = 'c2d3e4f5a6b7'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('doctors', sa.Column('must_change_password', sa.Boolean(), server_default='false', nullable=False))

def downgrade():
    op.drop_column('doctors', 'must_change_password')
