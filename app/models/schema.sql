--
-- PostgreSQL database dump
--

\restrict 3L4nhzvB6H8cLkXMdZccBxWKePhZgtV5ABxbDtJMmpedzD3yKn8h92EhfyzP308

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS public;



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: medical_user
--

CREATE TYPE public.appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'no_show'
);



--
-- Name: bundle_target; Type: TYPE; Schema: public; Owner: medical_user
--

CREATE TYPE public.bundle_target AS ENUM (
    'department',
    'doctor'
);



--
-- Name: doctor_status; Type: TYPE; Schema: public; Owner: medical_user
--

CREATE TYPE public.doctor_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);



--
-- Name: notification_type; Type: TYPE; Schema: public; Owner: medical_user
--

CREATE TYPE public.notification_type AS ENUM (
    'appointment_reminder',
    'appointment_created',
    'appointment_cancelled',
    'ai_alert',
    'general'
);



--
-- Name: session_status; Type: TYPE; Schema: public; Owner: medical_user
--

CREATE TYPE public.session_status AS ENUM (
    'in_progress',
    'completed',
    'summarized',
    'failed'
);



--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: medical_user
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'expired',
    'cancelled'
);



--
-- Name: calculate_messages_included(integer); Type: FUNCTION; Schema: public; Owner: medical_user
--

CREATE FUNCTION public.calculate_messages_included(p_plan_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
    DECLARE
        v_message_budget numeric;
        v_message_cost   numeric;
        v_cfg            pricing_config%ROWTYPE;
    BEGIN
        SELECT * INTO v_cfg FROM pricing_config LIMIT 1;

        SELECT message_budget_usd
          INTO v_message_budget
          FROM subscription_plans
         WHERE id = p_plan_id;

        -- Cost per single AI exchange (input + output tokens)
        v_message_cost := v_cfg.avg_tokens_per_message *
            (v_cfg.input_token_ratio  * v_cfg.llm_input_price_per_million  / 1000000
           + v_cfg.output_token_ratio * v_cfg.llm_output_price_per_million / 1000000);

        RETURN floor(v_message_budget / v_message_cost);
    END;
    $$;



--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: medical_user
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;



--
-- Name: trg_fn_pricing_config_updated_at(); Type: FUNCTION; Schema: public; Owner: medical_user
--

CREATE FUNCTION public.trg_fn_pricing_config_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$;



--
-- Name: trg_fn_subscription_plans_updated_at(); Type: FUNCTION; Schema: public; Owner: medical_user
--

CREATE FUNCTION public.trg_fn_subscription_plans_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        NEW.updated_at = now();
        RETURN NEW;
    END;
    $$;



SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    phone character varying(30)
);



--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);



--
-- Name: appointment_reminders_log; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.appointment_reminders_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    reminder_type character varying(5) NOT NULL,
    phone character varying(30) NOT NULL,
    status character varying(10) DEFAULT 'sent'::character varying NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: appointments; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    appointment_date date NOT NULL,
    appointment_time time without time zone NOT NULL,
    duration_minutes integer DEFAULT 30 NOT NULL,
    status public.appointment_status DEFAULT 'scheduled'::public.appointment_status NOT NULL,
    description text,
    patient_phone character varying(30),
    calendar_event_id character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: call_sessions; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.call_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid,
    doctor_id uuid NOT NULL,
    patient_id uuid NOT NULL,
    recording_url text,
    transcript text,
    ai_summary text,
    doctor_notes text,
    call_duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    sender_type character varying(5) NOT NULL,
    content bytea NOT NULL,
    bento_data json,
    insight_data json,
    actions_data text[],
    is_audio boolean DEFAULT false NOT NULL,
    audio_duration character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    audio_file_path text,
    audio_data bytea,
    CONSTRAINT chk_msg_sender_type CHECK (((sender_type)::text = ANY ((ARRAY['user'::character varying, 'ai'::character varying])::text[])))
);



--
-- Name: chat_threads; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.chat_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_type character varying(10) NOT NULL,
    owner_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    dept character varying(100),
    is_pinned boolean DEFAULT false NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    ai_context_summary text,
    summary_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    patient_id uuid,
    CONSTRAINT chk_thread_owner_type CHECK (((owner_type)::text = ANY ((ARRAY['doctor'::character varying, 'admin'::character varying])::text[])))
);



--
-- Name: departments; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.departments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);



