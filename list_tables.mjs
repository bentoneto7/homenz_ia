import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const tables = ['profiles', 'franchises', 'franchise_landing_pages', 'leads', 'lead_events', 
  'lead_distribution_log', 'seller_assignments', 'access_invites', 'user_sessions',
  'franchise_notes', 'franchise_config', 'app_config', 'kv_store', 'franchise_pixels'];

for (const t of tables) {
  const { error } = await supabase.from(t).select('id').limit(1);
  if (!error) {
    console.log('EXISTS:', t);
  }
}
console.log('Done checking tables');
