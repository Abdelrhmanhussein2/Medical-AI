"""baseline

Revision ID: 8b709742a161
Revises: 
Create Date: 2026-07-16 02:33:17.522292

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8b709742a161'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(sa.text("""
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- ENUM TYPES
    CREATE TYPE doctor_status AS ENUM ('pending', 'approved', 'rejected');
    CREATE TYPE appointment_status AS ENUM (
        'scheduled',
        'confirmed',
        'completed',
        'cancelled',
        'no_show'
    );
    CREATE TYPE notification_type AS ENUM (
        'appointment_reminder',
        'appointment_created',
        'appointment_cancelled',
        'ai_alert',
        'general'
    );

    -- ADMINS
    CREATE TABLE admins (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(150) NOT NULL,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- DEPARTMENTS
    CREATE TABLE departments (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(100) NOT NULL UNIQUE,
        email         VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- DOCTORS
    CREATE TABLE doctors (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name                   VARCHAR(150) NOT NULL,
        email                  VARCHAR(255) NOT NULL UNIQUE,
        phone                  VARCHAR(30) NOT NULL,
        password_hash          TEXT NOT NULL,
        specialization         VARCHAR(150) NOT NULL,
        department_id          UUID REFERENCES departments(id) ON DELETE SET NULL,
        certificate_url        TEXT NOT NULL,
        profile_image_url      TEXT,

        status                 doctor_status NOT NULL DEFAULT 'approved',
        approved_by            UUID REFERENCES admins(id) ON DELETE SET NULL,
        approved_at            TIMESTAMPTZ,
        rejection_reason       TEXT,

        calendar_provider      VARCHAR(50),
        calendar_access_token  TEXT,
        calendar_refresh_token TEXT,
        calendar_token_expiry  TIMESTAMPTZ,
        calendar_id            VARCHAR(255),

        is_active              BOOLEAN NOT NULL DEFAULT true,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_doctors_status ON doctors(status);
    CREATE INDEX idx_doctors_specialization ON doctors(specialization);
    CREATE INDEX idx_doctors_department ON doctors(department_id);

    -- PATIENTS
    CREATE TABLE patients (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name         VARCHAR(150) NOT NULL,
        phone        VARCHAR(30) NOT NULL,
        email        VARCHAR(255),
        national_id  VARCHAR(50),
        date_of_birth DATE,
        gender       VARCHAR(10),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_patients_phone ON patients(phone);
    CREATE INDEX idx_patients_name ON patients USING gin (to_tsvector('simple', name));

    -- DOCTOR AVAILABILITY
    CREATE TABLE doctor_availability (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time  TIME NOT NULL,
        end_time    TIME NOT NULL CHECK (end_time > start_time),
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);

    -- APPOINTMENTS
    CREATE TABLE appointments (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id          UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

        appointment_date   DATE NOT NULL,
        appointment_time   TIME NOT NULL,
        duration_minutes   INT NOT NULL DEFAULT 30,

        status             appointment_status NOT NULL DEFAULT 'scheduled',
        description        TEXT,
        patient_phone      VARCHAR(30),

        calendar_event_id  VARCHAR(255),

        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

        UNIQUE (doctor_id, appointment_date, appointment_time)
    );

    CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
    CREATE INDEX idx_appointments_patient ON appointments(patient_id);
    CREATE INDEX idx_appointments_date ON appointments(appointment_date);
    CREATE INDEX idx_appointments_status ON appointments(status);

    -- VISITS
    CREATE TABLE visits (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE SET NULL,
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

        visit_date     DATE NOT NULL DEFAULT CURRENT_DATE,
        description    TEXT,
        diagnosis      TEXT,
        notes          TEXT,

        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_visits_patient ON visits(patient_id);
    CREATE INDEX idx_visits_doctor ON visits(doctor_id);
    CREATE INDEX idx_visits_search ON visits
        USING gin (to_tsvector('simple', coalesce(description, '') || ' ' || coalesce(diagnosis, '') || ' ' || coalesce(notes, '')));

    -- CALL SESSIONS
    CREATE TABLE call_sessions (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
        doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

        recording_url  TEXT,
        transcript     TEXT,
        ai_summary     TEXT,
        doctor_notes   TEXT,

        call_duration_seconds INT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_call_sessions_doctor ON call_sessions(doctor_id);
    CREATE INDEX idx_call_sessions_appointment ON call_sessions(appointment_id);

    -- NOTIFICATIONS
    CREATE TABLE notifications (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id              UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        related_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,

        type                   notification_type NOT NULL,
        message                TEXT NOT NULL,
        is_read                BOOLEAN NOT NULL DEFAULT false,
        scheduled_for          TIMESTAMPTZ,
        sent_at                TIMESTAMPTZ,

        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX idx_notifications_doctor ON notifications(doctor_id, is_read);
    CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE sent_at IS NULL;

    -- TRIGGER: set_updated_at function and triggers
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON admins
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_doctors_updated_at BEFORE UPDATE ON doctors
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_patients_updated_at BEFORE UPDATE ON patients
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON appointments
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_visits_updated_at BEFORE UPDATE ON visits
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TRIGGER trg_call_sessions_updated_at BEFORE UPDATE ON call_sessions
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    """))


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(sa.text("""
    DROP TRIGGER IF EXISTS trg_call_sessions_updated_at ON call_sessions;
    DROP TRIGGER IF EXISTS trg_visits_updated_at ON visits;
    DROP TRIGGER IF EXISTS trg_appointments_updated_at ON appointments;
    DROP TRIGGER IF EXISTS trg_patients_updated_at ON patients;
    DROP TRIGGER IF EXISTS trg_doctors_updated_at ON doctors;
    DROP TRIGGER IF EXISTS trg_departments_updated_at ON departments;
    DROP TRIGGER IF EXISTS trg_admins_updated_at ON admins;
    DROP FUNCTION IF EXISTS set_updated_at;

    DROP TABLE IF EXISTS notifications CASCADE;
    DROP TABLE IF EXISTS call_sessions CASCADE;
    DROP TABLE IF EXISTS visits CASCADE;
    DROP TABLE IF EXISTS appointments CASCADE;
    DROP TABLE IF EXISTS doctor_availability CASCADE;
    DROP TABLE IF EXISTS patients CASCADE;
    DROP TABLE IF EXISTS doctors CASCADE;
    DROP TABLE IF EXISTS departments CASCADE;
    DROP TABLE IF EXISTS admins CASCADE;

    DROP TYPE IF EXISTS notification_type CASCADE;
    DROP TYPE IF EXISTS appointment_status CASCADE;
    DROP TYPE IF EXISTS doctor_status CASCADE;
    """))
