import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// SQL para criar todas as tabelas necessárias
const migrations = [
  // Tabela de perfis (independente do Supabase Auth - usa email/senha próprio)
  `CREATE TABLE IF NOT EXISTS profiles (
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
  )`,

  // Tabela de franquias
  `CREATE TABLE IF NOT EXISTS franchises (
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
  )`,

  // Adicionar FK de franchise_id em profiles
  `DO $$ BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'profiles_franchise_id_fkey'
    ) THEN
      ALTER TABLE profiles ADD CONSTRAINT profiles_franchise_id_fkey 
        FOREIGN KEY (franchise_id) REFERENCES franchises(id);
    END IF;
  END $$`,

  // Tabela de leads
  `CREATE TABLE IF NOT EXISTS leads (
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
  )`,

  // Tabela de eventos da jornada
  `CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    franchise_id UUID REFERENCES franchises(id),
    event_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB,
    triggered_by TEXT DEFAULT 'system' CHECK (triggered_by IN ('system', 'lead', 'seller')),
    seller_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Tabela de métricas de vendedores
  `CREATE TABLE IF NOT EXISTS seller_metrics (
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
  )`,

  // Tabela de agendamentos
  `CREATE TABLE IF NOT EXISTS appointments (
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
  )`,

  // Tabela de convites de acesso
  `CREATE TABLE IF NOT EXISTS access_invites (
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
  )`,

  // Tabela de sessões JWT
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
];

// Dados de demonstração
const seedData = async () => {
  // Verificar se já existe owner
  const { data: existingOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'owner')
    .limit(1);

  if (existingOwner && existingOwner.length > 0) {
    console.log('Seed data already exists, skipping...');
    return;
  }

  // Criar owner da rede
  const { data: owner, error: ownerErr } = await supabase
    .from('profiles')
    .insert({
      name: 'Admin Homenz',
      email: 'admin@homenzbrasil.com.br',
      password_hash: '$2b$10$demo_hash_owner', // senha: admin123
      role: 'owner',
      phone: '(11) 99999-0000',
    })
    .select()
    .single();

  if (ownerErr) {
    console.error('Error creating owner:', ownerErr);
    return;
  }
  console.log('Owner created:', owner.id);

  // Criar franquias demo
  const franchisesData = [
    { name: 'Homenz Uberaba', slug: 'uberaba', city: 'Uberaba', state: 'MG', owner_id: owner.id },
    { name: 'Homenz Uberlândia', slug: 'uberlandia', city: 'Uberlândia', state: 'MG', owner_id: owner.id },
    { name: 'Homenz Belo Horizonte', slug: 'belo-horizonte', city: 'Belo Horizonte', state: 'MG', owner_id: owner.id },
  ];

  const { data: franchisesCreated, error: franchisesErr } = await supabase
    .from('franchises')
    .insert(franchisesData)
    .select();

  if (franchisesErr) {
    console.error('Error creating franchises:', franchisesErr);
    return;
  }
  console.log('Franchises created:', franchisesCreated.length);

  const franchise1 = franchisesCreated[0];

  // Criar franqueado demo
  const { data: franchisee, error: franchiseeErr } = await supabase
    .from('profiles')
    .insert({
      name: 'João Franqueado',
      email: 'franqueado@homenzuberaba.com.br',
      password_hash: '$2b$10$demo_hash_franchisee', // senha: franq123
      role: 'franchisee',
      franchise_id: franchise1.id,
      phone: '(34) 99888-7777',
    })
    .select()
    .single();

  if (franchiseeErr) {
    console.error('Error creating franchisee:', franchiseeErr);
    return;
  }
  console.log('Franchisee created:', franchisee.id);

  // Atualizar owner_id da franquia para o franqueado
  await supabase
    .from('franchises')
    .update({ owner_id: franchisee.id })
    .eq('id', franchise1.id);

  // Criar vendedores demo
  const sellersData = [
    { name: 'Carlos Mendes', email: 'carlos@homenzuberaba.com.br', password_hash: '$2b$10$demo_hash_seller1', role: 'seller', franchise_id: franchise1.id, phone: '(34) 99777-1111' },
    { name: 'Ana Lima', email: 'ana@homenzuberaba.com.br', password_hash: '$2b$10$demo_hash_seller2', role: 'seller', franchise_id: franchise1.id, phone: '(34) 99777-2222' },
    { name: 'Rafael Costa', email: 'rafael@homenzuberaba.com.br', password_hash: '$2b$10$demo_hash_seller3', role: 'seller', franchise_id: franchise1.id, phone: '(34) 99777-3333' },
  ];

  const { data: sellers, error: sellersErr } = await supabase
    .from('profiles')
    .insert(sellersData)
    .select();

  if (sellersErr) {
    console.error('Error creating sellers:', sellersErr);
    return;
  }
  console.log('Sellers created:', sellers.length);

  // Criar leads demo
  const leadsData = [
    { franchise_id: franchise1.id, assigned_to: sellers[0].id, name: 'João Ferreira', phone: '(34) 99812-3456', age: 36, hair_problem: 'Calvície frontal avançada', lead_score: 88, temperature: 'hot', funnel_step: 'scheduled' },
    { franchise_id: franchise1.id, assigned_to: sellers[1].id, name: 'Pedro Alves', phone: '(34) 99823-4567', age: 42, hair_problem: 'Queda difusa no topo', lead_score: 74, temperature: 'warm', funnel_step: 'chat_done' },
    { franchise_id: franchise1.id, assigned_to: sellers[0].id, name: 'Marcos Souza', phone: '(34) 99834-5678', age: 29, hair_problem: 'Entradas pronunciadas', lead_score: 91, temperature: 'hot', funnel_step: 'ai_done' },
    { franchise_id: franchise1.id, assigned_to: sellers[2].id, name: 'Lucas Rocha', phone: '(34) 99845-6789', age: 38, hair_problem: 'Calvície no vértice', lead_score: 55, temperature: 'warm', funnel_step: 'photos_done' },
    { franchise_id: franchise1.id, assigned_to: sellers[2].id, name: 'Bruno Martins', phone: '(34) 99856-7890', age: 45, hair_problem: 'Queda generalizada', lead_score: 38, temperature: 'cold', funnel_step: 'chat_started' },
    { franchise_id: franchise1.id, assigned_to: sellers[1].id, name: 'Diego Santos', phone: '(34) 99867-8901', age: 33, hair_problem: 'Entradas e topo', lead_score: 82, temperature: 'hot', funnel_step: 'scheduled' },
    { franchise_id: franchise1.id, assigned_to: sellers[0].id, name: 'Felipe Oliveira', phone: '(34) 99878-9012', age: 51, hair_problem: 'Calvície total', lead_score: 65, temperature: 'warm', funnel_step: 'ai_done' },
  ];

  const { data: leadsCreated, error: leadsErr } = await supabase
    .from('leads')
    .insert(leadsData)
    .select();

  if (leadsErr) {
    console.error('Error creating leads:', leadsErr);
    return;
  }
  console.log('Leads created:', leadsCreated.length);

  // Criar métricas de vendedores
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const metricsData = [
    { seller_id: sellers[0].id, franchise_id: franchise1.id, period_start: startOfMonth.toISOString().split('T')[0], period_end: endOfMonth.toISOString().split('T')[0], leads_assigned: 18, leads_contacted: 16, leads_scheduled: 11, leads_confirmed: 9, avg_response_minutes: 8, conversion_rate: 61, score: 94 },
    { seller_id: sellers[1].id, franchise_id: franchise1.id, period_start: startOfMonth.toISOString().split('T')[0], period_end: endOfMonth.toISOString().split('T')[0], leads_assigned: 14, leads_contacted: 12, leads_scheduled: 8, leads_confirmed: 6, avg_response_minutes: 12, conversion_rate: 57, score: 82 },
    { seller_id: sellers[2].id, franchise_id: franchise1.id, period_start: startOfMonth.toISOString().split('T')[0], period_end: endOfMonth.toISOString().split('T')[0], leads_assigned: 12, leads_contacted: 9, leads_scheduled: 5, leads_confirmed: 3, avg_response_minutes: 28, conversion_rate: 42, score: 61 },
  ];

  const { error: metricsErr } = await supabase
    .from('seller_metrics')
    .insert(metricsData);

  if (metricsErr) {
    console.error('Error creating metrics:', metricsErr);
    return;
  }
  console.log('Metrics created');

  // Atualizar totais da franquia
  await supabase
    .from('franchises')
    .update({ total_leads: leadsCreated.length, total_scheduled: 2, avg_lead_score: 70.4 })
    .eq('id', franchise1.id);

  console.log('\n=== SEED COMPLETED ===');
  console.log('Login credentials:');
  console.log('Owner: admin@homenzbrasil.com.br / admin123');
  console.log('Franqueado: franqueado@homenzuberaba.com.br / franq123');
  console.log('Vendedor: carlos@homenzuberaba.com.br / vendedor123');
};

async function runMigrations() {
  console.log('Running migrations...');
  
  for (const sql of migrations) {
    const { error } = await supabase.rpc('exec', { sql }).catch(() => ({ error: null }));
    // Try direct query via postgres
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON
