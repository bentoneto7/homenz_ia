import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('Adicionando coluna seen_by_seller na tabela leads...');
  
  // Tentar inserir um lead com seen_by_seller para ver se já existe
  const { data: testLead } = await supabase
    .from('leads')
    .select('id, seen_by_seller')
    .limit(1);
  
  if (testLead !== null && testLead.length > 0 && 'seen_by_seller' in testLead[0]) {
    console.log('✅ Coluna seen_by_seller já existe!');
    return;
  }
  
  // A coluna não existe - precisamos usar o endpoint de SQL do Supabase
  // Usar a API de management do Supabase
  const projectRef = process.env.SUPABASE_URL.replace('https://', '').split('.')[0];
  
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: 'ALTER TABLE leads ADD COLUMN IF NOT EXISTS seen_by_seller BOOLEAN DEFAULT FALSE; ALTER TABLE leads ADD COLUMN IF NOT EXISTS seen_at TIMESTAMPTZ DEFAULT NULL;'
      })
    }
  );
  
  const result = await response.json();
  console.log('Resultado:', JSON.stringify(result));
}

main().catch(console.error);
