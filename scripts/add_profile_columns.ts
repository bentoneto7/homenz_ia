import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('Checking existing columns in profiles table...');
  
  const { data: cols, error: colErr } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (colErr) {
    console.error('Error querying profiles:', colErr.message);
    return;
  }
  
  if (cols && cols.length > 0) {
    console.log('Existing columns:', Object.keys(cols[0]));
    const hasInstagram = 'instagram_handle' in cols[0];
    const hasAddress = 'address' in cols[0];
    console.log('Has instagram_handle:', hasInstagram);
    console.log('Has address:', hasAddress);
    
    if (hasInstagram && hasAddress) {
      console.log('✅ Columns already exist! No migration needed.');
      return;
    }
  }
  
  console.log('Columns missing. Need to add them via Supabase dashboard.');
  console.log('Please run this SQL in Supabase SQL Editor:');
  console.log(`
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';

ALTER TABLE franchises
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
  `);
}

main().catch(console.error);
