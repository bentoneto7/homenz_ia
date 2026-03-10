-- ============================================================
-- Migração: Sistema de Distribuição Round-Robin + Landing Pages
-- ============================================================

-- 1. Tabela de controle de round-robin por franquia
-- Guarda qual foi o último vendedor que recebeu um lead
CREATE TABLE IF NOT EXISTS franchise_round_robin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID UNIQUE NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  last_seller_index INTEGER DEFAULT 0,  -- índice do último vendedor que recebeu lead
  total_distributed INTEGER DEFAULT 0,  -- total de leads distribuídos
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Log de distribuição de leads (auditoria completa)
CREATE TABLE IF NOT EXISTS lead_distribution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id),
  seller_id UUID REFERENCES profiles(id),
  method TEXT NOT NULL DEFAULT 'round_robin' CHECK (method IN ('round_robin', 'manual', 'reassigned')),
  seller_position INTEGER,  -- posição do vendedor na fila no momento da atribuição
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dist_log_lead ON lead_distribution_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_dist_log_franchise ON lead_distribution_log(franchise_id);
CREATE INDEX IF NOT EXISTS idx_dist_log_seller ON lead_distribution_log(seller_id);
CREATE INDEX IF NOT EXISTS idx_dist_log_created ON lead_distribution_log(created_at DESC);

-- 3. Tabela de landing pages por franquia
CREATE TABLE IF NOT EXISTS franchise_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES franchises(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,           -- ex: homenz-uberaba-cabelo
  title TEXT NOT NULL,                 -- ex: "Recupere seu Cabelo — Homenz Uberaba"
  procedure TEXT NOT NULL DEFAULT 'crescimento-capilar',
  city TEXT NOT NULL,                  -- ex: "Uberaba"
  state TEXT NOT NULL,                 -- ex: "MG"
  active BOOLEAN DEFAULT TRUE,
  -- Estatísticas
  total_views INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,
  -- UTM padrão embutido
  utm_source TEXT DEFAULT 'meta',
  utm_medium TEXT DEFAULT 'cpc',
  utm_campaign TEXT,                   -- preenchido automaticamente com slug
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lp_franchise ON franchise_landing_pages(franchise_id);
CREATE INDEX IF NOT EXISTS idx_lp_slug ON franchise_landing_pages(slug);

-- 4. Adicionar colunas de distribuição na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page_id UUID REFERENCES franchise_landing_pages(id);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending' 
  CHECK (distribution_status IN ('pending', 'assigned', 'reassigned', 'manual'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS photo_url TEXT;  -- foto da área capilar

-- 5. Inicializar round-robin para franquias existentes
INSERT INTO franchise_round_robin (franchise_id, last_seller_index, total_distributed)
SELECT id, 0, 0 FROM franchises
ON CONFLICT (franchise_id) DO NOTHING;

-- 6. Criar landing pages padrão para cada franquia existente
INSERT INTO franchise_landing_pages (franchise_id, slug, title, procedure, city, state, utm_campaign)
SELECT 
  id,
  slug || '-cabelo',
  'Recupere seu Cabelo — Homenz ' || city,
  'crescimento-capilar',
  city,
  state,
  slug || '-cabelo'
FROM franchises
ON CONFLICT (slug) DO NOTHING;

