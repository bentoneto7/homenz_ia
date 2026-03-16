import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { leadId, landingPageId, franchiseId } = await req.json();

    if (!leadId || !franchiseId) {
      return new Response(JSON.stringify({ error: "leadId and franchiseId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar vendedores ativos vinculados à landing page (ou todos da franquia)
    let sellers: Array<{ id: string; name: string; lead_count: number }> = [];

    if (landingPageId) {
      // Vendedores específicos da LP
      const { data: lpSellers } = await supabase
        .from("landing_page_sellers")
        .select("seller_id, sellers(id, name, active)")
        .eq("landing_page_id", landingPageId);

      sellers = (lpSellers ?? [])
        .filter((s) => (s.sellers as Record<string, unknown>)?.active)
        .map((s) => ({
          id: (s.sellers as Record<string, unknown>).id as string,
          name: (s.sellers as Record<string, unknown>).name as string,
          lead_count: 0,
        }));
    }

    // Fallback: todos os vendedores ativos da franquia
    if (sellers.length === 0) {
      const { data: allSellers } = await supabase
        .from("sellers")
        .select("id, name")
        .eq("franchise_id", franchiseId)
        .eq("active", true);
      sellers = (allSellers ?? []).map((s) => ({ ...s, lead_count: 0 }));
    }

    if (sellers.length === 0) {
      // Sem vendedores — lead fica sem atribuição
      return new Response(
        JSON.stringify({ assigned: false, message: "No active sellers found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round-robin: contar leads de hoje para cada vendedor
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const seller of sellers) {
      const { count } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("assigned_seller_id", seller.id)
        .gte("created_at", today.toISOString());
      seller.lead_count = count ?? 0;
    }

    // Atribuir ao vendedor com menos leads hoje
    sellers.sort((a, b) => a.lead_count - b.lead_count);
    const assignedSeller = sellers[0];

    // Atualizar o lead
    await supabase
      .from("leads")
      .update({
        assigned_seller_id: assignedSeller.id,
        status: "assigned",
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId);

    // Registrar no log de distribuição
    await supabase.from("lead_distribution_log").insert({
      lead_id: leadId,
      seller_id: assignedSeller.id,
      franchise_id: franchiseId,
      landing_page_id: landingPageId ?? null,
      distributed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        assigned: true,
        sellerId: assignedSeller.id,
        sellerName: assignedSeller.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
