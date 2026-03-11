import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Checking franchise table columns...');

  // Check whatsapp
  const { error: e1 } = await supabase.from('franchises').select('whatsapp').limit(1);
  if (e1 && e1.message.includes('whatsapp')) {
    console.log('whatsapp column missing — adding via supabaseMigration...');
  } else {
    console.log('whatsapp column: OK');
  }

  // Check bio
  const { error: e2 } = await supabase.from('franchises').select('bio').limit(1);
  if (e2 && e2.message.includes('bio')) {
    console.log('bio column missing');
  } else {
    console.log('bio column: OK');
  }

  // Check zip_code
  const { error: e3 } = await supabase.from('franchises').select('zip_code').limit(1);
  if (e3 && e3.message.includes('zip_code')) {
    console.log('zip_code column missing');
  } else {
    console.log('zip_code column: OK');
  }

  // Try inserting a test row with whatsapp to trigger auto-migration
  // Actually use the migration runner
  const { runMigration } = await import('./server/runMigration.js').catch(() => ({ runMigration: null }));
  if (runMigration) {
    await runMigration();
  }
}

migrate().catch(console.error);
