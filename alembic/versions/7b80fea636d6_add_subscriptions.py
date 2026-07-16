"""add_subscriptions

Revision ID: 7b80fea636d6
Revises: 8b709742a161
Create Date: 2026-07-16 02:34:15.779801

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7b80fea636d6'
down_revision: Union[str, Sequence[str], None] = '8b709742a161'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("""
    -- =====================================================================
    -- SUBSCRIPTION BUNDLES (الباقات)
    -- =====================================================================
    CREATE TYPE bundle_target AS ENUM ('department', 'doctor');

    CREATE TABLE subscription_bundles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(150) NOT NULL,
        target_type   bundle_target NOT NULL, -- هل هي للإدارات ولا للدكاترة المستقلين
        max_doctors   INT,                    -- عدد الدكاترة المسموح (للإدارات), NULL لو للدكتور المستقل
        duration_days INT NOT NULL,           -- مدة الباقة بالأيام
        price         NUMERIC(10, 2) NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- =====================================================================
    -- SUBSCRIPTIONS (الاشتراكات الفعلية)
    -- =====================================================================
    CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');

    CREATE TABLE subscriptions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- لو الاشتراك تبع إدارة
        doctor_id     UUID REFERENCES doctors(id) ON DELETE CASCADE,     -- لو الاشتراك تبع دكتور مستقل
        bundle_id     UUID NOT NULL REFERENCES subscription_bundles(id),
        
        start_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
        end_date      TIMESTAMPTZ NOT NULL,
        status        subscription_status NOT NULL DEFAULT 'active',
        
        total_seats   INT, -- يتنسخ من الباقة وقت الاشتراك (عشان لو الباقة اتغيرت بعدين)
        
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

        -- لازم الاشتراك يكون مربوط بإدارة أو دكتور مش الاتنين مع بعض
        CONSTRAINT chk_subscription_owner CHECK (
            (department_id IS NOT NULL AND doctor_id IS NULL) OR
            (department_id IS NULL AND doctor_id IS NOT NULL)
        )
    );

    CREATE INDEX idx_subscriptions_department ON subscriptions(department_id);
    CREATE INDEX idx_subscriptions_doctor ON subscriptions(doctor_id);

    -- =====================================================================
    -- SUBSCRIPTION DOCTORS (الدكاترة المفعلين جوه اشتراك الإدارة)
    -- =====================================================================
    CREATE TABLE subscription_doctors (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        
        -- لضمان إن الدكتور مايتضافش لنفس الاشتراك مرتين
        UNIQUE(subscription_id, doctor_id)
    );

    CREATE INDEX idx_subscription_doctors_sub ON subscription_doctors(subscription_id);
    CREATE INDEX idx_subscription_doctors_doc ON subscription_doctors(doctor_id);

    CREATE TRIGGER trg_subscription_bundles_updated_at BEFORE UPDATE ON subscription_bundles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("""
    DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
    DROP TRIGGER IF EXISTS trg_subscription_bundles_updated_at ON subscription_bundles;

    DROP TABLE IF EXISTS subscription_doctors CASCADE;
    DROP TABLE IF EXISTS subscriptions CASCADE;
    DROP TABLE IF EXISTS subscription_bundles CASCADE;

    DROP TYPE IF EXISTS subscription_status CASCADE;
    DROP TYPE IF EXISTS bundle_target CASCADE;
    """))
