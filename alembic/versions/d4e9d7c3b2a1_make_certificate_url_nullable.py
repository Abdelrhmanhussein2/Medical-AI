"""make certificate_url nullable

Revision ID: d4e9d7c3b2a1
Revises: c3e1f2a84b59
Create Date: 2026-07-16 19:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e9d7c3b2a1'
down_revision: Union[str, Sequence[str], None] = 'c3e1f2a84b59'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('doctors', 'certificate_url',
               existing_type=sa.Text(),
               nullable=True)


def downgrade() -> None:
    op.alter_column('doctors', 'certificate_url',
               existing_type=sa.Text(),
               nullable=False)
