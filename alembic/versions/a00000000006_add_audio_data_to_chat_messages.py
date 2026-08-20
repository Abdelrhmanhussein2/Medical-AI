"""add audio_data to chat_messages

Revision ID: a00000000006
Revises: a00000000005
Create Date: 2026-08-21 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a00000000006'
down_revision = 'a00000000005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS audio_data BYTEA;"
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS audio_data;"
    )
