"""add payment_orders table

Revision ID: a00000000003
Revises: a00000000002
Create Date: 2026-08-19 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a00000000003'
down_revision = 'a00000000002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create payment_status enum type
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
                CREATE TYPE public.payment_status AS ENUM (
                    'pending',
                    'paid',
                    'failed',
                    'refunded',
                    'authorized'
                );
            END IF;
        END
        $$;
    """)

    # Create payment_orders table
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.payment_orders (
            id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
            doctor_id UUID REFERENCES public.doctors(id) ON DELETE SET NULL,
            department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
            bundle_id UUID NOT NULL REFERENCES public.subscription_bundles(id) ON DELETE RESTRICT,
            moyasar_payment_id VARCHAR(100),
            amount NUMERIC(10, 2) NOT NULL,
            currency VARCHAR(5) NOT NULL DEFAULT 'SAR',
            status public.payment_status NOT NULL DEFAULT 'pending',
            idempotency_key VARCHAR(150) UNIQUE,
            callback_url TEXT,
            metadata JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT chk_payment_order_owner CHECK (
                (doctor_id IS NOT NULL AND department_id IS NULL) OR
                (doctor_id IS NULL AND department_id IS NOT NULL)
            )
        );
    """)

    # Index for fast lookups by moyasar_payment_id
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_payment_orders_moyasar_id
        ON public.payment_orders(moyasar_payment_id)
        WHERE moyasar_payment_id IS NOT NULL;
    """)

    # Index for user's payment history
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_payment_orders_doctor_id
        ON public.payment_orders(doctor_id)
        WHERE doctor_id IS NOT NULL;
    """)

    # Trigger: auto-update updated_at
    op.execute("""
        DROP TRIGGER IF EXISTS trg_payment_orders_updated_at ON public.payment_orders;
        CREATE TRIGGER trg_payment_orders_updated_at
        BEFORE UPDATE ON public.payment_orders
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_payment_orders_updated_at ON public.payment_orders;")
    op.execute("DROP INDEX IF EXISTS idx_payment_orders_doctor_id;")
    op.execute("DROP INDEX IF EXISTS idx_payment_orders_moyasar_id;")
    op.execute("DROP TABLE IF EXISTS public.payment_orders;")
    op.execute("DROP TYPE IF EXISTS public.payment_status;")
