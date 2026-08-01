"""add_pricing_config_and_plans

Revision ID: f3a1b2c4d5e6
Revises: 7b80fea636d6, cf15f88063d1
Create Date: 2026-08-01 15:53:00.000000

جداول التسعيرة الداخلية (internal cost tracking).
لا تؤثر على أي جداول موجودة مسبقاً.
يدمج أيضاً فرع cf15f88063d1 (add_general_summary_to_patients).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3a1b2c4d5e6'
down_revision: Union[str, Sequence[str], None] = ('7b80fea636d6', 'cf15f88063d1')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create pricing_config, subscription_plans, calculate_messages_included, and plans_with_message_limits."""
    op.execute(sa.text("""
    -- =========================================================================
    -- 1) PRICING CONFIG — singleton row, one-per-deployment
    -- =========================================================================
    CREATE TABLE pricing_config (
        id                          serial          PRIMARY KEY,
        voice_cost_per_minute       numeric(10,6)   NOT NULL DEFAULT 0.007,
        llm_input_price_per_million numeric(10,4)   NOT NULL DEFAULT 0.15,
        llm_output_price_per_million numeric(10,4)  NOT NULL DEFAULT 0.60,
        avg_tokens_per_message      int             NOT NULL DEFAULT 6000,
        input_token_ratio           numeric(3,2)    NOT NULL DEFAULT 0.70,
        output_token_ratio          numeric(3,2)    NOT NULL DEFAULT 0.30,
        updated_at                  timestamptz     NOT NULL DEFAULT now()
    );

    -- Guarantee exactly one row at all times
    CREATE UNIQUE INDEX pricing_config_singleton ON pricing_config ((id = 1)) WHERE id = 1;

    -- Auto-update updated_at on any change
    CREATE OR REPLACE FUNCTION trg_fn_pricing_config_updated_at()
    RETURNS trigger AS $trg$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $trg$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_pricing_config_updated_at
        BEFORE UPDATE ON pricing_config
        FOR EACH ROW EXECUTE FUNCTION trg_fn_pricing_config_updated_at();

    -- Seed the singleton row
    INSERT INTO pricing_config DEFAULT VALUES;

    -- =========================================================================
    -- 2) SUBSCRIPTION PLANS — internal cost/quota catalogue
    -- =========================================================================
    CREATE TABLE subscription_plans (
        id                      serial          PRIMARY KEY,
        plan_code               text            UNIQUE NOT NULL,
        target_type             text            NOT NULL CHECK (target_type IN ('doctor', 'organization')),
        price_usd               numeric(10,2)   NOT NULL,
        voice_minutes_included  int             NOT NULL,
        message_budget_usd      numeric(10,2)   NOT NULL,
        doctors_included        int,
        price_per_extra_doctor  numeric(10,2),
        created_at              timestamptz     NOT NULL DEFAULT now(),
        updated_at              timestamptz     NOT NULL DEFAULT now()
    );

    -- Auto-update updated_at on any change
    CREATE OR REPLACE FUNCTION trg_fn_subscription_plans_updated_at()
    RETURNS trigger AS $trg$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $trg$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_subscription_plans_updated_at
        BEFORE UPDATE ON subscription_plans
        FOR EACH ROW EXECUTE FUNCTION trg_fn_subscription_plans_updated_at();

    -- =========================================================================
    -- 3) FUNCTION — calculate how many AI messages fit inside a plan's budget
    -- =========================================================================
    CREATE OR REPLACE FUNCTION calculate_messages_included(p_plan_id int)
    RETURNS int AS $$
    DECLARE
        v_message_budget numeric;
        v_message_cost   numeric;
        v_cfg            pricing_config%ROWTYPE;
    BEGIN
        SELECT * INTO v_cfg FROM pricing_config LIMIT 1;

        SELECT message_budget_usd
          INTO v_message_budget
          FROM subscription_plans
         WHERE id = p_plan_id;

        -- Cost per single AI exchange (input + output tokens)
        v_message_cost := v_cfg.avg_tokens_per_message *
            (v_cfg.input_token_ratio  * v_cfg.llm_input_price_per_million  / 1000000
           + v_cfg.output_token_ratio * v_cfg.llm_output_price_per_million / 1000000);

        RETURN floor(v_message_budget / v_message_cost);
    END;
    $$ LANGUAGE plpgsql;

    -- =========================================================================
    -- 4) VIEW — plans with computed message limits (convenience for analysis)
    -- =========================================================================
    CREATE VIEW plans_with_message_limits AS
    SELECT
        sp.id,
        sp.plan_code,
        sp.target_type,
        sp.price_usd,
        sp.voice_minutes_included,
        sp.message_budget_usd,
        sp.doctors_included,
        sp.price_per_extra_doctor,
        calculate_messages_included(sp.id) AS messages_included,
        sp.created_at,
        sp.updated_at
    FROM subscription_plans sp;
    """))


def downgrade() -> None:
    """Drop all objects created by this migration in reverse dependency order."""
    op.execute(sa.text("""
    DROP VIEW IF EXISTS plans_with_message_limits;

    DROP FUNCTION IF EXISTS calculate_messages_included(int);

    DROP TRIGGER IF EXISTS trg_subscription_plans_updated_at ON subscription_plans;
    DROP FUNCTION IF EXISTS trg_fn_subscription_plans_updated_at();
    DROP TABLE IF EXISTS subscription_plans;

    DROP TRIGGER IF EXISTS trg_pricing_config_updated_at ON pricing_config;
    DROP FUNCTION IF EXISTS trg_fn_pricing_config_updated_at();
    DROP TABLE IF EXISTS pricing_config;
    """))
