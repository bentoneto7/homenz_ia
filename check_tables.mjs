import { createClient } from '@supabase/supabase-js';

const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const tables = ['pixel_center', 'franchise_pixels', 'pixels', 'franchise_settings', 'pixel_events'];
for (const t of tables) {
  const { data, error } = await s.from(t).select('*').limit(1);
  if (error) {
    console.log(`Tabela ${t}: NÃO EXISTE - ${error.message.slice(0, 60)}`);
  } else {
    const cols = data && data.length > 0 ? Object.keys(data[0]).join(', ') : '(vazia)';
    console.log(`Tabela ${t}: OK - ${cols}`);
  }
}
