"""add_token_columns_to_sessions

Revision ID: 9e6615a29bf8
Revises: df7ca62e7617
Create Date: 2026-07-26 17:00:37.152958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e6615a29bf8'
down_revision: Union[str, Sequence[str], None] = 'df7ca62e7617'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('sessions', sa.Column('ai_prompt_tokens', sa.Integer(), nullable=True))
    op.add_column('sessions', sa.Column('ai_completion_tokens', sa.Integer(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('sessions', 'ai_prompt_tokens')
    op.drop_column('sessions', 'ai_completion_tokens')
