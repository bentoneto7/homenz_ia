/**
 * Cria a tabela landing_page_sellers no Supabase via REST API
 * usando o endpoint de execução de SQL do Supabase
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Criando tabela landing_page_sellers no Supabase...');
  
  // Tentar inserir um registro de teste para verificar se a tabela existe
  const { error: testError } = await supabase
    .from('landing_page_sellers')
    .select('id')
    .limit(1);
  
  if (!testError) {
    console.log('✅ Tabela landing_page_sellers já existe!');
    return;
  }
  
  console.log('Tabela não existe:', testError.message);
  console.log('Tentando criar via Supabase Management API...');
  
  // Usar o endpoint de SQL do Supabase
  const projectRef = process.env.SUPABASE_URL.replace('https://', '').split('.')[0];
  console.log('Project ref:', projectRef);
  
  const sql = `
    CREATE TABLE IF NOT EXISTS public.landing_page_sellers (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      landing_page_id uuid NOT NULL REFERENCES public.franchise_landing_pages(id) ON DELETE CASCADE,
      seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(landing_page_id, seller_id)
    );
    CREATE INDEX IF NOT EXISTS idx_lps_landing_page_id ON public.landing_page_sellers(landing_page_id);
    CREATE INDEX IF NOT EXISTS idx_lps_seller_id ON public.landing_page_sellers(seller_id);
  `;
  
  // Tentar via pg_query RPC (se existir)
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.log('RPC exec_sql falhou:', error.message);
    
    // Alternativa: usar o endpoint REST do Supabase diretamente
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql_query: sql }),
    });
    const result = await response.json();
    console.log('REST result:', JSON.stringify(result));
  } else {
    console.log('✅ Tabela criada com sucesso!', data);
  }
}

main().catch(console.error);
