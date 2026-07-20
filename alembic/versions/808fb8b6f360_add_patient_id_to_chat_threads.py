"""add patient_id to chat_threads

Revision ID: 808fb8b6f360
Revises: e6f1a2b3c4d5
Create Date: 2026-07-20 16:47:52.088025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '808fb8b6f360'
down_revision: Union[str, Sequence[str], None] = 'e6f1a2b3c4d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('chat_threads', sa.Column('patient_id', sa.UUID(), nullable=True))
    op.create_foreign_key(None, 'chat_threads', 'patients', ['patient_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'chat_threads', type_='foreignkey')
    op.drop_column('chat_threads', 'patient_id')