--
-- Name: doctor_availability; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.doctor_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT doctor_availability_check CHECK ((end_time > start_time)),
    CONSTRAINT doctor_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);



--
-- Name: doctors; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(30) NOT NULL,
    password_hash text NOT NULL,
    specialization character varying(150) NOT NULL,
    department_id uuid,
    certificate_url text,
    profile_image_url text,
    status public.doctor_status DEFAULT 'approved'::public.doctor_status NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    rejection_reason text,
    calendar_provider character varying(50),
    calendar_access_token text,
    calendar_refresh_token text,
    calendar_token_expiry timestamp with time zone,
    calendar_id character varying(255),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_plan character varying(100),
    subscription_expiry date,
    subscription_activated_at timestamp with time zone,
    custom_minutes_limit integer,
    custom_tokens_limit integer,
    must_change_password boolean DEFAULT false NOT NULL
);



--
-- Name: note_templates; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.note_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    fields jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: notifications; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    related_appointment_id uuid,
    type public.notification_type NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    scheduled_for timestamp with time zone,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: patient_template_fills; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.patient_template_fills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    template_id uuid,
    template_name character varying(150) NOT NULL,
    filled_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    filled_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: patients; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.patients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    phone character varying(30) NOT NULL,
    email character varying(255),
    national_id character varying(50),
    date_of_birth date,
    gender character varying(10),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    doctor_id uuid,
    file_id character varying(100),
    diseases text,
    habits text,
    general_summary text
);



--
-- Name: subscription_plans; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.subscription_plans (
    id integer NOT NULL,
    plan_code text NOT NULL,
    target_type text NOT NULL,
    price_usd numeric(10,2) NOT NULL,
    voice_minutes_included integer NOT NULL,
    message_budget_usd numeric(10,2) NOT NULL,
    doctors_included integer,
    price_per_extra_doctor numeric(10,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscription_plans_target_type_check CHECK ((target_type = ANY (ARRAY['doctor'::text, 'organization'::text])))
);



--
-- Name: plans_with_message_limits; Type: VIEW; Schema: public; Owner: medical_user
--

CREATE VIEW public.plans_with_message_limits AS
 SELECT id,
    plan_code,
    target_type,
    price_usd,
    voice_minutes_included,
    message_budget_usd,
    doctors_included,
    price_per_extra_doctor,
    public.calculate_messages_included(id) AS messages_included,
    created_at,
    updated_at
   FROM public.subscription_plans sp;



--
-- Name: pricing_config; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.pricing_config (
    id integer NOT NULL,
    voice_cost_per_minute numeric(10,6) DEFAULT 0.007 NOT NULL,
    llm_input_price_per_million numeric(10,4) DEFAULT 0.15 NOT NULL,
    llm_output_price_per_million numeric(10,4) DEFAULT 0.60 NOT NULL,
    avg_tokens_per_message integer DEFAULT 6000 NOT NULL,
    input_token_ratio numeric(3,2) DEFAULT 0.70 NOT NULL,
    output_token_ratio numeric(3,2) DEFAULT 0.30 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: pricing_config_id_seq; Type: SEQUENCE; Schema: public; Owner: medical_user
--

CREATE SEQUENCE public.pricing_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: pricing_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medical_user
--

ALTER SEQUENCE public.pricing_config_id_seq OWNED BY public.pricing_config.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid,
    doctor_id uuid NOT NULL,
    patient_id uuid,
    transcript_raw text,
    summary_text text,
    soap_note jsonb,
    patient_summary text,
    prescriptions jsonb,
    tasks jsonb,
    duration_seconds integer DEFAULT 0,
    status public.session_status DEFAULT 'in_progress'::public.session_status NOT NULL,
    ai_model_used character varying(100),
    ai_tokens_used integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ai_prompt_tokens integer,
    ai_completion_tokens integer
);



--
-- Name: subscription_bundles; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.subscription_bundles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    target_type public.bundle_target NOT NULL,
    max_doctors integer,
    duration_days integer NOT NULL,
    price numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name_ar character varying(150),
    allowed_minutes integer DEFAULT 60 NOT NULL,
    allowed_messages integer
);



--
-- Name: subscription_doctors; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.subscription_doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    subscription_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: subscription_plans_id_seq; Type: SEQUENCE; Schema: public; Owner: medical_user
--

CREATE SEQUENCE public.subscription_plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;



