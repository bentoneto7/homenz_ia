import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Verificar colunas de cada tabela via information_schema
const tables = ['profiles', 'franchises', 'leads', 'appointments', 'landing_pages'];

for (const table of tables) {
  console.log(`\n=== Tabela: ${table} ===`);
  
  // Buscar 1 linha para ver as colunas
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .limit(1);
  
  if (error) {
    console.log(`  ERRO: ${error.message}`);
  } else if (data && data.length > 0) {
    console.log(`  Colunas: ${Object.keys(data[0]).join(', ')}`);
    console.log(`  Exemplo: ${JSON.stringify(data[0]).substring(0, 200)}`);
  } else {
    // Tentar inserir dados vazios para ver as colunas
    console.log(`  Tabela vazia - tentando verificar estrutura...`);
    const { error: e2 } = await supabase.from(table).select('*').limit(0);
    if (e2) console.log(`  ERRO: ${e2.message}`);
    else console.log(`  Tabela existe mas está vazia`);
  }
}

// Verificar tabelas que podem existir com nomes diferentes
const altTables = ['invites', 'seller_invites', 'franchise_invites', 'users', 'sellers'];
console.log('\n=== Verificando tabelas alternativas ===');
for (const table of altTables) {
  const { error } = await supabase.from(table).select('*').limit(1);
  if (!error) {
    console.log(`  ✅ ${table} - EXISTE`);
  } else {
    console.log(`  ❌ ${table} - ${error.message.substring(0, 60)}`);
  }
}
