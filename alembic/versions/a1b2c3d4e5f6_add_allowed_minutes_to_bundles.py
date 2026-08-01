"""
Alembic migration: add allowed_minutes column to subscription_bundles
and populate it with the same values used in session_service.py
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f3a1b2c4d5e6'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add the column (nullable first so existing rows don't break)
    op.add_column(
        'subscription_bundles',
        sa.Column('allowed_minutes', sa.Integer(), nullable=True)
    )

    # 2. Populate existing bundles from the name-based logic
    op.execute("""
        UPDATE subscription_bundles SET allowed_minutes =
            CASE
                WHEN LOWER(name) LIKE '%starter%'    THEN 1000
                WHEN LOWER(name) LIKE '%pro%'        THEN 2000
                WHEN LOWER(name) LIKE '%business%'   THEN 3500
                WHEN LOWER(name) LIKE '%enterprise%' THEN 5000
                WHEN LOWER(name) LIKE '%silver%'     THEN 10000
                WHEN LOWER(name) LIKE '%gold%'       THEN 20000
                WHEN LOWER(name) LIKE '%platinum%'   THEN 50000
                ELSE 60
            END
    """)

    # 3. Make it NOT NULL with a sensible default
    op.alter_column('subscription_bundles', 'allowed_minutes',
                    nullable=False, server_default='60')


def downgrade():
    op.drop_column('subscription_bundles', 'allowed_minutes')
