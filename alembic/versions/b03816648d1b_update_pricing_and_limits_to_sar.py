"""update_pricing_and_limits_to_sar

Revision ID: b03816648d1b
Revises: 2b4884670f84
Create Date: 2026-08-03 17:22:41.412260

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b03816648d1b'
down_revision: Union[str, Sequence[str], None] = '2b4884670f84'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("""
        -- Update subscription_plans
        UPDATE subscription_plans
        SET price_usd = 11.00, voice_minutes_included = 1285, message_budget_usd = 2.00, updated_at = now()
        WHERE plan_code = 'doctor_basic';

        UPDATE subscription_plans
        SET price_usd = 22.00, voice_minutes_included = 2570, message_budget_usd = 4.00, updated_at = now()
        WHERE plan_code = 'doctor_pro';

        UPDATE subscription_plans
        SET price_usd = 44.00, voice_minutes_included = 5140, message_budget_usd = 8.00, updated_at = now()
        WHERE plan_code = 'org_4_doctors';

        UPDATE subscription_plans
        SET price_usd = 77.00, voice_minutes_included = 9000, message_budget_usd = 14.00, updated_at = now()
        WHERE plan_code = 'org_7_doctors';

        -- Update subscription_bundles
        UPDATE subscription_bundles
        SET price = 149.00, allowed_minutes = 1285, allowed_messages = 1169, updated_at = now()
        WHERE name = 'SBR AI Starter' AND target_type = 'doctor';

        UPDATE subscription_bundles
        SET price = 279.00, allowed_minutes = 2570, allowed_messages = 2339, updated_at = now()
        WHERE name = 'SBR AI Pro' AND target_type = 'doctor';

        UPDATE subscription_bundles
        SET price = 549.00, allowed_minutes = 5140, allowed_messages = 4678, updated_at = now()
        WHERE name = 'SBR AI Business';

        UPDATE subscription_bundles
        SET price = 799.00, allowed_minutes = 9000, allowed_messages = 8187, updated_at = now()
        WHERE name = 'SBR AI Enterprise';
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("""
        -- Restore subscription_plans
        UPDATE subscription_plans
        SET price_usd = 15.00, voice_minutes_included = 1500, message_budget_usd = 4.50, updated_at = now()
        WHERE plan_code = 'doctor_basic';

        UPDATE subscription_plans
        SET price_usd = 25.00, voice_minutes_included = 3000, message_budget_usd = 4.00, updated_at = now()
        WHERE plan_code = 'doctor_pro';

        UPDATE subscription_plans
        SET price_usd = 58.00, voice_minutes_included = 6000, message_budget_usd = 16.00, updated_at = now()
        WHERE plan_code = 'org_4_doctors';

        UPDATE subscription_plans
        SET price_usd = 84.00, voice_minutes_included = 8000, message_budget_usd = 28.00, updated_at = now()
        WHERE plan_code = 'org_7_doctors';

        -- Restore subscription_bundles
        UPDATE subscription_bundles
        SET price = 149.00, allowed_minutes = 1500, allowed_messages = 2650, updated_at = now()
        WHERE name = 'SBR AI Starter' AND target_type = 'doctor';

        UPDATE subscription_bundles
        SET price = 249.00, allowed_minutes = 3000, allowed_messages = 2350, updated_at = now()
        WHERE name = 'SBR AI Pro' AND target_type = 'doctor';

        UPDATE subscription_bundles
        SET price = 449.00, allowed_minutes = 3500, allowed_messages = 5000, updated_at = now()
        WHERE name = 'SBR AI Business' AND target_type = 'doctor';

        UPDATE subscription_bundles
        SET price = 449.00, allowed_minutes = 6000, allowed_messages = 9400, updated_at = now()
        WHERE name = 'SBR AI Business' AND target_type = 'department';

        UPDATE subscription_bundles
        SET price = 599.00, allowed_minutes = 5000, allowed_messages = 8000, updated_at = now()
        WHERE name = 'SBR AI Enterprise' AND target_type = 'doctor';

        UPDATE subscription_bundles
        SET price = 599.00, allowed_minutes = 8000, allowed_messages = 16450, updated_at = now()
        WHERE name = 'SBR AI Enterprise' AND target_type = 'department';
    """))

