/**
 * Adiciona colunas extras na tabela profiles do Supabase
 * usando conexão direta ao PostgreSQL via DATABASE_URL
 */
import pg from "pg";
import "dotenv/config";

// O Supabase expõe uma connection string PostgreSQL direta
// Formato: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
// Podemos construir a partir da SUPABASE_URL e SERVICE_ROLE_KEY
const supabaseUrl = process.env.SUPABASE_URL;
const projectRef = supabaseUrl.replace("https://", "").split(".")[0];

// A senha do banco é a service role key
const dbUrl = `postgresql://postgres.${projectRef}:${process.env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`;

console.log("Conectando ao banco...");
console.log("Project ref:", projectRef);

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  console.log("Conectado!");

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
    try {
      await client.query(q);
      console.log(`✓ ${q.substring(0, 70)}`);
    } catch (e) {
      console.log(`  Skipped (${e.message.substring(0, 60)})`);
    }
  }

  // Verificar
  const result = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name IN ('whatsapp','instagram_handle','address','stripe_customer_id','plan_id') ORDER BY column_name"
  );
  console.log("\nColunas existentes:", result.rows.map(r => r.column_name).join(", "));
} catch (e) {
  console.error("Erro:", e.message);
} finally {
  await client.end();
}
