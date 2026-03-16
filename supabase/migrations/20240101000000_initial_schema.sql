-- ─────────────────────────────────────────────────────────────────────────────
-- Homenz.ia — Schema inicial Supabase
-- Migração: 20240101000000_initial_schema
-- ─────────────────────────────────────────────────────────────────────────────

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- PROFILES (extensão de auth.users)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT,
  email       TEXT,
  role        TEXT NOT NULL DEFAULT 'user'
                CHECK (role IN ('user','owner','franchisee','seller','admin')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  login_method TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: criar profile automaticamente ao criar usuário no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- PLAN LIMITS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_limits (
  id                        SERIAL PRIMARY KEY,
  plan                      TEXT NOT NULL UNIQUE CHECK (plan IN ('free','pro','enterprise')),
  leads_per_month           INTEGER NOT NULL DEFAULT 50,
  ai_analyses_per_month     INTEGER NOT NULL DEFAULT 10,
  team_members              INTEGER NOT NULL DEFAULT 1,
  whatsapp_notifications    BOOLEAN NOT NULL DEFAULT FALSE,
  google_calendar           BOOLEAN NOT NULL DEFAULT FALSE,
  cal_com_integration       BOOLEAN NOT NULL DEFAULT FALSE,
  custom_branding           BOOLEAN NOT NULL DEFAULT FALSE,
  nps_enabled               BOOLEAN NOT NULL DEFAULT FALSE,
  treatment_history         BOOLEAN NOT NULL DEFAULT FALSE,
  export_data               BOOLEAN NOT NULL DEFAULT FALSE,
  api_access                BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed plan_limits
INSERT INTO public.plan_limits (plan, leads_per_month, ai_analyses_per_month, team_members, whatsapp_notifications, google_calendar, cal_com_integration, custom_branding, nps_enabled, treatment_history, export_data, api_access)
VALUES
  ('free',       50,   10,  1, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE),
  ('pro',       500,  100,  5, TRUE,  TRUE,  FALSE, TRUE,  TRUE,  TRUE,  TRUE,  FALSE),
  ('enterprise', -1,   -1, -1, TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE,  TRUE)
ON CONFLICT (plan) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINICS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinics (
  id                        SERIAL PRIMARY KEY,
  slug                      TEXT NOT NULL UNIQUE,
  name                      TEXT NOT NULL,
  owner_user_id             UUID NOT NULL REFERENCES public.profiles(id),
  owner_name                TEXT,
  email                     TEXT,
  phone                     TEXT,
  whatsapp                  TEXT,
  city                      TEXT,
  state                     TEXT,
  address                   TEXT,
  zip_code                  TEXT,
  cnpj                      TEXT,
  bio                       TEXT,
  logo_url                  TEXT,
  cover_url                 TEXT,
  services                  JSONB DEFAULT '[]'::JSONB,
  working_hours             JSONB DEFAULT '{}'::JSONB,
  -- Integrações
  notify_whatsapp           TEXT,
  notify_email              TEXT,
  google_calendar_id        TEXT,
  cal_com_api_key           TEXT,
  cal_com_event_type_id     TEXT,
  -- Plano e trial
  trial_ends_at             TIMESTAMPTZ,
  plan                      TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','enterprise')),
  active                    BOOLEAN NOT NULL DEFAULT TRUE,
  -- Contadores mensais
  current_month_leads       INTEGER NOT NULL DEFAULT 0,
  current_month_ai_analyses INTEGER NOT NULL DEFAULT 0,
  counters_reset_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Franquia
  franchise_id              UUID,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC USERS (membros da equipe)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_users (
  id          SERIAL PRIMARY KEY,
  clinic_id   INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'attendant' CHECK (role IN ('owner','manager','attendant')),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE (clinic_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id                    SERIAL PRIMARY KEY,
  clinic_id             INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  -- Dados do lead
  name                  TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  email                 TEXT,
  region                TEXT,
  -- UTM / Rastreamento
  utm_source            TEXT,
  utm_medium            TEXT,
  utm_campaign          TEXT,
  utm_content           TEXT,
  utm_term              TEXT,
  referrer              TEXT,
  -- Chat
  gender                TEXT CHECK (gender IN ('male','female','other')),
  age                   INTEGER,
  hair_problem          TEXT,
  hair_loss_type        TEXT CHECK (hair_loss_type IN ('frontal','vertex','total','diffuse','temporal','other')),
  hair_loss_time        TEXT,
  previous_treatments   TEXT,
  expectations          TEXT,
  how_did_you_hear      TEXT,
  chat_answers          JSONB,
  -- Funil
  funnel_step           TEXT NOT NULL DEFAULT 'landing' CHECK (funnel_step IN (
    'landing','form_started','form_done','chat_started','chat_done',
    'photos_started','photos_done','ai_processing','ai_done',
    'schedule_started','scheduled','confirmed','completed','cancelled'
  )),
  abandoned_at          TIMESTAMPTZ,
  last_activity_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Score
  lead_score            INTEGER,
  lead_score_breakdown  JSONB,
  priority              TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  -- Sessão anônima
  session_token         TEXT UNIQUE,
  -- Alertas de temperatura
  last_alert_sent_at    TIMESTAMPTZ,
  last_alert_temperature TEXT CHECK (last_alert_temperature IN ('hot','warm','cold','lost')),
  -- Vendedor atribuído
  assigned_seller_id    UUID REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD PHOTOS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_photos (
  id          SERIAL PRIMARY KEY,
  lead_id     INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id   INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  photo_type  TEXT NOT NULL CHECK (photo_type IN ('front','top','left','right','back','custom')),
  photo_url   TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- AI RESULTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_results (
  id                    SERIAL PRIMARY KEY,
  lead_id               INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  clinic_id             INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  -- Resultado da análise
  diagnosis             TEXT,
  severity              TEXT CHECK (severity IN ('mild','moderate','severe','very_severe')),
  norwood_scale         INTEGER,
  recommended_treatment TEXT,
  estimated_sessions    INTEGER,
  urgency               TEXT CHECK (urgency IN ('low','medium','high','critical')),
  -- Imagens geradas
  result_image_url      TEXT,
  before_after_url      TEXT,
  -- Dados brutos
  raw_analysis          JSONB,
  ai_model              TEXT,
  processing_time_ms    INTEGER,
  -- Status
  status                TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- APPOINTMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id                SERIAL PRIMARY KEY,
  clinic_id         INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id           INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  -- Data e hora
  scheduled_at      TIMESTAMPTZ NOT NULL,
  duration_minutes  INTEGER NOT NULL DEFAULT 60,
  -- Status
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  -- Detalhes
  notes             TEXT,
  location          TEXT,
  google_event_id   TEXT,
  cal_com_booking_id TEXT,
  -- Cancelamento
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  cancelled_by      TEXT CHECK (cancelled_by IN ('clinic','lead','system')),
  -- Confirmação
  confirmed_at      TIMESTAMPTZ,
  confirmed_by_user_id UUID REFERENCES public.profiles(id),
  -- Conclusão
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- TREATMENTS (histórico clínico)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatments (
  id                            SERIAL PRIMARY KEY,
  clinic_id                     INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id                       INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_id                INTEGER REFERENCES public.appointments(id),
  treatment_type                TEXT NOT NULL,
  session_number                INTEGER NOT NULL DEFAULT 1,
  areas_targeted                JSONB,
  products_used                 JSONB,
  technician                    TEXT,
  notes                         TEXT,
  before_photo_url              TEXT,
  after_photo_url               TEXT,
  satisfaction_rating           SMALLINT CHECK (satisfaction_rating BETWEEN 1 AND 5),
  next_session_recommended_at   TIMESTAMPTZ,
  performed_at                  TIMESTAMPTZ NOT NULL,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id              SERIAL PRIMARY KEY,
  clinic_id       INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  target_type     TEXT NOT NULL CHECK (target_type IN ('clinic','lead')),
  lead_id         INTEGER REFERENCES public.leads(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  content         TEXT NOT NULL,
  type            TEXT NOT NULL CHECK (type IN (
    'new_lead','chat_completed','photos_uploaded','ai_ready',
    'appointment_new','appointment_confirmed','appointment_cancelled',
    'appointment_reminder','treatment_followup','nps_request'
  )),
  channel         TEXT NOT NULL DEFAULT 'platform' CHECK (channel IN ('platform','whatsapp','email','sms')),
  template_id     TEXT,
  read            BOOLEAN NOT NULL DEFAULT FALSE,
  delivered       BOOLEAN NOT NULL DEFAULT FALSE,
  delivered_at    TIMESTAMPTZ,
  delivery_error  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- NPS RESPONSES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id                SERIAL PRIMARY KEY,
  clinic_id         INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id           INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  appointment_id    INTEGER REFERENCES public.appointments(id),
  score             SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  category          TEXT NOT NULL CHECK (category IN ('detractor','passive','promoter')),
  comment           TEXT,
  allow_testimonial BOOLEAN NOT NULL DEFAULT FALSE,
  sent_at           TIMESTAMPTZ NOT NULL,
  responded_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC AVAILABILITY
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_availability (
  id                          SERIAL PRIMARY KEY,
  clinic_id                   INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week                 SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time                  TEXT NOT NULL,
  end_time                    TEXT NOT NULL,
  slot_duration_minutes       INTEGER NOT NULL DEFAULT 60,
  break_between_minutes       INTEGER NOT NULL DEFAULT 0,
  max_concurrent_appointments INTEGER NOT NULL DEFAULT 1,
  active                      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS public.clinic_blocked_dates (
  id           SERIAL PRIMARY KEY,
  clinic_id    INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD EVENTS (jornada do lead)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_events (
  id                    SERIAL PRIMARY KEY,
  clinic_id             INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id               INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL CHECK (event_type IN (
    'lead_created','chat_started','chat_completed','chat_abandoned',
    'photos_started','photos_completed','photos_abandoned',
    'ai_processing_started','ai_result_ready','schedule_opened',
    'appointment_created','appointment_confirmed','appointment_cancelled',
    'appointment_completed','appointment_no_show',
    'followup_sent','whatsapp_contacted','nps_sent','nps_responded','status_changed'
  )),
  description           TEXT,
  metadata              JSONB,
  triggered_by          TEXT NOT NULL DEFAULT 'system' CHECK (triggered_by IN ('system','lead','clinic')),
  triggered_by_user_id  UUID REFERENCES public.profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD FOLLOWUPS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_followups (
  id              SERIAL PRIMARY KEY,
  clinic_id       INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id         INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_step   SMALLINT NOT NULL,
  channel         TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp','platform')),
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','cancelled')),
  sent_at         TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  cancel_reason   TEXT,
  message_text    TEXT,
  sent_by_user_id UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- BRANDS (redes / franqueadoras)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.brands (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  logo_url        TEXT,
  cover_url       TEXT,
  primary_color   TEXT DEFAULT '#D4A843',
  website         TEXT,
  owner_user_id   UUID NOT NULL REFERENCES public.profiles(id),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC HEALTH SCORES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_health_scores (
  id                  SERIAL PRIMARY KEY,
  clinic_id           INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  score_date          DATE NOT NULL,
  overall_score       SMALLINT NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  lead_response_score SMALLINT DEFAULT 0,
  conversion_score    SMALLINT DEFAULT 0,
  nps_score           SMALLINT DEFAULT 0,
  activity_score      SMALLINT DEFAULT 0,
  details             JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, score_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- CLINIC DAILY CHECKINS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clinic_daily_checkins (
  id                    SERIAL PRIMARY KEY,
  clinic_id             INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES public.profiles(id),
  checkin_date          DATE NOT NULL,
  mood                  SMALLINT CHECK (mood BETWEEN 1 AND 5),
  team_present          INTEGER,
  goals_for_today       TEXT,
  blockers              TEXT,
  notes                 TEXT,
  leads_contacted_today INTEGER DEFAULT 0,
  appointments_today    INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, user_id, checkin_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SELLER INVITES
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_invites (
  id              SERIAL PRIMARY KEY,
  clinic_id       INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  email           TEXT NOT NULL,
  token           TEXT NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ NOT NULL,
  used_at         TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES public.profiles(id),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- SELLER METRICS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seller_metrics (
  id                  SERIAL PRIMARY KEY,
  clinic_id           INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  seller_user_id      UUID NOT NULL REFERENCES public.profiles(id),
  metric_date         DATE NOT NULL,
  leads_received      INTEGER NOT NULL DEFAULT 0,
  leads_contacted     INTEGER NOT NULL DEFAULT 0,
  appointments_set    INTEGER NOT NULL DEFAULT 0,
  appointments_done   INTEGER NOT NULL DEFAULT 0,
  contact_rate        NUMERIC(5,2) DEFAULT 0,
  scheduling_rate     NUMERIC(5,2) DEFAULT 0,
  conversion_rate     NUMERIC(5,2) DEFAULT 0,
  performance_score   INTEGER NOT NULL DEFAULT 0,
  rank_position       INTEGER,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (clinic_id, seller_user_id, metric_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LEAD ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id                    SERIAL PRIMARY KEY,
  clinic_id             INTEGER NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  lead_id               INTEGER NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  seller_user_id        UUID NOT NULL REFERENCES public.profiles(id),
  assigned_by_user_id   UUID REFERENCES public.profiles(id),
  status                TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','transferred')),
  first_contact_at      TIMESTAMPTZ,
  response_time_minutes NUMERIC(8,2),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- ACCESS INVITES (convites por nível)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.access_invites (
  id                  SERIAL PRIMARY KEY,
  created_by_user_id  UUID NOT NULL REFERENCES public.profiles(id),
  role                TEXT NOT NULL CHECK (role IN ('admin','franchisee','seller')),
  label               TEXT,
  token               TEXT NOT NULL UNIQUE,
  max_uses            INTEGER NOT NULL DEFAULT 1,
  use_count           INTEGER NOT NULL DEFAULT 0,
  expires_at          TIMESTAMPTZ,
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_invite_uses (
  id          SERIAL PRIMARY KEY,
  invite_id   INTEGER NOT NULL REFERENCES public.access_invites(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id),
  used_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- LANDING PAGE SELLERS (mapeamento LP → vendedores para round-robin)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.landing_page_sellers (
  id              SERIAL PRIMARY KEY,
  landing_page_id TEXT NOT NULL,
  seller_id       UUID NOT NULL REFERENCES public.profiles(id),
  seller_name     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (landing_page_id, seller_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES para performance
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_leads_clinic_id ON public.leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_leads_funnel_step ON public.leads(funnel_step);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_session_token ON public.leads(session_token);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON public.appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_clinic_id ON public.notifications(clinic_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON public.lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_photos_lead_id ON public.lead_photos(lead_id);
CREATE INDEX IF NOT EXISTS idx_ai_results_lead_id ON public.ai_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_clinic_users_user_id ON public.clinic_users(user_id);
