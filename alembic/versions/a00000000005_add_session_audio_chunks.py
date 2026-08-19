"""add session_audio_chunks table

Revision ID: a00000000005
Revises: a00000000004
Create Date: 2026-08-19 23:00:00.000000

Purpose
-------
Stores individual audio chunks received during a medical session, along with
their encrypted binary audio data and their encrypted transcript text.

Schema
------
session_audio_chunks
  id               UUID PRIMARY KEY  — unique chunk identifier
  session_id       UUID NOT NULL     — FK → sessions(id) ON DELETE CASCADE
  doctor_id        UUID NOT NULL     — FK → doctors(id)  ON DELETE CASCADE
  chunk_index      INTEGER NOT NULL  — ordering of this chunk within the session (0-based)
  audio_data       BYTEA NOT NULL    — Fernet-encrypted raw audio bytes
  transcript       BYTEA             — Fernet-encrypted transcript text (NULL until transcribed)
  duration_ms      INTEGER           — audio duration of this chunk in milliseconds (optional)
  created_at       TIMESTAMPTZ       — when this chunk was stored

Encryption
----------
Both `audio_data` and `transcript` are stored as PostgreSQL BYTEA columns.
The application layer encrypts/decrypts them using:
  - app.core.encryption.encrypt_binary(raw_bytes)  → encrypted BYTEA
  - app.core.encryption.decrypt_binary(ciphertext) → original raw bytes
  - app.core.encryption.encrypt_text(plaintext)    → encrypted BYTEA
  - app.core.encryption.decrypt_bytes(ciphertext)  → plaintext str
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a00000000005'
down_revision = 'a00000000004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Create the table ──────────────────────────────────────────────────────
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

    # ── Indexes ───────────────────────────────────────────────────────────────
    # Primary lookup: all chunks for a session, in order
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sac_session_order
        ON public.session_audio_chunks (session_id, chunk_index ASC);
    """)

    # Secondary lookup: all chunks belonging to a doctor (for auditing / admin)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_sac_doctor_id
        ON public.session_audio_chunks (doctor_id);
    """)

    # ── Unique constraint: (session_id, chunk_index) must be unique ───────────
    op.execute("""
        ALTER TABLE public.session_audio_chunks
        ADD CONSTRAINT uq_sac_session_chunk_index
        UNIQUE (session_id, chunk_index);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.session_audio_chunks;")
