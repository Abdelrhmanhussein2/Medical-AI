"""update_bundles_quota_and_seats

Revision ID: 7b78954a2708
Revises: d3c2b1a0f9e8
Create Date: 2026-08-03 00:46:17.617816

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b78954a2708'
down_revision: Union[str, Sequence[str], None] = 'd3c2b1a0f9e8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 1500 
        WHERE name = 'SBR AI Starter' AND target_type = 'doctor';
    """)
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 3000 
        WHERE name = 'SBR AI Pro' AND target_type = 'doctor';
    """)
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 5000, max_doctors = 4 
        WHERE name = 'SBR AI Business' AND target_type = 'department';
    """)
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 8000, max_doctors = 7 
        WHERE name = 'SBR AI Enterprise' AND target_type = 'department';
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 1000 
        WHERE name = 'SBR AI Starter' AND target_type = 'doctor';
    """)
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 2000 
        WHERE name = 'SBR AI Pro' AND target_type = 'doctor';
    """)
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 3500, max_doctors = 15 
        WHERE name = 'SBR AI Business' AND target_type = 'department';
    """)
    op.execute("""
        UPDATE subscription_bundles 
        SET allowed_minutes = 5000, max_doctors = 50 
        WHERE name = 'SBR AI Enterprise' AND target_type = 'department';
    """)

