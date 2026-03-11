/**
 * Supabase Schema Migration
 * Adiciona colunas necessárias via API REST do Supabase
 * Roda automaticamente no startup do servidor
 */
import { supabaseAdmin } from "./supabase";

export async function runSupabaseMigration() {
  try {
    // Verificar se as colunas já existem tentando uma query
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) {
      console.log("[Migration] Could not connect to Supabase profiles:", error.message);
      return;
    }

    // Verificar se instagram_handle existe
    const { error: checkError } = await supabaseAdmin
      .from("profiles")
      .select("instagram_handle")
      .limit(1);

    if (!checkError) {
      console.log("[Migration] Supabase columns already exist, skipping migration.");
      return;
    }

    console.log("[Migration] Adding missing columns to Supabase profiles table...");

    // Usar a função pg_catalog via RPC para executar DDL
    // Alternativa: criar as colunas via uma stored procedure
    // Como não temos acesso direto ao SQL, vamos criar uma função RPC primeiro

    // Tentar criar a função exec_ddl se não existir
    const createFnResult = await (supabaseAdmin as any).rpc("exec_ddl", {
      ddl: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
        ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';
        
        ALTER TABLE franchises
        ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
      `,
    });

    if (createFnResult.error) {
      console.log("[Migration] exec_ddl RPC not available:", createFnResult.error.message);
      console.log("[Migration] ⚠️  Please run the following SQL manually in Supabase SQL Editor:");
      console.log("[Migration] https://supabase.com/dashboard/project/hjdgmbvehduhctsovtga/editor");
      console.log(`[Migration] SQL:
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS plan_id TEXT DEFAULT 'free';

ALTER TABLE franchises
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
      `);
    } else {
      console.log("[Migration] ✅ Supabase columns added successfully!");
    }
  } catch (err) {
    console.error("[Migration] Error:", err);
  }
}
