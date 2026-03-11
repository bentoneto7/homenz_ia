/**
 * Executa migração via o servidor Express local
 * O servidor tem acesso ao Supabase via service role key
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log("Verificando estrutura atual da tabela profiles...");

// Verificar colunas existentes
const { data: cols, error: colsErr } = await sb
  .from("information_schema.columns")
  .select("column_name")
  .eq("table_name", "profiles")
  .eq("table_schema", "public");

if (colsErr) {
  console.log("Erro ao verificar colunas:", colsErr.message);
  
  // Tentar inserir um registro com as novas colunas para forçar o erro
  // e ver quais colunas faltam
  const { error: insertErr } = await sb.from("profiles").insert({
    id: "test-migration-check",
    name: "Test",
    email: "test@test.com",
    role: "franchisee",
    whatsapp: "test",
    instagram_handle: "test",
    address: "test",
    stripe_customer_id: "test",
    plan_id: "free",
    subscription_status: "inactive",
    active: false,
    password_hash: "test",
  });
  
  if (insertErr) {
    console.log("Colunas faltando:", insertErr.message);
  }
} else {
  const existingCols = cols?.map(c => c.column_name) || [];
  console.log("Colunas existentes:", existingCols.join(", "));
  
  const needed = ["whatsapp", "instagram_handle", "address", "stripe_customer_id", "stripe_subscription_id", "plan_id", "subscription_status"];
  const missing = needed.filter(c => !existingCols.includes(c));
  console.log("Colunas faltando:", missing.join(", ") || "nenhuma");
}

// Tentar usar o Supabase Storage API para executar SQL (workaround)
// Usar a API de funções Edge do Supabase para executar SQL
console.log("\nTentando via Supabase Edge Functions...");
const edgeResponse = await fetch(`${supabaseUrl}/functions/v1/migrate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${serviceKey}`,
  },
  body: JSON.stringify({
    sql: "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT",
  }),
});
console.log("Edge function status:", edgeResponse.status);
const edgeText = await edgeResponse.text();
console.log("Edge function response:", edgeText.substring(0, 200));
