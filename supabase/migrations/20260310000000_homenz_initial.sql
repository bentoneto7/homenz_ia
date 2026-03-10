-- ============================================================
-- HOMENZ IA - Migração do Supabase
-- Execute este SQL no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/[seu-projeto]/sql
-- ============================================================

-- 1. Tabela de perfis de usuários (sistema próprio, sem Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('owner', 'franchisee', 'seller')),
  phone TEXT,
  avatar_url TEXT,
  franchise_id UUID,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de franquias
CREATE TABLE IF NOT EXISTS franchises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  owner_id UUID REFERENCES profiles(id),
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  plan TEXT DEFAULT 'pro' CHECK (plan IN ('free', 'pro', 'enterprise')),
  active BOOLEAN DEFAULT TRUE,
  trial_ends_at TIMESTAMPTZ,
  total_leads INTEGER DEFAULT 0,
  total_scheduled INTEGER DEFAULT 0,
  avg_lead_score DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Adicionar FK de franchise_id em profiles
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_franchise_id_fkey 
  FOREIGN KEY (franchise_id) REFERENCES franchises(id);

-- 4. Tabela de leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID REFERENCES franchises(id),
  assigned_to UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  age INTEGER,
  gender TEXT,
  hair_problem TEXT,
  hair_loss_type TEXT,
  lead_score INTEGER DEFAULT 0 CHECK (lead_score >= 0 AND lead_score <= 100),
  temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cold')),
  funnel_step TEXT DEFAULT 'landing',
  chat_answers JSONB,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de eventos da jornada do lead
CREATE TABLE IF NOT EXISTS lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id),
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  triggered_by TEXT DEFAULT 'system' CHECK (triggered_by IN ('system', 'lead', 'seller')),
  seller_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de métricas de vendedores
CREATE TABLE IF NOT EXISTS seller_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  franchise_id UUID REFERENCES franchises(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  leads_assigned INTEGER DEFAULT 0,
  leads_contacted INTEGER DEFAULT 0,
  leads_scheduled INTEGER DEFAULT 0,
  leads_confirmed INTEGER DEFAULT 0,
  avg_response_minutes INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(seller_id, period_start)
);

-- 7. Tabela de agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  franchise_id UUID REFERENCES franchises(id),
  seller_id UUID REFERENCES profiles(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Tabela de convites de acesso
CREATE TABLE IF NOT EXISTS access_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  franchise_id UUID REFERENCES franchises(id),
  invited_by UUID REFERENCES profiles(id),
  role TEXT NOT NULL CHECK (role IN ('franchisee', 'seller')),
  email TEXT,
  max_uses INTEGER DEFAULT 1,
  uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Tabela de sessões
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DADOS DE DEMONSTRAÇÃO
-- ============================================================

-- Inserir owner da rede Homenz
-- Senha: admin123 (hash bcrypt)
INSERT INTO profiles (id, name, email, password_hash, role, phone)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Admin Homenz',
  'admin@homenzbrasil.com.br',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyBAVm0Oe',
  'owner',
  '(11) 99999-0000'
) ON CONFLICT (email) DO NOTHING;

-- Inserir franquias demo
INSERT INTO franchises (id, name, slug, city, state, owner_id, plan, total_leads, total_scheduled, avg_lead_score)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'Homenz Uberaba', 'uberaba', 'Uberaba', 'MG', 'a0000000-0000-0000-0000-000000000001', 'pro', 147, 22, 72.5),
  ('b0000000-0000-0000-0000-000000000002', 'Homenz Uberlândia', 'uberlandia', 'Uberlândia', 'MG', 'a0000000-0000-0000-0000-000000000001', 'pro', 203, 41, 68.3),
  ('b0000000-0000-0000-0000-000000000003', 'Homenz BH', 'belo-horizonte', 'Belo Horizonte', 'MG', 'a0000000-0000-0000-0000-000000000001', 'enterprise', 312, 67, 75.1)
ON CONFLICT (slug) DO NOTHING;

