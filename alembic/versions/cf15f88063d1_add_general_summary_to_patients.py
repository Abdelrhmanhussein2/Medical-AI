"""add_general_summary_to_patients

Revision ID: cf15f88063d1
Revises: 9e6615a29bf8
Create Date: 2026-07-26 18:24:38.052665

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cf15f88063d1'
down_revision: Union[str, Sequence[str], None] = '9e6615a29bf8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('patients', sa.Column('general_summary', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('patients', 'general_summary')
