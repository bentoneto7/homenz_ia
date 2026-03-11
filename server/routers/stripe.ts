import { z } from "zod";
import Stripe from "stripe";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../_core/trpc";
import { HOMENZ_PLANS, type PlanId } from "../stripe/products";
import { supabaseAdmin } from "../supabase";
import { publicProcedure as pp } from "../_core/trpc";
import { verifyToken } from "../supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
});

// ── Middleware de autenticação Homenz para Stripe ────────────────────────────

const homenzProcedure = pp.use(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");
  if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token não fornecido" });

  const user = await verifyToken(token);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido" });

  return next({ ctx: { ...ctx, homenzUser: user } });
});

// ── Router ───────────────────────────────────────────────────────────────────

export const stripeRouter = router({
  // Retorna os planos disponíveis (público)
  getPlans: publicProcedure.query(() => {
    return Object.values(HOMENZ_PLANS);
  }),

  // Cria uma sessão de checkout Stripe para franqueados Homenz
  // Aceita tanto usuário logado (via token) quanto email direto (para novos cadastros)
  createCheckout: publicProcedure
    .input(z.object({
      planId: z.enum(["starter", "pro", "network"]),
      origin: z.string().url(),
      email: z.string().email().optional(), // Email para novos cadastros sem login
    }))
    .mutation(async ({ ctx, input }) => {
      const plan = HOMENZ_PLANS[input.planId as PlanId];
      if (!plan) throw new TRPCError({ code: "BAD_REQUEST", message: "Plano inválido" });

      // Tentar obter usuário pelo token Homenz
      let homenzUser = null;
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        homenzUser = await verifyToken(token);
      }

      // Determinar email para o checkout
      const customerEmail = homenzUser?.email ?? input.email;
      if (!customerEmail) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Email obrigatório para o checkout" });
      }

      // Buscar perfil pelo email se não temos o usuário logado
      let profileId: string | null = null;
      if (homenzUser) {
        profileId = homenzUser.id;
      } else if (input.email) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", input.email.toLowerCase())
          .single();
        profileId = profile?.id ?? null;
      }

      // Criar sessão de checkout
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        customer_email: customerEmail,
        line_items: [
          {
            price_data: {
              currency: "brl",
              product_data: {
                name: plan.name,
                description: plan.description,
              },
              unit_amount: plan.price,
              recurring: { interval: plan.interval },
            },
            quantity: 1,
          },
        ],
        client_reference_id: profileId ?? customerEmail,
        metadata: {
          profile_id: profileId ?? "",
          plan_id: input.planId,
          customer_email: customerEmail,
          customer_name: homenzUser?.name ?? "",
        },
        success_url: `${input.origin}/franqueado?pagamento=sucesso`,
        cancel_url: `${input.origin}/planos?cancelado=1`,
        subscription_data: {
          trial_period_days: 15,
          metadata: {
            profile_id: profileId ?? "",
            plan_id: input.planId,
          },
        },
      });

      return { checkoutUrl: session.url! };
    }),

  // Retorna o status da assinatura do usuário logado
  getSubscription: homenzProcedure.query(async ({ ctx }) => {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, plan_id")
      .eq("id", ctx.homenzUser.id)
      .single();

    return {
      active: ctx.homenzUser.active,
      plan: profile?.plan_id ?? "free",
    };
  }),
});
