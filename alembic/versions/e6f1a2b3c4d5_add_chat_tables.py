"""add chat tables

Revision ID: e6f1a2b3c4d5
Revises: d5e9f8a7c6b5
Create Date: 2026-07-19 19:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e6f1a2b3c4d5'
down_revision: Union[str, Sequence[str], None] = 'd5e9f8a7c6b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create chat_threads table
    op.create_table(
        'chat_threads',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('owner_type', sa.String(length=10), nullable=False),
        sa.Column('owner_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('dept', sa.String(length=100), nullable=True),
        sa.Column('is_pinned', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('message_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('ai_context_summary', sa.Text(), nullable=True),
        sa.Column('summary_updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("owner_type IN ('doctor', 'admin')", name='chk_thread_owner_type')
    )
    op.create_index('idx_chat_threads_owner', 'chat_threads', ['owner_type', 'owner_id'])

    # 2. Create chat_messages table
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.UUID(), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('thread_id', sa.UUID(), nullable=False),
        sa.Column('sender_type', sa.String(length=5), nullable=False),
        sa.Column('content', sa.LargeBinary(), nullable=False),
        sa.Column('bento_data', sa.JSON(), nullable=True),
        sa.Column('insight_data', sa.JSON(), nullable=True),
        sa.Column('actions_data', sa.ARRAY(sa.Text()), nullable=True),
        sa.Column('is_audio', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('audio_duration', sa.String(length=10), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['thread_id'], ['chat_threads.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("sender_type IN ('user', 'ai')", name='chk_msg_sender_type')
    )
    op.create_index('idx_chat_messages_thread', 'chat_messages', ['thread_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('idx_chat_messages_thread', table_name='chat_messages')
    op.drop_table('chat_messages')
    op.drop_index('idx_chat_threads_owner', table_name='chat_threads')
    op.drop_table('chat_threads')
