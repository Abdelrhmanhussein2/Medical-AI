"""baseline schema

Revision ID: a00000000001
Revises: None
Create Date: 2026-08-04 18:30:00.000000

"""
import os
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a00000000001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    current_dir = os.path.dirname(__file__)
    schema_path = os.path.abspath(os.path.join(current_dir, "..", "..", "app", "models", "schema.sql"))
    with open(schema_path, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    
    # Alembic runs migrations online with connection, op.execute will execute it
    op.execute(sa.text(schema_sql))

    # ── Squashed Migrations (2 to 6) ──────────────────────────────────────────
    # ── Add ehr_system to doctors (originally a00000000002)
    op.execute("ALTER TABLE doctors ADD COLUMN IF NOT EXISTS ehr_system VARCHAR(150);")

    # ── Add payment_orders table and enum (originally a00000000003)
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

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_payment_orders_moyasar_id
        ON public.payment_orders(moyasar_payment_id)
        WHERE moyasar_payment_id IS NOT NULL;
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_payment_orders_doctor_id
        ON public.payment_orders(doctor_id)
        WHERE doctor_id IS NOT NULL;
    """)

    op.execute("""
        DROP TRIGGER IF EXISTS trg_payment_orders_updated_at ON public.payment_orders;
        CREATE TRIGGER trg_payment_orders_updated_at
        BEFORE UPDATE ON public.payment_orders
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    """)

    # ── Add initiated status to payment_status enum (originally a00000000004)
    op.execute("ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'initiated';")

    # ── Add session_audio_chunks table (originally a00000000005)
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.session_audio_chunks (
            id           UUID        NOT NULL DEFAULT gen_random_uuid(),
            session_id   UUID        NOT NULL,
            doctor_id    UUID        NOT NULL,
            chunk_index  INTEGER     NOT NULL DEFAULT 0,
            audio_data   BYTEA       NOT NULL,
            transcript   BYTEA,
            duration_ms  INTEGER,
            created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

            CONSTRAINT session_audio_chunks_pkey PRIMARY KEY (id),

            CONSTRAINT fk_sac_session
                FOREIGN KEY (session_id)
                REFERENCES public.sessions(id)
                ON DELETE CASCADE,

            CONSTRAINT fk_sac_doctor
                FOREIGN KEY (doctor_id)
                REFERENCES public.doctors(id)
                ON DELETE CASCADE
        );
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sac_session_order
        ON public.session_audio_chunks (session_id, chunk_index ASC);
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sac_doctor_id
        ON public.session_audio_chunks (doctor_id);
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_sac_session_chunk_index'
            ) THEN
                ALTER TABLE public.session_audio_chunks
                ADD CONSTRAINT uq_sac_session_chunk_index
                UNIQUE (session_id, chunk_index);
            END IF;
        END
        $$;
    """)

    # ── Add audio_data to chat_messages (originally a00000000006)
    op.execute("ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS audio_data BYTEA;")

def downgrade() -> None:
    pass