--
-- Name: subscription_plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: medical_user
--

ALTER SEQUENCE public.subscription_plans_id_seq OWNED BY public.subscription_plans.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    department_id uuid,
    doctor_id uuid,
    bundle_id uuid NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone NOT NULL,
    status public.subscription_status DEFAULT 'active'::public.subscription_status NOT NULL,
    total_seats integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    allowed_minutes integer,
    allowed_messages integer,
    CONSTRAINT chk_subscription_owner CHECK ((((department_id IS NOT NULL) AND (doctor_id IS NULL)) OR ((department_id IS NULL) AND (doctor_id IS NOT NULL))))
);



--
-- Name: template_field_registry; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.template_field_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_name character varying(150) NOT NULL,
    usage_count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: token_usage_logs; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.token_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    doctor_id uuid NOT NULL,
    service_type character varying(50) NOT NULL,
    model_name character varying(100) NOT NULL,
    prompt_tokens integer DEFAULT 0 NOT NULL,
    completion_tokens integer DEFAULT 0 NOT NULL,
    total_tokens integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: visits; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid NOT NULL,
    doctor_id uuid NOT NULL,
    appointment_id uuid,
    visit_date date DEFAULT CURRENT_DATE NOT NULL,
    description text,
    diagnosis text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: whatsapp_message_log; Type: TABLE; Schema: public; Owner: medical_user
--

CREATE TABLE public.whatsapp_message_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    patient_id uuid,
    doctor_id uuid,
    visit_id uuid,
    msg_type character varying(30) NOT NULL,
    phone character varying(30) NOT NULL,
    content text NOT NULL,
    status character varying(20) DEFAULT 'sent'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: pricing_config id; Type: DEFAULT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.pricing_config ALTER COLUMN id SET DEFAULT nextval('public.pricing_config_id_seq'::regclass);


--
-- Name: subscription_plans id; Type: DEFAULT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_plans ALTER COLUMN id SET DEFAULT nextval('public.subscription_plans_id_seq'::regclass);


--
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: appointment_reminders_log appointment_reminders_log_appointment_id_reminder_type_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointment_reminders_log
    ADD CONSTRAINT appointment_reminders_log_appointment_id_reminder_type_key UNIQUE (appointment_id, reminder_type);


--
-- Name: appointment_reminders_log appointment_reminders_log_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointment_reminders_log
    ADD CONSTRAINT appointment_reminders_log_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_doctor_id_appointment_date_appointment_time_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_appointment_date_appointment_time_key UNIQUE (doctor_id, appointment_date, appointment_time);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: call_sessions call_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT call_sessions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_threads chat_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_pkey PRIMARY KEY (id);


--
-- Name: departments departments_email_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_email_key UNIQUE (email);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: doctor_availability doctor_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.doctor_availability
    ADD CONSTRAINT doctor_availability_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_email_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_email_key UNIQUE (email);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: note_templates note_templates_doctor_id_name_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.note_templates
    ADD CONSTRAINT note_templates_doctor_id_name_key UNIQUE (doctor_id, name);


--
-- Name: note_templates note_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.note_templates
    ADD CONSTRAINT note_templates_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: patient_template_fills patient_template_fills_patient_id_template_id_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patient_template_fills
    ADD CONSTRAINT patient_template_fills_patient_id_template_id_key UNIQUE (patient_id, template_id);


--
-- Name: patient_template_fills patient_template_fills_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patient_template_fills
    ADD CONSTRAINT patient_template_fills_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- Name: pricing_config pricing_config_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.pricing_config
    ADD CONSTRAINT pricing_config_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subscription_bundles subscription_bundles_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_bundles
    ADD CONSTRAINT subscription_bundles_pkey PRIMARY KEY (id);


--
-- Name: subscription_doctors subscription_doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_doctors
    ADD CONSTRAINT subscription_doctors_pkey PRIMARY KEY (id);


--
-- Name: subscription_doctors subscription_doctors_subscription_id_doctor_id_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_doctors
    ADD CONSTRAINT subscription_doctors_subscription_id_doctor_id_key UNIQUE (subscription_id, doctor_id);


--
-- Name: subscription_plans subscription_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_pkey PRIMARY KEY (id);


--
-- Name: subscription_plans subscription_plans_plan_code_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_plan_code_key UNIQUE (plan_code);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: template_field_registry template_field_registry_field_name_key; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.template_field_registry
    ADD CONSTRAINT template_field_registry_field_name_key UNIQUE (field_name);


