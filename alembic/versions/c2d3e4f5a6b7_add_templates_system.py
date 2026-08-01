"""
Add templates system

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-08-01 19:10:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c2d3e4f5a6b7'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create template_field_registry table
    op.create_table(
        'template_field_registry',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('field_name', sa.String(length=150), nullable=False),
        sa.Column('usage_count', sa.Integer(), server_default='1', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('field_name')
    )
    # Create GIN index for search on field_name
    op.execute("CREATE INDEX idx_field_registry_name ON template_field_registry USING gin(to_tsvector('simple', field_name));")

    # 2. Create note_templates table
    op.create_table(
        'note_templates',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('doctor_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('fields', postgresql.JSONB(astext_type=sa.Text()), server_default='[]', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('doctor_id', 'name')
    )
    op.create_index('idx_note_templates_doctor', 'note_templates', ['doctor_id'], unique=False)

    # 3. Create patient_template_fills table
    op.create_table(
        'patient_template_fills',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('patient_id', sa.UUID(), nullable=False),
        sa.Column('doctor_id', sa.UUID(), nullable=False),
        sa.Column('template_id', sa.UUID(), nullable=True),
        sa.Column('template_name', sa.String(length=150), nullable=False),
        sa.Column('filled_data', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
        sa.Column('filled_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['doctor_id'], ['doctors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['template_id'], ['note_templates.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('patient_id', 'template_id')
    )
    op.create_index('idx_patient_template_fills_patient', 'patient_template_fills', ['patient_id'], unique=False)
    op.create_index('idx_patient_template_fills_doctor', 'patient_template_fills', ['doctor_id'], unique=False)

    # 4. Create triggers for updated_at fields
    op.execute("""
        CREATE TRIGGER trg_note_templates_updated_at BEFORE UPDATE ON note_templates
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)
    op.execute("""
        CREATE TRIGGER trg_patient_template_fills_updated_at BEFORE UPDATE ON patient_template_fills
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """)


def downgrade():
    op.execute("DROP TRIGGER IF EXISTS trg_patient_template_fills_updated_at ON patient_template_fills;")
    op.execute("DROP TRIGGER IF EXISTS trg_note_templates_updated_at ON note_templates;")
    op.drop_index('idx_patient_template_fills_doctor', table_name='patient_template_fills')
    op.drop_index('idx_patient_template_fills_patient', table_name='patient_template_fills')
    op.drop_table('patient_template_fills')
    op.drop_index('idx_note_templates_doctor', table_name='note_templates')
    op.drop_table('note_templates')
    op.execute("DROP INDEX IF EXISTS idx_field_registry_name;")
    op.drop_table('template_field_registry')
