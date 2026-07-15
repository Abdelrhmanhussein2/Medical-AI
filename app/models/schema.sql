-- =====================================================================
-- Medical Booking System - PostgreSQL Schema
-- =====================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- =====================================================================
-- ENUM TYPES
-- =====================================================================

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

-- =====================================================================
-- ADMINS
-- =====================================================================

CREATE TABLE admins (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- DEPARTMENTS
-- =====================================================================

CREATE TABLE departments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(100) NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- DOCTORS
-- =====================================================================

CREATE TABLE doctors (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                   VARCHAR(150) NOT NULL,
    email                  VARCHAR(255) NOT NULL UNIQUE,
    phone                  VARCHAR(30) NOT NULL,
    password_hash          TEXT NOT NULL,
    specialization         VARCHAR(150) NOT NULL,   -- تخصص الطبيب أصبح إلزامي
    department_id          UUID REFERENCES departments(id) ON DELETE SET NULL, -- الإدارة التابع لها
    certificate_url        TEXT NOT NULL,          -- مستند إثبات كونه دكتور (إلزامي)
    profile_image_url      TEXT,                    -- اختياري

    status                 doctor_status NOT NULL DEFAULT 'approved',
    approved_by            UUID REFERENCES admins(id) ON DELETE SET NULL,
    approved_at            TIMESTAMPTZ,
    rejection_reason       TEXT,

    -- Calendar API integration (Google Calendar / Outlook ... etc.)
    calendar_provider      VARCHAR(50),             -- 'google' | 'outlook' ...
    calendar_access_token  TEXT,
    calendar_refresh_token TEXT,
    calendar_token_expiry  TIMESTAMPTZ,
    calendar_id            VARCHAR(255),             -- id بتاع الكالندر المرتبط

    is_active              BOOLEAN NOT NULL DEFAULT true,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_doctors_status ON doctors(status);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_department ON doctors(department_id);

-- =====================================================================
-- PATIENTS
-- =====================================================================

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

-- =====================================================================
-- DOCTOR AVAILABILITY (الأوقات المتاحة قبل الحجز)
-- =====================================================================

CREATE TABLE doctor_availability (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id   UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time  TIME NOT NULL,
    end_time    TIME NOT NULL CHECK (end_time > start_time),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_availability_doctor ON doctor_availability(doctor_id);

-- =====================================================================
-- APPOINTMENTS
-- =====================================================================

CREATE TABLE appointments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id          UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    appointment_date   DATE NOT NULL,
    appointment_time   TIME NOT NULL,
    duration_minutes   INT NOT NULL DEFAULT 30,

    status             appointment_status NOT NULL DEFAULT 'scheduled',
    description        TEXT,               -- وصف الحالة اللي بيدخله الدكتور/الاستقبال
    patient_phone      VARCHAR(30),        -- نسخة سريعة من رقم المريض وقت الحجز

    calendar_event_id  VARCHAR(255),       -- ID الحدث في الـ Calendar API الخارجي

    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (doctor_id, appointment_date, appointment_time)
);

CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);

-- =====================================================================
-- VISITS (سجل الزيارات الفعلي بتاع كل مريض - قابل للبحث)
-- =====================================================================

CREATE TABLE visits (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

    visit_date     DATE NOT NULL DEFAULT CURRENT_DATE,
    description    TEXT,     -- وصف الحالة
    diagnosis      TEXT,
    notes          TEXT,

    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_visits_patient ON visits(patient_id);
CREATE INDEX idx_visits_doctor ON visits(doctor_id);
-- فهرس بحث نصي كامل على وصف الزيارة والتشخيص عشان تقدر تسرش بسهولة
CREATE INDEX idx_visits_search ON visits
    USING gin (to_tsvector('simple', coalesce(description, '') || ' ' || coalesce(diagnosis, '') || ' ' || coalesce(notes, '')));

-- =====================================================================
-- CALL SESSIONS (تسجيل الـ AI للمكالمة + التلخيص)
-- =====================================================================

CREATE TABLE call_sessions (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    doctor_id      UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,

    recording_url  TEXT,
    transcript     TEXT,        -- النص الكامل اللي سمعه الـ AI
    ai_summary     TEXT,        -- التلخيص الأصلي من الـ AI (بيفضل زي ما هو كمرجع)
    doctor_notes   TEXT,        -- نسخة التعديل بتاعة الدكتور على التلخيص

    call_duration_seconds INT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_sessions_doctor ON call_sessions(doctor_id);
CREATE INDEX idx_call_sessions_appointment ON call_sessions(appointment_id);

-- =====================================================================
-- NOTIFICATIONS
-- =====================================================================

CREATE TABLE notifications (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id              UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    related_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,

    type                   notification_type NOT NULL,
    message                TEXT NOT NULL,
    is_read                BOOLEAN NOT NULL DEFAULT false,
    scheduled_for          TIMESTAMPTZ,     -- وقت إرسال التنبيه (مثلاً قبل المعاد بساعة)
    sent_at                TIMESTAMPTZ,

    created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_doctor ON notifications(doctor_id, is_read);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE sent_at IS NULL;

-- =====================================================================
-- TRIGGER: تحديث updated_at تلقائيًا
-- =====================================================================

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

CREATE TRIGGER trg_department_admins_updated_at BEFORE UPDATE ON department_admins
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

-- =====================================================================
-- SUBSCRIPTION BUNDLES (الباقات)
-- =====================================================================
CREATE TYPE bundle_target AS ENUM ('department', 'doctor');

CREATE TABLE subscription_bundles (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          VARCHAR(150) NOT NULL,
    target_type   bundle_target NOT NULL, -- هل هي للإدارات ولا للدكاترة المستقلين
    max_doctors   INT,                    -- عدد الدكاترة المسموح (للإدارات), NULL لو للدكتور المستقل
    duration_days INT NOT NULL,           -- مدة الباقة بالأيام
    price         NUMERIC(10, 2) NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- SUBSCRIPTIONS (الاشتراكات الفعلية)
-- =====================================================================
CREATE TYPE subscription_status AS ENUM ('active', 'expired', 'cancelled');

CREATE TABLE subscriptions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE, -- لو الاشتراك تبع إدارة
    doctor_id     UUID REFERENCES doctors(id) ON DELETE CASCADE,     -- لو الاشتراك تبع دكتور مستقل
    bundle_id     UUID NOT NULL REFERENCES subscription_bundles(id),
    
    start_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date      TIMESTAMPTZ NOT NULL,
    status        subscription_status NOT NULL DEFAULT 'active',
    
    total_seats   INT, -- يتنسخ من الباقة وقت الاشتراك (عشان لو الباقة اتغيرت بعدين)
    
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- لازم الاشتراك يكون مربوط بإدارة أو دكتور مش الاتنين مع بعض
    CONSTRAINT chk_subscription_owner CHECK (
        (department_id IS NOT NULL AND doctor_id IS NULL) OR
        (department_id IS NULL AND doctor_id IS NOT NULL)
    )
);

CREATE INDEX idx_subscriptions_department ON subscriptions(department_id);
CREATE INDEX idx_subscriptions_doctor ON subscriptions(doctor_id);

-- =====================================================================
-- SUBSCRIPTION DOCTORS (الدكاترة المفعلين جوه اشتراك الإدارة)
-- =====================================================================
CREATE TABLE subscription_doctors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- لضمان إن الدكتور مايتضافش لنفس الاشتراك مرتين
    UNIQUE(subscription_id, doctor_id)
);

CREATE INDEX idx_subscription_doctors_sub ON subscription_doctors(subscription_id);
CREATE INDEX idx_subscription_doctors_doc ON subscription_doctors(doctor_id);

CREATE TRIGGER trg_subscription_bundles_updated_at BEFORE UPDATE ON subscription_bundles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
