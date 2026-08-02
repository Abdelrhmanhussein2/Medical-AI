"""add_limits_to_subscriptions

Revision ID: 2b4884670f84
Revises: 7b78954a2708
Create Date: 2026-08-03 01:00:17.274203

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b4884670f84'
down_revision: Union[str, Sequence[str], None] = '7b78954a2708'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Add columns
    op.add_column('subscription_bundles', sa.Column('allowed_messages', sa.Integer(), nullable=True))
    op.add_column('subscriptions', sa.Column('allowed_minutes', sa.Integer(), nullable=True))
    op.add_column('subscriptions', sa.Column('allowed_messages', sa.Integer(), nullable=True))

    # 2. Populate allowed_messages on bundles
    op.execute("""
        UPDATE subscription_bundles SET allowed_messages = 
            CASE
                WHEN LOWER(name) LIKE '%starter%'    THEN 2650
                WHEN LOWER(name) LIKE '%pro%'        THEN 2350
                WHEN LOWER(name) LIKE '%business%'   THEN 9400
                WHEN LOWER(name) LIKE '%enterprise%' THEN 16450
                WHEN LOWER(name) LIKE '%trial%'      THEN 100
                ELSE 1000
            END
    """)

    # 3. Populate existing subscriptions from bundles
    op.execute("""
        UPDATE subscriptions s
        SET allowed_minutes = b.allowed_minutes,
            allowed_messages = b.allowed_messages
        FROM subscription_bundles b
        WHERE s.bundle_id = b.id;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('subscriptions', 'allowed_messages')
    op.drop_column('subscriptions', 'allowed_minutes')
    op.drop_column('subscription_bundles', 'allowed_messages')