-- Inserir franqueado demo
-- Senha: franq123
INSERT INTO profiles (id, name, email, password_hash, role, franchise_id, phone)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'João Franqueado',
  'franqueado@homenzuberaba.com.br',
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyBAVm0Oe',
  'franchisee',
  'b0000000-0000-0000-0000-000000000001',
  '(34) 99888-7777'
) ON CONFLICT (email) DO NOTHING;

-- Atualizar owner da franquia Uberaba para o franqueado
UPDATE franchises 
SET owner_id = 'a0000000-0000-0000-0000-000000000002'
WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- Inserir vendedores demo
-- Senha: vendedor123
INSERT INTO profiles (id, name, email, password_hash, role, franchise_id, phone)
VALUES 
  ('a0000000-0000-0000-0000-000000000003', 'Carlos Mendes', 'carlos@homenzuberaba.com.br', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyBAVm0Oe', 'seller', 'b0000000-0000-0000-0000-000000000001', '(34) 99777-1111'),
  ('a0000000-0000-0000-0000-000000000004', 'Ana Lima', 'ana@homenzuberaba.com.br', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyBAVm0Oe', 'seller', 'b0000000-0000-0000-0000-000000000001', '(34) 99777-2222'),
  ('a0000000-0000-0000-0000-000000000005', 'Rafael Costa', 'rafael@homenzuberaba.com.br', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVyBAVm0Oe', 'seller', 'b0000000-0000-0000-0000-000000000001', '(34) 99777-3333')
ON CONFLICT (email) DO NOTHING;

-- Inserir leads demo
INSERT INTO leads (franchise_id, assigned_to, name, phone, age, hair_problem, lead_score, temperature, funnel_step)
VALUES 
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'João Ferreira', '(34) 99812-3456', 36, 'Calvície frontal avançada', 88, 'hot', 'scheduled'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Pedro Alves', '(34) 99823-4567', 42, 'Queda difusa no topo', 74, 'warm', 'chat_done'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Marcos Souza', '(34) 99834-5678', 29, 'Entradas pronunciadas', 91, 'hot', 'ai_done'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Lucas Rocha', '(34) 99845-6789', 38, 'Calvície no vértice', 55, 'warm', 'photos_done'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'Bruno Martins', '(34) 99856-7890', 45, 'Queda generalizada', 38, 'cold', 'chat_started'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'Diego Santos', '(34) 99867-8901', 33, 'Entradas e topo', 82, 'hot', 'scheduled'),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Felipe Oliveira', '(34) 99878-9012', 51, 'Calvície total', 65, 'warm', 'ai_done');

-- Inserir métricas de vendedores (mês atual)
INSERT INTO seller_metrics (seller_id, franchise_id, period_start, period_end, leads_assigned, leads_contacted, leads_scheduled, leads_confirmed, avg_response_minutes, conversion_rate, score)
VALUES 
  ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', date_trunc('month', NOW())::date, (date_trunc('month', NOW()) + interval '1 month - 1 day')::date, 18, 16, 11, 9, 8, 61, 94),
  ('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', date_trunc('month', NOW())::date, (date_trunc('month', NOW()) + interval '1 month - 1 day')::date, 14, 12, 8, 6, 12, 57, 82),
  ('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', date_trunc('month', NOW())::date, (date_trunc('month', NOW()) + interval '1 month - 1 day')::date, 12, 9, 5, 3, 28, 42, 61)
ON CONFLICT (seller_id, period_start) DO NOTHING;

-- ============================================================
-- POLÍTICAS RLS (Row Level Security) - DESABILITADAS para simplicidade
-- O acesso é controlado pelo backend via service_role key
-- ============================================================
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE franchises DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE seller_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
ALTER TABLE access_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================
SELECT 
  'profiles' as tabela, COUNT(*) as registros FROM profiles
UNION ALL SELECT 'franchises', COUNT(*) FROM franchises
UNION ALL SELECT 'leads', COUNT(*) FROM leads
UNION ALL SELECT 'seller_metrics', COUNT(*) FROM seller_metrics;
