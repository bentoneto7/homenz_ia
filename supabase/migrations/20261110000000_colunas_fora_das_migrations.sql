-- Colunas e ajustes que o código usa e que existiam no banco original, mas nunca
-- viraram migration (foram aplicados à mão pelo painel ou por scripts avulsos).
-- Com este arquivo, aplicar todas as migrations em ordem recria o banco inteiro.
-- Tudo idempotente.

-- profiles: dados de contato e de assinatura
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- franchises: contato da unidade e assinatura
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.franchises ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- franchise_landing_pages: endereço próprio da página e conteúdo white-label
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS content JSONB;

-- leads: o status "em atendimento" entrou depois da criação da coluna
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_attendance_status_check;
ALTER TABLE public.leads ADD CONSTRAINT leads_attendance_status_check
  CHECK (attendance_status IN ('open','in_progress','resolved','closed_sale','closed_no_sale','contact_later'));
