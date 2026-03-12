// Apply migration using the same Supabase client as the project
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Try to add column by attempting to update a row with pixel_id
// This won't work for DDL, but let's verify the current state

// Check if column exists
const { data: check, error: checkErr } = await supabase
  .from('franchises')
  .select('id, pixel_id')
  .limit(1);

if (checkErr && checkErr.message.includes('pixel_id')) {
  console.log('Column pixel_id does not exist. Need to apply migration manually.');
  console.log('\n=== MIGRATION SQL TO RUN IN SUPABASE DASHBOARD ===');
  console.log(`
-- Run this in Supabase SQL Editor:
ALTER TABLE franchises ADD COLUMN IF NOT EXISTS pixel_id TEXT;
ALTER TABLE franchise_landing_pages ADD COLUMN IF NOT EXISTS pixel_id TEXT;
  `);
  console.log('=== END OF MIGRATION SQL ===\n');
  
  // Try one more approach: use the Supabase REST API with a custom header
  // to bypass the schema cache
  const resp = await fetch(`${supabaseUrl}/rest/v1/franchises?select=id,pixel_id&limit=1`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    }
  });
  const text = await resp.text();
  console.log('Direct REST check:', resp.status, text.substring(0, 200));
} else if (!checkErr) {
  console.log('pixel_id column already exists in franchises!');
  console.log('Sample data:', check);
} else {
  console.log('Unexpected error:', checkErr);
}

// Check franchise_landing_pages
const { data: lpCheck, error: lpErr } = await supabase
  .from('franchise_landing_pages')
  .select('id, pixel_id')
  .limit(1);

if (lpErr && lpErr.message.includes('pixel_id')) {
  console.log('Column pixel_id does not exist in franchise_landing_pages.');
} else if (!lpErr) {
  console.log('pixel_id column already exists in franchise_landing_pages!');
}
