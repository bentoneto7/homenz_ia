/**
 * Script para adicionar colunas no Supabase via API Management
 * Executa SQL diretamente no banco de dados
 */

const PROJECT_REF = "hjdgmbvehduhctsovtga";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;

if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL");
  process.exit(1);
}

// Verificar colunas atuais
async function checkColumns() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*&limit=1`, {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
  });
  const data = await res.json();
  if (Array.isArray(data) && data.length > 0) {
    return Object.keys(data[0]);
  }
  return [];
}

// Executar SQL via Supabase Management API
async function execSQL(sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  const text = await res.text();
  return { status: res.status, body: text };
}

async function main() {
  console.log("🔍 Checking existing columns...");
  const cols = await checkColumns();
  console.log("Existing columns:", cols);

  const hasInstagram = cols.includes("instagram_handle");
  const hasAddress = cols.includes("address");
  const hasStripe = cols.includes("stripe_customer_id");
  const hasPlan = cols.includes("plan_id");

  if (hasInstagram && hasAddress && hasStripe && hasPlan) {
    console.log("✅ All columns already exist! No migration needed.");
    return;
  }

  console.log("📝 Adding missing columns...");

  // Tentar via Management API
  const sql = `
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';

ALTER TABLE franchises
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
  `;

  const result = await execSQL(sql);
  console.log("Management API result:", result.status, result.body.substring(0, 200));

  if (result.status !== 200) {
    console.log("\n⚠️  Management API failed. Trying direct insert test...");
    
    // Tentar inserir com as novas colunas para ver se já existem
    const testRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name: "MigrationTest",
        email: "migration_test_xyz@test.com",
        password_hash: "test",
        role: "seller",
        instagram_handle: "test_ig",
        address: "test_addr",
        active: false,
      }),
    });
    
    const testData = await testRes.json();
    console.log("Test insert status:", testRes.status);
    
    if (testRes.status === 201) {
      console.log("✅ Columns already exist (insert succeeded)!");
      // Cleanup
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?email=eq.migration_test_xyz@test.com`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          apikey: SERVICE_ROLE_KEY,
        },
      });
    } else {
      console.log("❌ Columns don't exist:", JSON.stringify(testData));
      console.log("\n📋 Please run this SQL manually in Supabase SQL Editor:");
      console.log("https://supabase.com/dashboard/project/hjdgmbvehduhctsovtga/editor");
      console.log("\n" + sql);
    }
  } else {
    console.log("✅ Migration successful!");
    
    // Verify
    const newCols = await checkColumns();
    console.log("New columns:", newCols);
  }
}

main().catch(console.error);
