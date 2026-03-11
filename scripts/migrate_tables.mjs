/**
 * Script de migração para criar tabelas faltantes no Supabase
 * Executa via REST API usando o service role key
 */
import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Migração Supabase ===\n');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('ERRO: Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Usar a API REST do Supabase para executar SQL via rpc
// O Supabase permite executar SQL via função RPC se ela existir
// Vamos tentar criar as tabelas via inserção de dados estruturada

// 1. Criar tabela seller_invites via SQL direto usando fetch
const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
console.log('Project ref:', projectRef);

// Usar a Management API do Supabase para executar SQL
const sqlStatements = [
  // Tabela de convites de vendedor
  `CREATE TABLE IF NOT EXISTS public.seller_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
    email TEXT,
    token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    used BOOLEAN NOT NULL DEFAULT false,
    used_by UUID REFERENCES public.profiles(id),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  
  // Tabela de landing pages
  `CREATE TABLE IF NOT EXISTS public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    cta_text TEXT DEFAULT 'Quero Agendar Avaliação Gratuita',
    hero_image_url TEXT,
    video_url TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    views INTEGER NOT NULL DEFAULT 0,
    leads_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  
  // Índices
  `CREATE INDEX IF NOT EXISTS idx_seller_invites_franchise_id ON public.seller_invites(franchise_id)`,
  `CREATE INDEX IF NOT EXISTS idx_seller_invites_token ON public.seller_invites(token)`,
  `CREATE INDEX IF NOT EXISTS idx_landing_pages_franchise_id ON public.landing_pages(franchise_id)`,
  `CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON public.landing_pages(slug)`,
];

// Tentar via fetch direto para o endpoint SQL do Supabase
for (const sql of sqlStatements) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    
    if (response.ok) {
      console.log('✅ SQL executado:', sql.substring(0, 60) + '...');
    } else {
      const text = await response.text();
      console.log('⚠️  RPC não disponível, tentando abordagem alternativa...');
      break;
    }
  } catch (e) {
    console.log('Erro:', e.message);
  }
}

// Verificar se as tabelas foram criadas
console.log('\n--- Verificando tabelas ---');
const tablesToCheck = ['seller_invites', 'landing_pages'];
for (const table of tablesToCheck) {
  const { error } = await supabase.from(table).select('*').limit(0);
  if (!error) {
    console.log(`✅ ${table} - EXISTE`);
  } else {
    console.log(`❌ ${table} - NÃO EXISTE: ${error.message.substring(0, 60)}`);
  }
}
