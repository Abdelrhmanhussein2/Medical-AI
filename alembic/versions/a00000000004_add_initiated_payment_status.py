"""add initiated status to payment_status enum

Revision ID: a00000000004
Revises: a00000000003
Create Date: 2026-08-19 15:30:00.000000

Adds 'initiated' value to the payment_status ENUM.
This represents the state after Moyasar payment creation (POST /payments)
but before 3DS authentication is complete. The 3DS flow requires this
intermediate state because the customer is redirected to the bank's page.

State machine:
  pending → initiated → paid
                      ↘ failed
"""
from alembic import op


revision = 'a00000000004'
down_revision = 'a00000000003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ADD VALUE IF NOT EXISTS is idempotent and safe to run multiple times.
    # Note: cannot be run inside a transaction in some Postgres versions,
    # but Alembic handles this correctly.
    op.execute("ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'initiated';")


def downgrade() -> None:
    # Postgres does not support removing ENUM values natively.
    # To downgrade, you would need to recreate the type without 'initiated'.
    # For safety, we do a no-op downgrade — 'initiated' stays but is unused.
    pass
