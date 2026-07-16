"""add_sessions

Revision ID: c3e1f2a84b59
Revises: afc90eae2d9c
Create Date: 2026-07-16 13:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3e1f2a84b59'
down_revision: Union[str, Sequence[str], None] = 'afc90eae2d9c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("""
    CREATE TYPE session_status AS ENUM ('in_progress', 'completed', 'summarized', 'failed');

    CREATE TABLE sessions (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
        doctor_id           UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        patient_id          UUID REFERENCES patients(id) ON DELETE SET NULL,

        -- النص والمحتوى
        transcript_raw      TEXT,           -- النص الكامل للمحادثة
        summary_text        TEXT,           -- الملخص العام
        soap_note           JSONB,          -- SOAP Note منظمة (S/O/A/P)
        patient_summary     TEXT,           -- ملخص الحالة للمريض
        prescriptions       JSONB,          -- الأدوية المقترحة من الـ AI
        tasks               JSONB,          -- مهام متابعة

        -- الميتاداتا
        duration_seconds    INT DEFAULT 0,
        status              session_status NOT NULL DEFAULT 'in_progress',
        ai_model_used       VARCHAR(100),   -- اسم الـ model المستخدم
        ai_tokens_used      INT,            -- عدد التوكنات

        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_sessions_doctor ON sessions(doctor_id);
    CREATE INDEX idx_sessions_appointment ON sessions(appointment_id);
    CREATE INDEX idx_sessions_patient ON sessions(patient_id);

    CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON sessions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("""
    DROP TRIGGER IF EXISTS trg_sessions_updated_at ON sessions;
    DROP TABLE IF EXISTS sessions CASCADE;
    DROP TYPE IF EXISTS session_status CASCADE;
    """))