--
-- Name: template_field_registry template_field_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.template_field_registry
    ADD CONSTRAINT template_field_registry_pkey PRIMARY KEY (id);


--
-- Name: token_usage_logs token_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.token_usage_logs
    ADD CONSTRAINT token_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: visits visits_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_log whatsapp_message_log_pkey; Type: CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.whatsapp_message_log
    ADD CONSTRAINT whatsapp_message_log_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_appointments_date ON public.appointments USING btree (appointment_date);


--
-- Name: idx_appointments_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_appointments_doctor ON public.appointments USING btree (doctor_id);


--
-- Name: idx_appointments_patient; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_appointments_patient ON public.appointments USING btree (patient_id);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_appt_reminder_log_appt; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_appt_reminder_log_appt ON public.appointment_reminders_log USING btree (appointment_id);


--
-- Name: idx_availability_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_availability_doctor ON public.doctor_availability USING btree (doctor_id);


--
-- Name: idx_call_sessions_appointment; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_call_sessions_appointment ON public.call_sessions USING btree (appointment_id);


--
-- Name: idx_call_sessions_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_call_sessions_doctor ON public.call_sessions USING btree (doctor_id);


--
-- Name: idx_chat_messages_thread; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_chat_messages_thread ON public.chat_messages USING btree (thread_id, created_at);


--
-- Name: idx_chat_threads_owner; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_chat_threads_owner ON public.chat_threads USING btree (owner_type, owner_id);


--
-- Name: idx_doctors_department; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_doctors_department ON public.doctors USING btree (department_id);


--
-- Name: idx_doctors_specialization; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_doctors_specialization ON public.doctors USING btree (specialization);


--
-- Name: idx_doctors_status; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_doctors_status ON public.doctors USING btree (status);


--
-- Name: idx_field_registry_name; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_field_registry_name ON public.template_field_registry USING gin (to_tsvector('simple'::regconfig, (field_name)::text));


--
-- Name: idx_note_templates_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_note_templates_doctor ON public.note_templates USING btree (doctor_id);


--
-- Name: idx_notifications_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_notifications_doctor ON public.notifications USING btree (doctor_id, is_read);


--
-- Name: idx_notifications_scheduled; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_notifications_scheduled ON public.notifications USING btree (scheduled_for) WHERE (sent_at IS NULL);


--
-- Name: idx_patient_template_fills_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_patient_template_fills_doctor ON public.patient_template_fills USING btree (doctor_id);


--
-- Name: idx_patient_template_fills_patient; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_patient_template_fills_patient ON public.patient_template_fills USING btree (patient_id);


--
-- Name: idx_patients_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_patients_doctor ON public.patients USING btree (doctor_id);


--
-- Name: idx_patients_name; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_patients_name ON public.patients USING gin (to_tsvector('simple'::regconfig, (name)::text));


--
-- Name: idx_patients_phone; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_patients_phone ON public.patients USING btree (phone);


--
-- Name: idx_sessions_appointment; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_sessions_appointment ON public.sessions USING btree (appointment_id);


--
-- Name: idx_sessions_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_sessions_doctor ON public.sessions USING btree (doctor_id);


--
-- Name: idx_sessions_patient; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_sessions_patient ON public.sessions USING btree (patient_id);


--
-- Name: idx_subscription_doctors_doc; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_subscription_doctors_doc ON public.subscription_doctors USING btree (doctor_id);


--
-- Name: idx_subscription_doctors_sub; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_subscription_doctors_sub ON public.subscription_doctors USING btree (subscription_id);


--
-- Name: idx_subscriptions_department; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_subscriptions_department ON public.subscriptions USING btree (department_id);


--
-- Name: idx_subscriptions_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_subscriptions_doctor ON public.subscriptions USING btree (doctor_id);


--
-- Name: idx_token_usage_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_token_usage_doctor ON public.token_usage_logs USING btree (doctor_id, created_at);


--
-- Name: idx_visits_doctor; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_visits_doctor ON public.visits USING btree (doctor_id);


--
-- Name: idx_visits_patient; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_visits_patient ON public.visits USING btree (patient_id);


--
-- Name: idx_visits_search; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_visits_search ON public.visits USING gin (to_tsvector('simple'::regconfig, ((((COALESCE(description, ''::text) || ' '::text) || COALESCE(diagnosis, ''::text)) || ' '::text) || COALESCE(notes, ''::text))));


