import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Try to insert into franchise_pixels to see if it exists
const { error } = await supabase.from('franchise_pixels').select('id').limit(1);
console.log('franchise_pixels exists?', !error, error?.message);

// Try to use the Supabase REST API to create the table
// via a special endpoint
const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/franchise_pixels`, {
  method: 'POST',
  headers: {
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  },
  body: JSON.stringify({ franchise_id: '00000000-0000-0000-0000-000000000000', pixel_id: 'test' }),
});
console.log('POST status:', resp.status, await resp.text());
