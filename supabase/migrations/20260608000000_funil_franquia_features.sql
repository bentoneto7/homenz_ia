-- Funil da franquia: white-label/hero, encerramento de atendimento e resultados de IA (antes/depois)
-- Tudo idempotente (IF NOT EXISTS) para ser seguro de reaplicar.

-- 1. White-label / apresentação (hero) nas landing pages da franquia
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS hero_title TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS hero_subtitle TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS hero_image_url TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS cta_text TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS custom_address TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS custom_phone TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS custom_logo_url TEXT;
ALTER TABLE public.franchise_landing_pages ADD COLUMN IF NOT EXISTS gallery_photos JSONB DEFAULT '[]'::jsonb;

-- 2. Encerramento de atendimento no lead (status + observações do vendedor)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'open'
  CHECK (attendance_status IN ('open','resolved','closed_sale','closed_no_sale','contact_later'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closing_notes TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES public.profiles(id);

-- 3. Resultados de IA (antes/depois) do funil da franquia
CREATE TABLE IF NOT EXISTS public.franchise_ai_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES public.franchises(id) ON DELETE CASCADE,
  analysis_text TEXT,
  baldness_level TEXT,
  baldness_scale TEXT,
  affected_areas JSONB,
  density_estimate TEXT,
  before_image_url TEXT,
  after_image_url TEXT,
  recommended_treatment TEXT,
  estimated_sessions INTEGER,
  lead_score INTEGER,
  lead_score_breakdown JSONB,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending','processing','done','error')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_franchise_ai_results_lead_id ON public.franchise_ai_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_franchise_ai_results_franchise_id ON public.franchise_ai_results(franchise_id);