--
-- Name: idx_wa_log_patient; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_wa_log_patient ON public.whatsapp_message_log USING btree (patient_id, msg_type, created_at);


--
-- Name: idx_wa_log_visit; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE INDEX idx_wa_log_visit ON public.whatsapp_message_log USING btree (visit_id, msg_type);


--
-- Name: pricing_config_singleton; Type: INDEX; Schema: public; Owner: medical_user
--

CREATE UNIQUE INDEX pricing_config_singleton ON public.pricing_config USING btree (((id = 1))) WHERE (id = 1);


--
-- Name: admins trg_admins_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: departments trg_departments_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: note_templates trg_note_templates_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_note_templates_updated_at BEFORE UPDATE ON public.note_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: patient_template_fills trg_patient_template_fills_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_patient_template_fills_updated_at BEFORE UPDATE ON public.patient_template_fills FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: pricing_config trg_pricing_config_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_pricing_config_updated_at BEFORE UPDATE ON public.pricing_config FOR EACH ROW EXECUTE FUNCTION public.trg_fn_pricing_config_updated_at();


--
-- Name: sessions trg_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscription_bundles trg_subscription_bundles_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_subscription_bundles_updated_at BEFORE UPDATE ON public.subscription_bundles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscription_plans trg_subscription_plans_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_subscription_plans_updated_at BEFORE UPDATE ON public.subscription_plans FOR EACH ROW EXECUTE FUNCTION public.trg_fn_subscription_plans_updated_at();


--
-- Name: subscriptions trg_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: medical_user
--

CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: appointment_reminders_log appointment_reminders_log_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointment_reminders_log
    ADD CONSTRAINT appointment_reminders_log_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: call_sessions call_sessions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT call_sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: call_sessions call_sessions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT call_sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: call_sessions call_sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.call_sessions
    ADD CONSTRAINT call_sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.chat_threads(id) ON DELETE CASCADE;


--
-- Name: chat_threads chat_threads_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.chat_threads
    ADD CONSTRAINT chat_threads_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: doctor_availability doctor_availability_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.doctor_availability
    ADD CONSTRAINT doctor_availability_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: doctors doctors_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- Name: doctors doctors_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;


--
-- Name: patients fk_patients_doctor; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT fk_patients_doctor FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;


--
-- Name: note_templates note_templates_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.note_templates
    ADD CONSTRAINT note_templates_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_related_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_related_appointment_id_fkey FOREIGN KEY (related_appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: patient_template_fills patient_template_fills_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patient_template_fills
    ADD CONSTRAINT patient_template_fills_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: patient_template_fills patient_template_fills_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patient_template_fills
    ADD CONSTRAINT patient_template_fills_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: patient_template_fills patient_template_fills_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.patient_template_fills
    ADD CONSTRAINT patient_template_fills_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.note_templates(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: sessions sessions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;


--
-- Name: subscription_doctors subscription_doctors_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_doctors
    ADD CONSTRAINT subscription_doctors_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: subscription_doctors subscription_doctors_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscription_doctors
    ADD CONSTRAINT subscription_doctors_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_bundle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_bundle_id_fkey FOREIGN KEY (bundle_id) REFERENCES public.subscription_bundles(id);


--
-- Name: subscriptions subscriptions_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: token_usage_logs token_usage_logs_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.token_usage_logs
    ADD CONSTRAINT token_usage_logs_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE CASCADE;


--
-- Name: visits visits_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: visits visits_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;


--
-- Name: visits visits_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.visits
    ADD CONSTRAINT visits_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_log whatsapp_message_log_doctor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.whatsapp_message_log
    ADD CONSTRAINT whatsapp_message_log_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.doctors(id) ON DELETE SET NULL;


--
-- Name: whatsapp_message_log whatsapp_message_log_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.whatsapp_message_log
    ADD CONSTRAINT whatsapp_message_log_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE CASCADE;


--
-- Name: whatsapp_message_log whatsapp_message_log_visit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: medical_user
--

ALTER TABLE ONLY public.whatsapp_message_log
    ADD CONSTRAINT whatsapp_message_log_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.visits(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 3L4nhzvB6H8cLkXMdZccBxWKePhZgtV5ABxbDtJMmpedzD3yKn8h92EhfyzP308

