"""add audio_file_path to chat_messages

Revision ID: a901f8b6f361
Revises: 808fb8b6f360
Create Date: 2026-07-21 18:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a901f8b6f361'
down_revision: Union[str, Sequence[str], None] = '808fb8b6f360'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('chat_messages', sa.Column('audio_file_path', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('chat_messages', 'audio_file_path')
