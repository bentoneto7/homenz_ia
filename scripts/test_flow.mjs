import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.mjs';
import fetch from 'node:http';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Teste de Fluxo Completo ===\n');
console.log('URL:', SUPABASE_URL ? SUPABASE_URL.substring(0, 40) + '...' : 'NOT FOUND');
console.log('KEY:', SUPABASE_SERVICE_ROLE_KEY ? 'FOUND' : 'NOT FOUND');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\nERRO: Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 1. Verificar usuários recentes
console.log('\n--- 1. Usuários Recentes ---');
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, email, name, role, active, plan, created_at')
  .order('created_at', { ascending: false })
  .limit(5);

if (profilesError) {
  console.log('Erro ao buscar profiles:', profilesError.message);
} else {
  console.log(`Total de profiles recentes: ${profiles.length}`);
  profiles.forEach(p => {
    console.log(`  - ${p.email} | role: ${p.role} | active: ${p.active} | plan: ${p.plan}`);
  });
}

// 2. Verificar franquias recentes
console.log('\n--- 2. Franquias Recentes ---');
const { data: franchises, error: franchisesError } = await supabase
  .from('franchises')
  .select('id, name, slug, active, plan, created_at')
  .order('created_at', { ascending: false })
  .limit(5);

if (franchisesError) {
  console.log('Erro ao buscar franchises:', franchisesError.message);
} else {
  console.log(`Total de franquias recentes: ${franchises.length}`);
  franchises.forEach(f => {
    console.log(`  - ${f.name} | slug: ${f.slug} | active: ${f.active} | plan: ${f.plan}`);
  });
}

// 3. Verificar leads recentes
console.log('\n--- 3. Leads Recentes ---');
const { data: leads, error: leadsError } = await supabase
  .from('leads')
  .select('id, name, email, phone, status, assigned_to, created_at')
  .order('created_at', { ascending: false })
  .limit(5);

if (leadsError) {
  console.log('Erro ao buscar leads:', leadsError.message);
} else {
  console.log(`Total de leads recentes: ${leads.length}`);
  leads.forEach(l => {
    console.log(`  - ${l.name} | status: ${l.status} | assigned_to: ${l.assigned_to}`);
  });
}

// 4. Verificar convites de vendedor
console.log('\n--- 4. Convites Recentes ---');
const { data: invites, error: invitesError } = await supabase
  .from('seller_invites')
  .select('id, email, franchise_id, used, created_at')
  .order('created_at', { ascending: false })
  .limit(5);

if (invitesError) {
  console.log('Erro ao buscar invites:', invitesError.message);
} else {
  console.log(`Total de convites recentes: ${invites.length}`);
  invites.forEach(i => {
    console.log(`  - ${i.email} | franchise_id: ${i.franchise_id} | used: ${i.used}`);
  });
}

console.log('\n=== Fim do Teste ===');
