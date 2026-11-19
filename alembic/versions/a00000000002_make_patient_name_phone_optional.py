"""make patient name and phone optional for privacy-first de-identification

Revision ID: a00000000002
Revises: a00000000001
Create Date: 2026-11-20 01:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a00000000002'
down_revision = 'a00000000001'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("ALTER TABLE public.patients ALTER COLUMN name DROP NOT NULL;")
    op.execute("ALTER TABLE public.patients ALTER COLUMN phone DROP NOT NULL;")
    op.execute("UPDATE public.patients SET phone = NULL WHERE phone = '';")
    op.execute("UPDATE public.patients SET name = NULL WHERE name = '';")

def downgrade() -> None:
    op.execute("UPDATE public.patients SET phone = 'unknown' WHERE phone IS NULL;")
    op.execute("UPDATE public.patients SET name = 'unknown' WHERE name IS NULL;")
    op.execute("ALTER TABLE public.patients ALTER COLUMN name SET NOT NULL;")
    op.execute("ALTER TABLE public.patients ALTER COLUMN phone SET NOT NULL;")
