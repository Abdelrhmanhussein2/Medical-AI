"""
Add admin phone and appointment reminders log

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-08-01 19:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'b1c2d3e4f5a6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add phone column to admins table
    op.add_column('admins', sa.Column('phone', sa.String(length=30), nullable=True))

    # 2. Create appointment_reminders_log table
    op.create_table(
        'appointment_reminders_log',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('appointment_id', sa.UUID(), nullable=False),
        sa.Column('reminder_type', sa.String(length=5), nullable=False),
        sa.Column('phone', sa.String(length=30), nullable=False),
        sa.Column('status', sa.String(length=10), server_default='sent', nullable=False),
        sa.Column('sent_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('appointment_id', 'reminder_type')
    )
    # Create index for appointment_id
    op.create_index(
        'idx_appt_reminder_log_appt',
        'appointment_reminders_log',
        ['appointment_id'],
        unique=False
    )


def downgrade():
    op.drop_index('idx_appt_reminder_log_appt', table_name='appointment_reminders_log')
    op.drop_table('appointment_reminders_log')
    op.drop_column('admins', 'phone')
