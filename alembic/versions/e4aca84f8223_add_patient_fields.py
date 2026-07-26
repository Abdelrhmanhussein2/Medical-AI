"""add_patient_fields

Revision ID: e4aca84f8223
Revises: a901f8b6f361
Create Date: 2026-07-26 03:47:09.212474

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4aca84f8223'
down_revision: Union[str, Sequence[str], None] = 'a901f8b6f361'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('patients', sa.Column('file_id', sa.String(length=100), nullable=True))
    op.add_column('patients', sa.Column('diseases', sa.Text(), nullable=True))
    op.add_column('patients', sa.Column('habits', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('patients', 'habits')
    op.drop_column('patients', 'diseases')
    op.drop_column('patients', 'file_id')
