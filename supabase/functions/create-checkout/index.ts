import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { planId, successUrl, cancelUrl } = await req.json();

    // Buscar plano no banco
    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .maybeSingle();

    if (!plan) {
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar ou criar customer Stripe
    const { data: franchise } = await supabase
      .from("franchises")
      .select("id, name, stripe_customer_id")
      .eq("owner_id", user.id)
      .maybeSingle();

    let customerId = (franchise as Record<string, unknown>)?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: (franchise as Record<string, unknown>)?.name as string ?? user.email,
        metadata: { franchise_id: (franchise as Record<string, unknown>)?.id as string ?? "", user_id: user.id },
      });
      customerId = customer.id;

      // Salvar customer_id
      if (franchise) {
        await supabase
          .from("franchises")
          .update({ stripe_customer_id: customerId })
          .eq("id", (franchise as Record<string, unknown>).id as string);
      }
    }

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: (plan as Record<string, unknown>).stripe_price_id as string,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl ?? `${req.headers.get("origin")}/franqueado?pagamento=sucesso`,
      cancel_url: cancelUrl ?? `${req.headers.get("origin")}/planos`,
      metadata: {
        franchise_id: (franchise as Record<string, unknown>)?.id as string ?? "",
        user_id: user.id,
        plan_id: planId,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
