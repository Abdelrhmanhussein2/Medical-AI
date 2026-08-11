"""add ehr_system to doctors

Revision ID: a00000000002
Revises: a00000000001
Create Date: 2026-08-11 13:44:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a00000000002'
down_revision = 'a00000000001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS ehr_system VARCHAR(150);"
    )


def downgrade() -> None:
    op.drop_column('doctors', 'ehr_system')
