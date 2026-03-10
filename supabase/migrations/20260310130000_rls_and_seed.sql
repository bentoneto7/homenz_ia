-- Desabilitar RLS nas novas tabelas (acesso controlado pelo backend com service role)
ALTER TABLE franchise_round_robin DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_distribution_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE franchise_landing_pages DISABLE ROW LEVEL SECURITY;

-- Inserir round-robin para franquias existentes
INSERT INTO franchise_round_robin (franchise_id, last_seller_index, total_distributed)
SELECT id, 0, 0 FROM franchises
ON CONFLICT (franchise_id) DO NOTHING;

-- Criar landing pages padrão para cada franquia
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

