"""add doctor_id to patients

Revision ID: d5e9f8a7c6b5
Revises: d4e9d7c3b2a1
Create Date: 2026-07-16 19:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd5e9f8a7c6b5'
down_revision: Union[str, Sequence[str], None] = 'd4e9d7c3b2a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('patients', sa.Column('doctor_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_patients_doctor',
        'patients', 'doctors',
        ['doctor_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('idx_patients_doctor', 'patients', ['doctor_id'])


def downgrade() -> None:
    op.drop_index('idx_patients_doctor', table_name='patients')
    op.drop_constraint('fk_patients_doctor', 'patients', type_='foreignkey')
    op.drop_column('patients', 'doctor_id')
