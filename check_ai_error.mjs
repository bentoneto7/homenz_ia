import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const { data, error } = await supabase
  .from('ai_results')
  .select('id, processing_status, error_message, lead_id, created_at, updated_at')
  .order('id', { ascending: false })
  .limit(5);

console.log('AI results:', JSON.stringify(data, null, 2));
if (error) console.log('Error:', error);
process.exit(0);
