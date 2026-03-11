import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Extrair o project ref da URL do Supabase
// Ex: https://abcdef.supabase.co -> abcdef
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];
console.log("Project ref:", projectRef);

const sql = `
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive';
`;

// Usar a API REST do Supabase para executar SQL
const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": serviceKey,
    "Authorization": `Bearer ${serviceKey}`,
  },
  body: JSON.stringify({ query: sql }),
});

if (!response.ok) {
  const text = await response.text();
  console.log("RPC exec_sql falhou:", text);
  
  // Tentar via Management API do Supabase
  console.log("\nTentando via Management API...");
  const mgmtResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  
  if (!mgmtResponse.ok) {
    const mgmtText = await mgmtResponse.text();
    console.log("Management API também falhou:", mgmtText);
    
    // Última tentativa: adicionar uma coluna por vez via INSERT com ON CONFLICT
    console.log("\nTentando adicionar colunas via upsert com campo extra...");
    
    // Verificar se as colunas existem tentando inserir um registro de teste
    const sb = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    // Tentar adicionar as colunas via SQL direto no Supabase
    // usando o endpoint /rest/v1/ com query params
    const queries = [
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram_handle TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free'",
      "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive'",
    ];
    
    for (const q of queries) {
      const r = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": serviceKey,
          "Authorization": `Bearer ${serviceKey}`,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ query: q }),
      });
      console.log(`  ${q.substring(0, 60)}... -> ${r.status}`);
    }
  } else {
    const mgmtData = await mgmtResponse.json();
    console.log("Management API OK:", JSON.stringify(mgmtData));
  }
} else {
  const data = await response.json();
  console.log("OK:", JSON.stringify(data));
}

console.log("\nVerificando colunas...");
const sb = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await sb.from("profiles").select("whatsapp, instagram_handle, address, stripe_customer_id, plan_id").limit(1);
if (error) {
  console.log("Colunas ainda não existem:", error.message);
} else {
  console.log("Colunas existem! Dados:", JSON.stringify(data));
}
