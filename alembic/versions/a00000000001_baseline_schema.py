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

def downgrade() -> None:
    pass
