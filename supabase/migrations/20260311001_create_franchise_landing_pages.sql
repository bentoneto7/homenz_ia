-- Criar tabela franchise_landing_pages (usada pelo gerador de páginas de campanha)
CREATE TABLE IF NOT EXISTS public.franchise_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  procedure TEXT NOT NULL DEFAULT 'crescimento-capilar',
  city TEXT,
  state TEXT,
  utm_source TEXT DEFAULT 'meta',
  utm_medium TEXT DEFAULT 'cpc',
  utm_campaign TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  views INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_franchise_landing_pages_franchise_id ON public.franchise_landing_pages(franchise_id);
CREATE INDEX IF NOT EXISTS idx_franchise_landing_pages_slug ON public.franchise_landing_pages(slug);
