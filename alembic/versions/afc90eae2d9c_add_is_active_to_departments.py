"""add_is_active_to_departments

Revision ID: afc90eae2d9c
Revises: 7b80fea636d6
Create Date: 2026-07-16 03:25:17.046236

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'afc90eae2d9c'
down_revision: Union[str, Sequence[str], None] = '7b80fea636d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("ALTER TABLE departments ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;"))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("ALTER TABLE departments DROP COLUMN is_active;"))
