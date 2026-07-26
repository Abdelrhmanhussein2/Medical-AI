"""add_token_usage_logs

Revision ID: df7ca62e7617
Revises: e4aca84f8223
Create Date: 2026-07-26 16:36:25.296785

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'df7ca62e7617'
down_revision: Union[str, Sequence[str], None] = 'e4aca84f8223'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("""
    CREATE TABLE token_usage_logs (
        id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id         UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        service_type      VARCHAR(50) NOT NULL, -- 'chat_agent', 'summarization', etc.
        model_name        VARCHAR(100) NOT NULL,
        prompt_tokens     INT NOT NULL DEFAULT 0,
        completion_tokens INT NOT NULL DEFAULT 0,
        total_tokens      INT NOT NULL DEFAULT 0,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX idx_token_usage_doctor ON token_usage_logs(doctor_id, created_at);
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("""
    DROP TABLE IF EXISTS token_usage_logs CASCADE;
    """))
