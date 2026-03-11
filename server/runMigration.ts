/**
 * Migração automática: cria tabelas seller_invites e landing_pages se não existirem
 * Executa via supabaseAdmin (service role key) no startup do servidor
 */
import { supabaseAdmin } from "./supabase";

export async function runMigrations() {
  console.log("[Migration] Verificando tabelas...");

  // Verificar se seller_invites existe
  const { error: siError } = await supabaseAdmin
    .from("seller_invites")
    .select("id")
    .limit(0);

  if (siError && siError.message.includes("does not exist")) {
    console.log("[Migration] Criando tabela seller_invites...");
    // Usar a API de administração para criar a tabela via SQL
    await createSellerInvitesTable();
  } else {
    console.log("[Migration] seller_invites: OK");
  }

  // Verificar se landing_pages existe
  const { error: lpError } = await supabaseAdmin
    .from("landing_pages")
    .select("id")
    .limit(0);

  if (lpError && lpError.message.includes("does not exist")) {
    console.log("[Migration] Criando tabela landing_pages...");
    await createLandingPagesTable();
  } else {
    console.log("[Migration] landing_pages: OK");
  }

  console.log("[Migration] Concluído.");
}

async function createSellerInvitesTable() {
  // Usar fetch direto para o endpoint SQL do Supabase
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const sql = `
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
    CREATE INDEX IF NOT EXISTS idx_seller_invites_franchise_id ON public.seller_invites(franchise_id);
    CREATE INDEX IF NOT EXISTS idx_seller_invites_token ON public.seller_invites(token);
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // Tentar via pg endpoint
      const pgResponse = await fetch(`${supabaseUrl}/pg/query`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      
      if (!pgResponse.ok) {
        console.log("[Migration] Não foi possível criar seller_invites via API. Tabela será criada manualmente.");
      }
    } else {
      console.log("[Migration] seller_invites criada com sucesso!");
    }
  } catch (e) {
    console.log("[Migration] Erro ao criar seller_invites:", (e as Error).message);
  }
}

async function createLandingPagesTable() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const sql = `
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
    CREATE INDEX IF NOT EXISTS idx_landing_pages_franchise_id ON public.landing_pages(franchise_id);
    CREATE INDEX IF NOT EXISTS idx_landing_pages_slug ON public.landing_pages(slug);
  `;

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      console.log("[Migration] Não foi possível criar landing_pages via API.");
    } else {
      console.log("[Migration] landing_pages criada com sucesso!");
    }
  } catch (e) {
    console.log("[Migration] Erro ao criar landing_pages:", (e as Error).message);
  }
}
