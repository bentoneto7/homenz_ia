import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Listar todas as tabelas conhecidas do projeto
const tables = [
  'franchises', 'profiles', 'leads', 'franchise_landing_pages',
  'franchise_round_robin', 'lead_events', 'appointments',
  'access_invites', 'pixel_events_log', 'lead_timeline',
  'pixel_tracking', 'franchise_pixel', 'pixel_config'
];

console.log('=== AUDITORIA DE SCHEMA SUPABASE ===\n');
for (const t of tables) {
  const { data, error } = await s.from(t).select('*').limit(1);
  if (error) {
    if (error.message.includes('does not exist') || error.message.includes('not find')) {
      console.log(`❌ ${t}: NÃO EXISTE`);
    } else {
      console.log(`⚠️  ${t}: ERRO - ${error.message.slice(0, 80)}`);
    }
  } else {
    const cols = data && data.length > 0 ? Object.keys(data[0]).join(', ') : '(vazia - sem dados)';
    console.log(`✅ ${t}: ${cols}`);
  }
}
