/**
 * Cria a tabela landing_page_sellers no Supabase via API REST
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Usar a API de administração do Supabase para executar SQL
const projectRef = process.env.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
console.log('Project ref:', projectRef);

const sql = `
-- Criar tabela landing_page_sellers
CREATE TABLE IF NOT EXISTS public.landing_page_sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  seller_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(landing_page_id, seller_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lps_landing_page_id ON public.landing_page_sellers(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_lps_seller_id ON public.landing_page_sellers(seller_id);

-- RLS
ALTER TABLE public.landing_page_sellers ENABLE ROW LEVEL SECURITY;

-- Policy: acesso total via service role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'landing_page_sellers' 
    AND policyname = 'service_role_all'
  ) THEN
    EXECUTE 'CREATE POLICY service_role_all ON public.landing_page_sellers FOR ALL USING (true)';
  END IF;
END $$;
`;

// Tentar via fetch direto à Management API
const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  }
);

const result = await response.json();
console.log('Status:', response.status);
console.log('Result:', JSON.stringify(result, null, 2));

// Verificar se a tabela existe agora
const { data, error } = await supabase
  .from('landing_page_sellers')
  .select('id')
  .limit(1);

if (error) {
  console.log('❌ Tabela ainda não existe:', error.message);
  
  // Tentar via pg_dump approach - criar função e chamar
  console.log('\nTentando via função RPC...');
  
  // Criar uma função temporária para executar o DDL
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', {
    sql_query: sql
  });
  
  if (rpcError) {
    console.log('❌ RPC também falhou:', rpcError.message);
    console.log('\n⚠️  A tabela precisa ser criada manualmente no Supabase Dashboard');
    console.log('SQL a executar:');
    console.log(sql);
  } else {
    console.log('✅ Tabela criada via RPC!');
  }
} else {
  console.log('✅ Tabela landing_page_sellers existe e está acessível!');
}
