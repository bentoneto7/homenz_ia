/**
 * Stripe Webhook Handler
 * Ativa a conta do franqueado após confirmação do pagamento
 */
import type { Request, Response } from "express";
import Stripe from "stripe";
import { supabaseAdmin } from "./supabase";
import { notifyOwner } from "./_core/notification";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Mapeamento de plan_id → plano da franquia (valores usados no banco Supabase)
const PLAN_MAP: Record<string, string> = {
  starter: "starter",
  pro: "pro",
  network: "network",
  free: "free",
};

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  // Verificar assinatura do webhook
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", message);
    return res.status(400).json({ error: `Webhook Error: ${message}` });
  }

  // Detectar eventos de teste
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Stripe Webhook] Error processing event:", err);
    return res.status(500).json({ error: "Internal server error" });
  }

  return res.json({ received: true });
}

// ── Handlers de eventos ──────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const profileId = session.metadata?.profile_id;
  const planId = session.metadata?.plan_id ?? "starter";
  const customerEmail = session.metadata?.customer_email ?? session.customer_email;

  console.log(`[Stripe Webhook] Checkout completed for profile: ${profileId}, email: ${customerEmail}, plan: ${planId}`);

  if (!profileId && !customerEmail) {
    console.error("[Stripe Webhook] No profile_id or email in session metadata");
    return;
  }

  // Buscar perfil pelo ID ou email
  let profileData: { id: string; name: string; email: string; franchise_id: string | null } | null = null;
  let profileError: { message: string } | null = null;

  if (profileId) {
    const result = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, franchise_id")
      .eq("id", profileId)
      .single();
    profileData = result.data as typeof profileData;
    profileError = result.error;
  } else if (customerEmail) {
    const result = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, franchise_id")
      .eq("email", customerEmail.toLowerCase())
      .single();
    profileData = result.data as typeof profileData;
    profileError = result.error;
  }

  const profile = profileData;
  const error = profileError;

  if (error || !profile) {
    console.error("[Stripe Webhook] Profile not found:", error?.message);
    return;
  }

  // Cast para tipo concreto após guard de null
  const p = profile as { id: string; name: string; email: string; franchise_id: string | null };
  const franchisePlan = PLAN_MAP[planId] ?? "free";

  // Ativar perfil do franqueado
  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.id);

  if (profileErr) {
    console.error("[Stripe Webhook] Error activating profile:", profileErr.message);
    return;
  }

  // Ativar franquia e atualizar plano — zerar trial_ends_at para liberar o painel
  if (p.franchise_id) {
    // Salvar stripe_subscription_id se disponível na sessão
    const subscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as { id?: string } | null)?.id ?? null;

    const franchiseUpdate: Record<string, unknown> = {
      active: true,
      plan: franchisePlan,
      trial_ends_at: null, // Zerar trial — conta paga, painel liberado
      updated_at: new Date().toISOString(),
    };
    if (subscriptionId) {
      franchiseUpdate.stripe_subscription_id = subscriptionId;
    }

    const { error: franchiseErr } = await supabaseAdmin
      .from("franchises")
      .update(franchiseUpdate)
      .eq("id", p.franchise_id);

    if (franchiseErr) {
      console.error("[Stripe Webhook] Error activating franchise:", franchiseErr.message);
    }
  }

  // p já está definido acima
  console.log(`[Stripe Webhook] ✅ Profile ${p.id} (${p.email}) activated with plan: ${franchisePlan}`);

  // Notificar o dono da rede
  try {
    await notifyOwner({
      title: "Nova franquia ativada!",
      content: `${p.name} (${p.email}) ativou a conta com o plano ${planId.toUpperCase()}.`,
    });
  } catch (err) {
    console.error("[Stripe Webhook] Error sending notification:", err);
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const profileId = sub.metadata?.profile_id;
  if (!profileId) return;

  const isActive = sub.status === "active" || sub.status === "trialing";
  const planId = sub.metadata?.plan_id ?? "starter";
  const franchisePlan = PLAN_MAP[planId] ?? "free";

  // Atualizar status do perfil
  await supabaseAdmin
    .from("profiles")
    .update({ active: isActive, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  // Atualizar plano da franquia
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("franchise_id")
    .eq("id", profileId)
    .single();

  if (profile?.franchise_id) {
    await supabaseAdmin
      .from("franchises")
      .update({
        active: isActive,
        plan: franchisePlan,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.franchise_id);
  }

  console.log(`[Stripe Webhook] Subscription updated for profile ${profileId}: ${sub.status}`);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const profileId = sub.metadata?.profile_id;
  if (!profileId) return;

  // Desativar perfil
  await supabaseAdmin
    .from("profiles")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", profileId);

  // Desativar franquia
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("franchise_id, name, email")
    .eq("id", profileId)
    .single();

  if (profile?.franchise_id) {
    await supabaseAdmin
      .from("franchises")
      .update({ active: false, plan: "free", updated_at: new Date().toISOString() })
      .eq("id", profile.franchise_id);
  }

  console.log(`[Stripe Webhook] Subscription deleted for profile ${profileId}`);

  try {
    await notifyOwner({
      title: "Franquia cancelou assinatura",
      content: `${profile?.name} (${profile?.email}) cancelou a assinatura.`,
    });
  } catch (err) {
    console.error("[Stripe Webhook] Error sending cancellation notification:", err);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  console.log(`[Stripe Webhook] Payment failed for customer: ${customerId}`);
  // Não desativar imediatamente — aguardar retentativas do Stripe
}
