import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
    apiVersion: "2023-10-16",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    return new Response("Missing signature or webhook secret", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed: ${err}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const franchiseId = session.metadata?.franchise_id;
        const planId = session.metadata?.plan_id;

        if (franchiseId) {
          // Buscar plano para saber duração
          const { data: plan } = await supabase
            .from("plans")
            .select("duration_days, name")
            .eq("id", planId ?? "")
            .maybeSingle();

          const durationDays = (plan as Record<string, unknown>)?.duration_days as number ?? 30;
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + durationDays);

          await supabase
            .from("franchises")
            .update({
              subscription_status: "active",
              subscription_plan_id: planId ?? null,
              subscription_expires_at: expiresAt.toISOString(),
              stripe_subscription_id: session.subscription as string ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", franchiseId);

          // Registrar pagamento
          await supabase.from("payments").insert({
            franchise_id: franchiseId,
            stripe_session_id: session.id,
            stripe_subscription_id: session.subscription as string ?? null,
            amount: (session.amount_total ?? 0) / 100,
            currency: session.currency ?? "brl",
            status: "paid",
            plan_id: planId ?? null,
            paid_at: new Date().toISOString(),
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: franchise } = await supabase
          .from("franchises")
          .select("id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (franchise) {
          await supabase
            .from("franchises")
            .update({
              subscription_status: "cancelled",
              updated_at: new Date().toISOString(),
            })
            .eq("id", (franchise as Record<string, unknown>).id as string);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const { data: franchise } = await supabase
            .from("franchises")
            .select("id")
            .eq("stripe_subscription_id", invoice.subscription as string)
            .maybeSingle();

          if (franchise) {
            await supabase
              .from("franchises")
              .update({
                subscription_status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("id", (franchise as Record<string, unknown>).id as string);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Handler error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
