import { createClient } from '../node_modules/@supabase/supabase-js/dist/index.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing SQL endpoints...');
console.log('URL:', SUPABASE_URL?.substring(0, 40));

// Tentar criar tabelas via diferentes endpoints
const SQL_CREATE = `
CREATE TABLE IF NOT EXISTS public.seller_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  email TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  used BOOLEAN NOT NULL DEFAULT false,
  used_by UUID REFERENCES public.profiles(id),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id UUID NOT NULL REFERENCES public.franchises(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  cta_text TEXT DEFAULT 'Quero Agendar Avaliação Gratuita',
  hero_image_url TEXT,
  video_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  views INTEGER NOT NULL DEFAULT 0,
  leads_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

const endpoints = [
  { url: '/rest/v1/rpc/exec_sql', body: { sql: SQL_CREATE } },
  { url: '/pg/query', body: { query: SQL_CREATE } },
  { url: '/rest/v1/rpc/run_sql', body: { sql: SQL_CREATE } },
];

for (const ep of endpoints) {
  try {
    const r = await fetch(`${SUPABASE_URL}${ep.url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(ep.body),
    });
    const text = await r.text();
    console.log(`${ep.url}: ${r.status} - ${text.substring(0, 150)}`);
    if (r.ok) {
      console.log('✅ SUCCESS! Tables created via', ep.url);
      break;
    }
  } catch(e) {
    console.log(`${ep.url}: ERROR - ${e.message}`);
  }
}

// Verificar se as tabelas foram criadas
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
for (const table of ['seller_invites', 'landing_pages']) {
  const { error } = await supabase.from(table).select('id').limit(0);
  console.log(`${table}: ${error ? '❌ ' + error.message.substring(0, 50) : '✅ EXISTS'}`);
}
