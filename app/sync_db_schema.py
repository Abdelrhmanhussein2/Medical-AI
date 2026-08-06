import asyncio
import asyncpg
import sys
from app.core.config import settings

SQL_STATEMENTS = [
    # Types
    """DO $$ BEGIN
        CREATE TYPE doctor_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    
    """DO $$ BEGIN
        CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    
    """DO $$ BEGIN
        CREATE TYPE notification_type AS ENUM ('appointment_reminder', 'appointment_created', 'appointment_cancelled', 'ai_alert', 'general');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    
    """DO $$ BEGIN
        CREATE TYPE bundle_target AS ENUM ('department', 'doctor');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    
    """DO $$ BEGIN
        CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    
    # Admins
    """CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    "ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(30);",
    
    # Departments
    """CREATE TABLE IF NOT EXISTS departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    "ALTER TABLE departments ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;",
    
    # Department Admins
    """CREATE TABLE IF NOT EXISTS department_admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Doctors
    """CREATE TABLE IF NOT EXISTS doctors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(30) NOT NULL,
        password_hash TEXT NOT NULL,
        specialization VARCHAR(150) NOT NULL,
        department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
        certificate_url TEXT,
        profile_image_url TEXT,
        status doctor_status NOT NULL DEFAULT 'approved',
        approved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
        approved_at TIMESTAMPTZ,
        rejection_reason TEXT,
        calendar_provider VARCHAR(50),
        calendar_access_token TEXT,
        calendar_refresh_token TEXT,
        calendar_token_expiry TIMESTAMPTZ,
        calendar_id VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS custom_minutes_limit INTEGER;",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS custom_tokens_limit INTEGER;",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100);",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS subscription_activated_at TIMESTAMPTZ;",
    
    # Doctor Sessions
    """CREATE TABLE IF NOT EXISTS doctor_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        token_expiry TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    "ALTER TABLE doctor_sessions ADD COLUMN IF NOT EXISTS input_tokens INTEGER;",
    "ALTER TABLE doctor_sessions ADD COLUMN IF NOT EXISTS output_tokens INTEGER;",
    
    # Patients
    """CREATE TABLE IF NOT EXISTS patients (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        email VARCHAR(255),
        national_id VARCHAR(50),
        date_of_birth DATE,
        gender VARCHAR(10),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL;",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS file_id VARCHAR(100);",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS diseases TEXT;",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS habits TEXT;",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS general_summary TEXT;",
    
    # Availability
    """CREATE TABLE IF NOT EXISTS doctor_availability (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time  TIME NOT NULL,
        end_time    TIME NOT NULL CHECK (end_time > start_time),
        is_active   BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Appointments
    """CREATE TABLE IF NOT EXISTS appointments (
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
    );""",
    
    # Visits
    """CREATE TABLE IF NOT EXISTS visits (
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
    );""",
    
    # Call Sessions
    """CREATE TABLE IF NOT EXISTS call_sessions (
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
    );""",
    
    # Notifications
    """CREATE TABLE IF NOT EXISTS notifications (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id              UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        related_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
        type                   notification_type NOT NULL,
        message                TEXT NOT NULL,
        is_read                BOOLEAN NOT NULL DEFAULT false,
        scheduled_for          TIMESTAMPTZ,
        sent_at                TIMESTAMPTZ,
        created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Subscription Bundles
    """CREATE TABLE IF NOT EXISTS subscription_bundles (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name          VARCHAR(150) NOT NULL,
        target_type   bundle_target NOT NULL,
        max_doctors   INT,
        duration_days INT NOT NULL,
        price         NUMERIC(10, 2) NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT true,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    "ALTER TABLE subscription_bundles ADD COLUMN IF NOT EXISTS allowed_minutes INTEGER DEFAULT 60;",
    "ALTER TABLE subscription_bundles ADD COLUMN IF NOT EXISTS allowed_messages INTEGER;",
    "ALTER TABLE subscription_bundles ADD COLUMN IF NOT EXISTS name_ar VARCHAR(150);",
    
    # Subscriptions
    """CREATE TABLE IF NOT EXISTS subscriptions (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
        doctor_id     UUID REFERENCES doctors(id) ON DELETE CASCADE,
        bundle_id     UUID NOT NULL REFERENCES subscription_bundles(id),
        start_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
        end_date      TIMESTAMPTZ NOT NULL,
        status        subscription_status NOT NULL DEFAULT 'active',
        total_seats   INT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_subscription_owner CHECK (
            (department_id IS NOT NULL AND doctor_id IS NULL) OR
            (department_id IS NULL AND doctor_id IS NOT NULL)
        )
    );""",
    
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS allowed_minutes INTEGER;",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS allowed_messages INTEGER;",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS rolled_over_minutes INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS rolled_over_messages INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS used_minutes INTEGER NOT NULL DEFAULT 0;",
    "ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS used_messages INTEGER NOT NULL DEFAULT 0;",
    
    # Subscription Doctors
    """CREATE TABLE IF NOT EXISTS subscription_doctors (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
        doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(subscription_id, doctor_id)
    );""",
    
    # Chat Threads
    """CREATE TABLE IF NOT EXISTS chat_threads (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_type          VARCHAR(10) NOT NULL CHECK (owner_type IN ('doctor', 'admin')),
        owner_id            UUID NOT NULL,
        title               VARCHAR(255) NOT NULL,
        dept                VARCHAR(100),
        is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
        message_count       INTEGER NOT NULL DEFAULT 0,
        ai_context_summary  TEXT,
        summary_updated_at  TIMESTAMPTZ,
        created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT chk_thread_owner_type CHECK (owner_type IN ('doctor', 'admin'))
    );""",
    
    "ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;",
    
    # Chat Messages
    """CREATE TABLE IF NOT EXISTS chat_messages (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id      UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
        sender_type    VARCHAR(5) NOT NULL CHECK (sender_type IN ('user', 'ai')),
        content        BYTEA NOT NULL,
        bento_data     JSONB,
        insight_data   JSONB,
        actions_data   TEXT[],
        is_audio       BOOLEAN NOT NULL DEFAULT FALSE,
        audio_duration VARCHAR(10),
        audio_file_path TEXT,
        created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Token Usage Logs
    """CREATE TABLE IF NOT EXISTS token_usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
        service_type VARCHAR(50),
        model_name VARCHAR(100),
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        total_tokens INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Pricing Config
    """CREATE TABLE IF NOT EXISTS pricing_config (
        id                          serial          PRIMARY KEY,
        voice_cost_per_minute       numeric(10,6)   NOT NULL DEFAULT 0.007,
        llm_input_price_per_million numeric(10,4)   NOT NULL DEFAULT 0.15,
        llm_output_price_per_million numeric(10,4)  NOT NULL DEFAULT 0.60,
        avg_tokens_per_message      int             NOT NULL DEFAULT 6000,
        input_token_ratio           numeric(3,2)    NOT NULL DEFAULT 0.70,
        output_token_ratio          numeric(3,2)    NOT NULL DEFAULT 0.30,
        updated_at                  timestamptz     NOT NULL DEFAULT now()
    );""",
    
    # Pricing Config Unique Index
    """DO $$ BEGIN
        CREATE UNIQUE INDEX pricing_config_singleton ON pricing_config ((id = 1)) WHERE id = 1;
    EXCEPTION WHEN others THEN NULL; END $$;""",
    
    "INSERT INTO pricing_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;",
    
    # Subscription Plans Catalog
    """CREATE TABLE IF NOT EXISTS subscription_plans (
        id                      serial          PRIMARY KEY,
        plan_code               text            UNIQUE NOT NULL,
        target_type             text            NOT NULL CHECK (target_type IN ('doctor', 'organization')),
        price_usd               numeric(10,2)   NOT NULL,
        voice_minutes_included  int             NOT NULL,
        message_budget_usd      numeric(10,2)   NOT NULL,
        doctors_included        int,
        price_per_extra_doctor  numeric(10,2),
        created_at              timestamptz     NOT NULL DEFAULT now(),
        updated_at              timestamptz     NOT NULL DEFAULT now()
    );""",
    
    # Functions
    """CREATE OR REPLACE FUNCTION calculate_messages_included(p_plan_id int)
    RETURNS int AS $$
    DECLARE
        v_message_budget numeric;
        v_message_cost   numeric;
        v_cfg            pricing_config%ROWTYPE;
    BEGIN
        SELECT * INTO v_cfg FROM pricing_config LIMIT 1;
        SELECT message_budget_usd INTO v_message_budget FROM subscription_plans WHERE id = p_plan_id;
        v_message_cost := v_cfg.avg_tokens_per_message *
            (v_cfg.input_token_ratio  * v_cfg.llm_input_price_per_million  / 1000000
           + v_cfg.output_token_ratio * v_cfg.llm_output_price_per_million / 1000000);
        RETURN floor(v_message_budget / v_message_cost);
    END;
    $$ LANGUAGE plpgsql;""",
    
    # Views
    """CREATE OR REPLACE VIEW plans_with_message_limits AS
    SELECT
        sp.id,
        sp.plan_code,
        sp.target_type,
        sp.price_usd,
        sp.voice_minutes_included,
        sp.message_budget_usd,
        sp.doctors_included,
        sp.price_per_extra_doctor,
        calculate_messages_included(sp.id) AS messages_included,
        sp.created_at,
        sp.updated_at
    FROM subscription_plans sp;""",
    
    # Reminders Log
    """CREATE TABLE IF NOT EXISTS appointment_reminders_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
        reminder_type VARCHAR(5) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'sent',
        sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (appointment_id, reminder_type)
    );""",
    
    # Template registry
    """CREATE TABLE IF NOT EXISTS template_field_registry (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        field_name VARCHAR(150) NOT NULL UNIQUE,
        usage_count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Note templates
    """CREATE TABLE IF NOT EXISTS note_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        fields JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (doctor_id, name)
    );""",
    
    # Patient template fills
    """CREATE TABLE IF NOT EXISTS patient_template_fills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        template_id UUID REFERENCES note_templates(id) ON DELETE SET NULL,
        template_name VARCHAR(150) NOT NULL,
        filled_data JSONB NOT NULL DEFAULT '{}',
        filled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (patient_id, template_id)
    );""",
    
    # Sessions
    """CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
        doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        transcript_raw TEXT,
        summary_text TEXT,
        soap_note TEXT,
        patient_summary TEXT,
        prescriptions TEXT,
        tasks TEXT,
        duration_seconds INTEGER,
        status VARCHAR(20) DEFAULT 'in_progress',
        ai_model_used VARCHAR(50),
        ai_tokens_used INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ai_prompt_tokens INTEGER,
        ai_completion_tokens INTEGER
    );""",
    
    # WhatsApp Message Log
    """CREATE TABLE IF NOT EXISTS whatsapp_message_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
        visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
        msg_type VARCHAR(30) NOT NULL,
        phone VARCHAR(30) NOT NULL,
        content TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'sent',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );""",
    
    # Triggers
    """CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;""",
    
    """DO $$ BEGIN
        CREATE TRIGGER trg_note_templates_updated_at BEFORE UPDATE ON note_templates
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;""",
    
    """DO $$ BEGIN
        CREATE TRIGGER trg_patient_template_fills_updated_at BEFORE UPDATE ON patient_template_fills
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;"""
]

async def sync_db():
    print("Database sync script starting...")
    try:
        conn = await asyncpg.connect(settings.DATABASE_URL)
        print("Connected to database. Checking columns and tables...")
        for i, statement in enumerate(SQL_STATEMENTS):
            try:
                await conn.execute(statement)
            except Exception as e:
                print(f"Statement {i+1} failed: {e}")
        await conn.close()
        print("Database schema sync completed successfully.")
    except Exception as e:
        print(f"Error during schema sync: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(sync_db())
