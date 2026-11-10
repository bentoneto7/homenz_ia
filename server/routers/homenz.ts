import { z } from "zod/v4";
import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  loginUser,
  verifyToken,
  hashPassword,
  getProfileById,
  getFranchiseById,
  getAllFranchises,
  getSellersByFranchise,
  getLeadsByFranchise,
  getLeadsBySeller,
  getSellerMetrics,
  getAllSellerMetrics,
  addLeadEvent,
  getLeadTimeline,
  createInvite,
  getNetworkStats,
  supabaseAdmin,
  type UserRole,
} from "../supabase";

// ── Middleware de autenticação Supabase ──────────────────────────────────────

const supabaseProcedure = publicProcedure.use(async ({ ctx, next }) => {
  const authHeader = ctx.req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "") || 
    (ctx.req as { cookies?: Record<string, string> }).cookies?.["homenz_token"];

  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token não fornecido" });
  }

  const user = await verifyToken(token);
  if (!user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Token inválido ou expirado" });
  }

  return next({ ctx: { ...ctx, homenzUser: user } });
});

const ownerProcedure = supabaseProcedure.use(({ ctx, next }) => {
  if (ctx.homenzUser.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao dono da rede" });
  }
  return next({ ctx });
});

const franchiseeProcedure = supabaseProcedure.use(({ ctx, next }) => {
  if (!["owner", "franchisee"].includes(ctx.homenzUser.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a franqueados" });
  }
  return next({ ctx });
});

// ── Temperatura por AÇÃO (decisão Bento 17/06) ───────────────────────────────
// Régua canônica idêntica à do front (client/src/lib/leadTemperature.ts ->
// getActionTemperature) e à reimplementação inline do sellerDashboard:
//   hot  = agendou (funnel_step scheduled/confirmed/completed ou appointment_at)
//   warm = chegou na foto/IA (photos_*/ai_*/schedule_started ou tem photo_url), sem agendar
//   cold = abandonou antes das fotos
// O tempo só ESFRIA (nunca esquenta) leads ainda não atendidos: MORNO parado
// > 24h e sem atendimento cai para FRIO. Desfecho de atendimento (resolved/closed_*)
// some da disputa de atenção -> cold. Centralizado aqui pra franchiseeStats,
// networkStats e sellerDashboard usarem a MESMA régua.
const SCHEDULED_STEPS = new Set(["scheduled", "confirmed", "completed"]);
const PHOTO_OR_DEEPER_STEPS = new Set([
  "photos_started", "photos_uploaded", "photos_done", "photos_completed",
  "ai_processing", "ai_ready", "ai_done", "ai_failed", "schedule_started",
]);

type ActionTempLead = {
  funnel_step?: string | null;
  appointment_at?: string | null;
  photo_url?: string | null;
  attendance_status?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
};

function actionTemperature(lead: ActionTempLead, now = Date.now()): "hot" | "warm" | "cold" {
  // Desfecho de atendimento: não disputa mais atenção.
  if (lead.attendance_status && !["open", "in_progress"].includes(lead.attendance_status)) {
    return "cold";
  }
  const step = lead.funnel_step ?? "";
  let temp: "hot" | "warm" | "cold";
  if (lead.appointment_at || SCHEDULED_STEPS.has(step)) temp = "hot";
  else if (PHOTO_OR_DEEPER_STEPS.has(step) || lead.photo_url) temp = "warm";
  else temp = "cold";
  // Decaimento por inatividade: QUENTE nunca esfria; MORNO parado > 24h e sem
  // atendimento cai para FRIO.
  if (temp === "warm" && (!lead.attendance_status || lead.attendance_status === "open")) {
    const ref = new Date(lead.last_activity_at ?? lead.created_at ?? now).getTime();
    if ((now - ref) / 3_600_000 > 24) temp = "cold";
  }
  return temp;
}

// Conjuntos de funnel_step equivalentes (TiDB + Supabase) para contar marcos do
// funil sem perder leads por nomes diferentes do mesmo estágio.
const STEP_CHAT_STARTED = new Set([
  "chat_started", "chat_done", "chat_completed",
  "photos_started", "photos_uploaded", "photos_done", "photos_completed",
  "ai_processing", "ai_ready", "ai_done", "ai_failed",
  "schedule_started", "scheduled", "confirmed", "completed",
]);
const STEP_CHAT_DONE = new Set([
  "chat_done", "chat_completed",
  "photos_started", "photos_uploaded", "photos_done", "photos_completed",
  "ai_processing", "ai_ready", "ai_done", "ai_failed",
  "schedule_started", "scheduled", "confirmed", "completed",
]);
const STEP_PHOTOS = new Set([
  "photos_started", "photos_uploaded", "photos_done", "photos_completed",
  "ai_processing", "ai_ready", "ai_done", "ai_failed",
  "schedule_started", "scheduled", "confirmed", "completed",
]);
const STEP_AI = new Set([
  "ai_processing", "ai_ready", "ai_done", "ai_failed",
  "schedule_started", "scheduled", "confirmed", "completed",
]);

// ── Router principal ─────────────────────────────────────────────────────────

export const homenzRouter = router({
  // ── Auth ──────────────────────────────────────────────────────────────────

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input }) => {
      const result = await loginUser(input.email, input.password);
      if (!result) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha incorretos" });
      }
      return {
        token: result.token,
        user: result.user,
      };
    }),

  me: supabaseProcedure
    .query(async ({ ctx }) => {
      return ctx.homenzUser;
    }),

  logout: supabaseProcedure
    .mutation(async ({ ctx }) => {
      const authHeader = ctx.req.headers.authorization;
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        await supabaseAdmin.from("user_sessions").delete().eq("token", token);
      }
      return { success: true };
    }),

  // ── Registro via convite ──────────────────────────────────────────────────

  registerWithInvite: publicProcedure
    .input(z.object({
      token: z.string(),
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(6),
      phone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Verificar convite
      const { data: invite, error: inviteErr } = await supabaseAdmin
        .from("access_invites")
        .select("*")
        .eq("token", input.token)
        .single();

      if (inviteErr || !invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido" });
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado" });
      }

      if (invite.uses >= invite.max_uses) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Convite já utilizado" });
      }

      // Verificar se email já existe
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", input.email.toLowerCase())
        .single();

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
      }

      // Criar usuário
      const passwordHash = await hashPassword(input.password);
      const { data: newUser, error: createErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          name: input.name,
          email: input.email.toLowerCase(),
          password_hash: passwordHash,
          role: invite.role as UserRole,
          franchise_id: invite.franchise_id,
          phone: input.phone,
        })
        .select("id, name, email, role, franchise_id, phone, avatar_url, active, created_at, updated_at")
        .single();

      if (createErr || !newUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar usuário" });
      }

      // Incrementar uso do convite
      await supabaseAdmin
        .from("access_invites")
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id);

      // Se for vendedor, redistribuir leads pendentes da franquia para ele
      if (invite.role === "seller" && invite.franchise_id) {
        try {
          const { data: pendingLeads } = await supabaseAdmin
            .from("leads")
            .select("id")
            .eq("franchise_id", invite.franchise_id)
            .eq("distribution_status", "pending")
            .is("assigned_to", null);

          if (pendingLeads && pendingLeads.length > 0) {
            // Atribuir todos os leads pendentes ao novo vendedor
            await supabaseAdmin
              .from("leads")
              .update({
                assigned_to: newUser.id,
                distribution_status: "assigned",
                updated_at: new Date().toISOString(),
              })
              .eq("franchise_id", invite.franchise_id)
              .eq("distribution_status", "pending")
              .is("assigned_to", null);

            console.log(`[registerWithInvite] Redistribuídos ${pendingLeads.length} leads pendentes para o novo vendedor ${newUser.name}`);
          }
        } catch (redistErr) {
          // Não bloquear o cadastro se a redistribuição falhar
          console.error("[registerWithInvite] Erro ao redistribuir leads:", redistErr);
        }
      }

      // Fazer login automático
      const loginResult = await loginUser(input.email, input.password);
      if (!loginResult) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao fazer login" });
      }

      return { token: loginResult.token, user: loginResult.user };
    }),

  // ── Owner: visão da rede ──────────────────────────────────────────────────

  networkStats: ownerProcedure
    .query(async () => {
      const stats = await getNetworkStats();

      // Temperatura por AÇÃO (mesma régua do vendedor/franquia, #11): sobrescreve o
      // campo gravado por score antes de qualquer contagem da rede.
      const nowNet = Date.now();
      for (const l of stats.leads) {
        (l as { temperature?: string }).temperature = actionTemperature(l as ActionTempLead, nowNet);
      }
      const isScheduledNet = (l: { appointment_at?: string | null; funnel_step?: string | null }) =>
        !!l.appointment_at || SCHEDULED_STEPS.has(l.funnel_step ?? "");

      // Calcular métricas por franquia
      const franchisesWithStats = stats.franchises.map((f) => {
        const franchiseLeads = stats.leads.filter((l) => l.franchise_id === f.id);
        const franchiseSellers = stats.sellers.filter((s) => s.franchise_id === f.id);
        const hot = franchiseLeads.filter((l) => l.temperature === "hot").length;
        const warm = franchiseLeads.filter((l) => l.temperature === "warm").length;
        const cold = franchiseLeads.filter((l) => l.temperature === "cold").length;
        const scheduled = franchiseLeads.filter(isScheduledNet).length;
        const avgScore = franchiseLeads.length > 0
          ? Math.round(franchiseLeads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / franchiseLeads.length)
          : 0;

        return {
          ...f,
          totalLeads: franchiseLeads.length,
          hotLeads: hot,
          warmLeads: warm,
          coldLeads: cold,
          scheduledLeads: scheduled,
          avgScore,
          sellersCount: franchiseSellers.length,
        };
      });

      // Top sellers da rede
      const topSellers = stats.metrics
        .slice(0, 10)
        .map((m) => {
          const seller = stats.sellers.find((s) => s.id === m.seller_id);
          const franchise = stats.franchises.find((f) => f.id === m.franchise_id);
          return {
            ...m,
            sellerName: seller?.name ?? "—",
            franchiseName: franchise?.name ?? "—",
          };
        });

      const totalLeads = stats.leads.length;
      const totalScheduled = stats.leads.filter(isScheduledNet).length;
      const totalSellers = stats.sellers.length;
      const totalFranchises = stats.franchises.length;
      const avgScore = totalLeads > 0
        ? Math.round(stats.leads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / totalLeads)
        : 0;

      return {
        franchises: franchisesWithStats,
        topSellers,
        summary: {
          totalLeads,
          totalScheduled,
          totalSellers,
          totalFranchises,
          avgScore,
          conversionRate: totalLeads > 0 ? Math.round((totalScheduled / totalLeads) * 100) : 0,
        },
      };
    }),

  allFranchises: ownerProcedure
    .query(async () => {
      return getAllFranchises();
    }),

  createFranchiseeInvite: ownerProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      email: z.string().email().optional(),
      expiresInDays: z.number().default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const token = await createInvite({
        franchiseId: input.franchiseId,
        invitedBy: ctx.homenzUser.id,
        role: "franchisee",
        email: input.email,
        maxUses: 1,
        expiresInDays: input.expiresInDays,
      });
      const hdrs = (ctx.req as { headers: Record<string, string> }).headers;
      const fwdH = hdrs["x-forwarded-host"];
      const fwdP = hdrs["x-forwarded-proto"]?.split(",")[0]?.trim() ?? "https";
      const orig = fwdH ? `${fwdP}://${fwdH}` : (hdrs["origin"] ?? "http://localhost:3000");
      return { token, inviteUrl: `${orig}/join?token=${token}` };
    }),

  // ── Franqueado: visão da franquia ─────────────────────────────────────────

  franchiseeStats: franchiseeProcedure
    .query(async ({ ctx }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId && ctx.homenzUser.role !== "owner") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Franquia não encontrada" });
      }

      // Owner pode ver qualquer franquia; franqueado só vê a sua
      const targetFranchiseId = franchiseId!;

      const [franchise, leads, sellers, metrics, lpRes] = await Promise.all([
        getFranchiseById(targetFranchiseId),
        getLeadsByFranchise(targetFranchiseId),
        getSellersByFranchise(targetFranchiseId),
        getAllSellerMetrics(targetFranchiseId),
        supabaseAdmin
          .from("franchise_landing_pages")
          .select("slug, title, total_views, active")
          .eq("franchise_id", targetFranchiseId),
      ]);
      const landingPages = (lpRes.data ?? []) as { slug: string; title: string | null; total_views: number | null; active: boolean }[];

      // Temperatura por AÇÃO (decisão Bento 17/06): a profundidade no funil define
      // o nível, não o score gravado. Sobrescreve l.temperature ANTES de qualquer
      // contagem, alinhando a franquia à mesma régua do vendedor (#11).
      const now = Date.now();
      for (const l of leads) {
        l.temperature = actionTemperature(l as ActionTempLead, now);
      }

      const hot = leads.filter((l) => l.temperature === "hot").length;
      const warm = leads.filter((l) => l.temperature === "warm").length;
      const cold = leads.filter((l) => l.temperature === "cold").length;
      // "Agendado" = tem agendamento real OU step de agendamento (cobre TiDB+Supabase)
      const isScheduled = (l: typeof leads[number]) => !!l.appointment_at || SCHEDULED_STEPS.has(l.funnel_step);
      const scheduled = leads.filter(isScheduled).length;
      const avgScore = leads.length > 0
        ? Math.round(leads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / leads.length)
        : 0;

      // Enriquecer métricas + conversão AO VIVO por vendedor (a tabela seller_metrics
      // depende de um job que não roda; calculamos dos leads como no sellerDashboard).
      const sellersWithMetrics = sellers.map((s) => {
        const m = metrics.find((m) => m.seller_id === s.id);
        const sellerLeads = leads.filter((l) => l.assigned_to === s.id);
        const sellerScheduled = sellerLeads.filter(isScheduled).length;
        const sellerWorked = sellerLeads.filter((l) => l.attendance_status && l.attendance_status !== "open").length;
        const sellerWon = sellerLeads.filter((l) => l.attendance_status === "closed_sale").length;
        const liveConversion = sellerLeads.length ? Math.round((sellerScheduled / sellerLeads.length) * 100) : 0;
        return {
          ...s,
          // Mescla: métricas vivas (assigned/scheduled/conversão) por cima do que houver gravado
          metrics: {
            ...(m ?? {}),
            leads_assigned: sellerLeads.length,
            leads_scheduled: sellerScheduled,
            leads_contacted: m?.leads_contacted ?? sellerWorked,
            leads_confirmed: m?.leads_confirmed ?? sellerWon,
            conversion_rate: liveConversion,
            avg_response_minutes: m?.avg_response_minutes ?? 0,
            score: m?.score ?? (sellerLeads.length ? Math.round(sellerLeads.reduce((a, l) => a + (l.lead_score ?? 0), 0) / sellerLeads.length) : 0),
          },
          leadsAssigned: sellerLeads.length,
          // Métricas vivas espelhadas para o kanban/analytics da franquia
          live: {
            assigned: sellerLeads.length,
            worked: sellerWorked,
            scheduled: sellerScheduled,
            won: sellerWon,
            open: sellerLeads.filter((l) => !l.attendance_status || l.attendance_status === "open").length,
            conversion: liveConversion,
            hot: sellerLeads.filter((l) => l.temperature === "hot").length,
          },
        };
      });

      // Funil de conversão (robusto a nomes de step do TiDB e do Supabase)
      const funnelSteps: { step: string; key: string; set: Set<string> | null }[] = [
        { step: "Leads recebidos", key: "all", set: null },
        { step: "Chat iniciado", key: "chat_started", set: STEP_CHAT_STARTED },
        { step: "Chat concluído", key: "chat_done", set: STEP_CHAT_DONE },
        { step: "Fotos enviadas", key: "photos_done", set: STEP_PHOTOS },
        { step: "IA processada", key: "ai_done", set: STEP_AI },
        { step: "Agendado", key: "scheduled", set: SCHEDULED_STEPS },
      ];
      const funnel = funnelSteps.map((f) => {
        const count = f.set === null
          ? leads.length
          : leads.filter((l) => f.set!.has(l.funnel_step) || (f.key === "scheduled" && !!l.appointment_at)).length;
        return {
          step: f.step,
          key: f.key,
          count,
          pct: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
        };
      });

      // ── Analytics da franquia (métricas pedidas pelo Bento, call 17/06) ──────
      // Marcos do funil (leads que CHEGARAM em cada etapa), fotos enviadas e
      // IA processada — derivados dos leads + flags concretas (photo_url).
      const chatsIniciados = leads.filter((l) => STEP_CHAT_STARTED.has(l.funnel_step)).length;
      const chatsConcluidos = leads.filter((l) => STEP_CHAT_DONE.has(l.funnel_step)).length;
      // Fotos enviadas: tem photo_url OU passou pela etapa de fotos
      const fotosEnviadas = leads.filter((l) => !!l.photo_url || STEP_PHOTOS.has(l.funnel_step)).length;
      const iaProcessadas = leads.filter((l) => STEP_AI.has(l.funnel_step)).length;

      // Conversão por vendedor + VENDEDOR CAMPEÃO (mais agendamentos; desempate por conversão)
      const sellerPerformance = sellersWithMetrics
        .map((s) => ({
          id: s.id,
          name: s.name,
          assigned: s.live.assigned,
          scheduled: s.live.scheduled,
          won: s.live.won,
          conversion: s.live.conversion,
        }))
        .sort((a, b) => b.scheduled - a.scheduled || b.conversion - a.conversion || b.assigned - a.assigned);
      const champion = sellerPerformance.find((s) => s.assigned > 0) ?? null;

      // Páginas de captação: visualizações + leads atribuídos pela campanha (utm_campaign = slug)
      // e conversão (leads/views). A página com maior conversão sobe ao topo.
      const pages = landingPages
        .filter((lp) => !lp.slug.startsWith("__")) // ignora LPs de config (pixel/capi/testcode)
        .map((lp) => {
          const views = lp.total_views ?? 0;
          const pageLeads = leads.filter((l) => l.utm_campaign === lp.slug).length;
          const pageScheduled = leads.filter((l) => l.utm_campaign === lp.slug && isScheduled(l)).length;
          return {
            slug: lp.slug,
            title: lp.title ?? lp.slug,
            views,
            leads: pageLeads,
            scheduled: pageScheduled,
            // taxa de captação = leads / visualizações
            conversion: views > 0 ? Math.round((pageLeads / views) * 100) : 0,
          };
        })
        .sort((a, b) => b.conversion - a.conversion || b.leads - a.leads);
      const totalViews = pages.reduce((a, p) => a + p.views, 0);
      const topPage = pages.find((p) => p.leads > 0) ?? pages[0] ?? null;

      const analytics = {
        leadsRecebidos: leads.length,
        chatsIniciados,
        chatsConcluidos,
        fotosEnviadas,
        iaProcessadas,
        agendamentos: scheduled,
        conversionRate: leads.length > 0 ? Math.round((scheduled / leads.length) * 100) : 0,
        totalViews,
        champion,
        sellerPerformance,
        pages,
        topPage,
      };

      // Calcular dias restantes do trial
      let trialDaysLeft: number | null = null;
      let trialActive = false;
      if (franchise?.trial_ends_at) {
        const trialEnd = new Date(franchise.trial_ends_at);
        const now = new Date();
        const diffMs = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        trialDaysLeft = Math.max(0, diffDays);
        trialActive = diffDays > 0;
      }

      // Assinante pago = plano diferente de "free" (webhook do Stripe atualiza o campo plan)
      const hasPaidPlan = !!franchise?.plan && franchise.plan !== "free";

      // Leads completos para o KANBAN da franquia (#14) — só os campos que o board
      // usa, leves para o payload. Inclui o vendedor responsável (assigned_to) para
      // o card mostrar "quem está atendendo".
      const kanbanLeads = leads.map((l) => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        hair_problem: l.hair_problem ?? null,
        lead_score: l.lead_score,
        temperature: l.temperature,
        funnel_step: l.funnel_step,
        attendance_status: l.attendance_status ?? null,
        appointment_at: l.appointment_at ?? null,
        assigned_to: l.assigned_to ?? null,
        last_activity_at: l.last_activity_at,
        created_at: l.created_at,
      }));

      return {
        franchise,
        leads: leads.slice(0, 20), // últimos 20 leads (aba Leads)
        allLeads: kanbanLeads,     // todos os leads (Kanban de desempenho)
        sellers: sellersWithMetrics,
        stats: {
          totalLeads: leads.length,
          hotLeads: hot,
          warmLeads: warm,
          coldLeads: cold,
          scheduledLeads: scheduled,
          avgScore,
          conversionRate: leads.length > 0 ? Math.round((scheduled / leads.length) * 100) : 0,
        },
        funnel,
        analytics,
        trial: {
          active: trialActive,
          daysLeft: trialDaysLeft,
          endsAt: franchise?.trial_ends_at ?? null,
          hasPaidPlan, // true = assinante pago, painel liberado mesmo com trial expirado
        },
      };
    }),

  createSellerInvite: franchiseeProcedure
    .input(z.object({
      email: z.string().email().optional(),
      expiresInDays: z.number().default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Franquia não encontrada" });
      }

      // ── Verificar limite de vendedores por plano ──────────────────────────
      const SELLER_LIMITS: Record<string, number> = {
        free: 2,
        starter: 2,
        pro: 10,
        enterprise: -1,
        network: -1,
      };

      const { data: franchise } = await supabaseAdmin
        .from("franchises")
        .select("plan")
        .eq("id", franchiseId)
        .single();

      const plan = (franchise?.plan as string) ?? "free";
      const maxSellers = SELLER_LIMITS[plan] ?? 2;

      if (maxSellers !== -1) {
        const { count: currentSellers } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("franchise_id", franchiseId)
          .eq("role", "seller");

        if ((currentSellers ?? 0) >= maxSellers) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Limite de vendedores atingido para o plano ${plan.toUpperCase()} (máx: ${maxSellers}). Faça upgrade do plano para adicionar mais vendedores.`,
          });
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      const token = await createInvite({
        franchiseId,
        invitedBy: ctx.homenzUser.id,
        role: "seller",
        email: input.email,
        maxUses: 1,
        expiresInDays: input.expiresInDays,
      });

      const headers = (ctx.req as { headers: Record<string, string> }).headers;
      const fwdHost = headers["x-forwarded-host"];
      const fwdProto = headers["x-forwarded-proto"]?.split(",")[0]?.trim() ?? "https";
      const origin = fwdHost ? `${fwdProto}://${fwdHost}` : (headers["origin"] ?? "http://localhost:3000");
      const inviteUrl = `${origin}/join?token=${token}`;

      // Enviar email de convite via Brevo (se email fornecido)
      if (input.email) {
        try {
          const { sendSellerInvite } = await import('../brevo');
          // Buscar nome da franquia
          const { data: franchiseData } = await supabaseAdmin
            .from('franchises')
            .select('name')
            .eq('id', franchiseId)
            .single();
          await sendSellerInvite({
            email: input.email,
            name: input.email.split('@')[0], // fallback se não tiver nome
            clinicName: franchiseData?.name ?? 'Homenz',
            inviteLink: inviteUrl,
          });
        } catch (emailErr) {
          console.error('[Brevo] Erro ao enviar convite de vendedor:', emailErr);
        }
      }

      return { token, inviteUrl };
    }),

  // ── Vendedor: visão dos leads ─────────────────────────────────────────────

  sellerDashboard: supabaseProcedure
    .query(async ({ ctx }) => {
      if (ctx.homenzUser.role !== "seller") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a vendedores" });
      }

      const [leads, storedMetrics, franchise] = await Promise.all([
        getLeadsBySeller(ctx.homenzUser.id, ctx.homenzUser.franchise_id ?? undefined),
        getSellerMetrics(ctx.homenzUser.id, ctx.homenzUser.franchise_id!),
        ctx.homenzUser.franchise_id ? getFranchiseById(ctx.homenzUser.franchise_id) : Promise.resolve(null),
      ]);

      // Temperatura por AÇÃO (decisão Bento 17/06): a profundidade no funil define
      // o nível, não o tempo. Régua canônica centralizada em actionTemperature
      // (mesma usada por franchiseeStats e networkStats, alinhada ao front
      // client/src/lib/leadTemperature.ts -> getActionTemperature).
      const now = Date.now();
      for (const l of leads) {
        l.temperature = actionTemperature(l as ActionTempLead, now);
      }

      const hot = leads.filter((l) => l.temperature === "hot");
      const warm = leads.filter((l) => l.temperature === "warm");
      const cold = leads.filter((l) => l.temperature === "cold");

      // Métricas do mês AO VIVO a partir dos leads. A tabela seller_metrics
      // depende de um job que não roda (só tinha seed de março) — o vendedor
      // via tudo zerado. O que existir nela ainda complementa (score/resposta).
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthLeads = leads.filter((l) => new Date(l.created_at) >= monthStart);
      const worked = monthLeads.filter((l) => l.attendance_status && l.attendance_status !== "open").length;
      const scheduled = monthLeads.filter((l) => l.appointment_at || l.funnel_step === "scheduled").length;
      const won = monthLeads.filter((l) => l.attendance_status === "closed_sale").length;
      const avgScore = monthLeads.length
        ? Math.round(monthLeads.reduce((s, l) => s + (l.lead_score ?? 0), 0) / monthLeads.length)
        : 0;
      const metrics = {
        ...(storedMetrics ?? {}),
        leads_assigned: monthLeads.length,
        leads_contacted: worked,
        leads_scheduled: scheduled,
        leads_confirmed: won,
        // Conversão = AGENDAMENTO (não venda): marketing entrega lead qualificado,
        // a venda é presencial e responsabilidade do vendedor. (pedido Bento 15/06)
        conversion_rate: monthLeads.length ? Math.round((scheduled / monthLeads.length) * 100) : 0,
        avg_response_minutes: storedMetrics?.avg_response_minutes ?? 0,
        score: storedMetrics?.score ?? avgScore,
      };

      return {
        leads: { hot, warm, cold, all: leads },
        metrics,
        stats: {
          totalLeads: leads.length,
          hotLeads: hot.length,
          warmLeads: warm.length,
          coldLeads: cold.length,
          scheduledLeads: leads.filter((l) => l.appointment_at || l.funnel_step === "scheduled").length,
        },
        // Contexto da unidade p/ preencher as mensagens sugeridas no card (#12)
        franchise: franchise
          ? { name: franchise.name, city: franchise.city, address: franchise.address ?? null }
          : null,
        sellerName: ctx.homenzUser.name,
      };
    }),

  leadTimeline: supabaseProcedure
    .input(z.object({ leadId: z.string().uuid() }))
    .query(async ({ input }) => {
      return getLeadTimeline(input.leadId);
    }),

  addLeadEvent: supabaseProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      franchiseId: z.string().uuid(),
      eventType: z.string(),
      description: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await addLeadEvent({
        leadId: input.leadId,
        franchiseId: input.franchiseId,
        eventType: input.eventType,
        description: input.description,
        metadata: input.metadata,
        triggeredBy: "seller",
        sellerId: ctx.homenzUser.id,
      });
      return { success: true };
    }),

  // Encerramento de atendimento pelo vendedor (status + observações)
  updateLeadClosing: supabaseProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      attendanceStatus: z.enum(["open", "in_progress", "resolved", "closed_sale", "closed_no_sale", "contact_later"]),
      closingNotes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // "open" (em aberto) e "in_progress" (em atendimento) NÃO encerram — lead ainda em trabalho
      const isClosing = input.attendanceStatus !== "open" && input.attendanceStatus !== "in_progress";
      const { error } = await supabaseAdmin
        .from("leads")
        .update({
          attendance_status: input.attendanceStatus,
          closing_notes: input.closingNotes ?? null,
          closed_at: isClosing ? new Date().toISOString() : null,
          closed_by: isClosing ? ctx.homenzUser.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", input.leadId);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  // ── Agendamentos da franquia ────────────────────────────────────────────────

  getAppointments: franchiseeProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      let query = supabaseAdmin
        .from('appointments')
        .select(`id, scheduled_at, duration_minutes, status, notes, created_at, lead_id, seller_id, leads!inner(id, name, phone, hair_loss_type), profiles!appointments_seller_id_fkey(id, name)`)
        .eq('franchise_id', franchiseId)
        .order('scheduled_at', { ascending: true });
      if (input.startDate) query = query.gte('scheduled_at', input.startDate);
      if (input.endDate) query = query.lte('scheduled_at', input.endDate);
      const { data, error } = await query;
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  createAppointment: franchiseeProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      sellerId: z.string().uuid().optional(),
      scheduledAt: z.string(),
      durationMinutes: z.number().default(60),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      const { data, error } = await supabaseAdmin
        .from('appointments')
        .insert({
          lead_id: input.leadId,
          franchise_id: franchiseId,
          seller_id: input.sellerId ?? ctx.homenzUser.id,
          scheduled_at: input.scheduledAt,
          duration_minutes: input.durationMinutes,
          notes: input.notes,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),

  updateAppointmentStatus: franchiseeProcedure
    .input(z.object({
      appointmentId: z.string().uuid(),
      status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']),
    }))
    .mutation(async ({ input }) => {
      const { error } = await supabaseAdmin
        .from('appointments')
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq('id', input.appointmentId);
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  // ── Vendedor/franqueado: solicitar agendamento (clínica confirma) ────────

  // Horários livres da franquia do usuário para uma data (vendedor e franqueado).
  getAvailableSlots: supabaseProcedure
    .input(z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      tzOffsetMinutes: z.number().int().min(-720).max(840).default(-180),
    }))
    .query(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) return { slots: [] as { time: string; available: boolean; datetime: string }[] };
      const weekday = new Date(`${input.date}T12:00:00`).getDay();
      let hours: number[] = [];
      if (weekday >= 1 && weekday <= 5) hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
      else if (weekday === 6) hours = [8, 9, 10, 11, 12];
      const dayStartUtc = new Date(new Date(`${input.date}T00:00:00Z`).getTime() - input.tzOffsetMinutes * 60_000);
      const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);
      const { data: taken } = await supabaseAdmin
        .from('appointments')
        .select('scheduled_at, status')
        .eq('franchise_id', franchiseId)
        .gte('scheduled_at', dayStartUtc.toISOString())
        .lt('scheduled_at', dayEndUtc.toISOString());
      const busy = new Set(
        (taken ?? [])
          .filter((a) => !['cancelled', 'no_show'].includes(a.status as string))
          .map((a) => {
            const utc = new Date(a.scheduled_at as string);
            return (utc.getUTCHours() + Math.floor(input.tzOffsetMinutes / 60) + 24) % 24;
          })
      );
      return {
        slots: hours.map((h) => {
          const time = `${String(h).padStart(2, '0')}:00`;
          return { time, available: !busy.has(h), datetime: `${input.date}T${time}:00` };
        }),
      };
    }),

  // Vendedor (ou franqueado) solicita um agendamento para um lead. Cai como
  // 'pending'; a clínica confirma no painel de Agendamentos.
  requestAppointment: supabaseProcedure
    .input(z.object({
      leadId: z.string().uuid(),
      datetime: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { data: lead } = await supabaseAdmin
        .from('leads')
        .select('id, franchise_id, assigned_to')
        .eq('id', input.leadId)
        .single();
      if (!lead) throw new TRPCError({ code: 'NOT_FOUND', message: 'Lead não encontrado' });
      const sellerId = (lead as { assigned_to: string | null }).assigned_to ?? ctx.homenzUser.id;
      const { error } = await supabaseAdmin
        .from('appointments')
        .insert({
          lead_id: input.leadId,
          franchise_id: (lead as { franchise_id: string }).franchise_id,
          seller_id: sellerId,
          scheduled_at: input.datetime,
          duration_minutes: 60,
          notes: input.notes ?? 'Agendado pelo vendedor',
          status: 'pending',
        });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      await supabaseAdmin
        .from('leads')
        .update({ funnel_step: 'scheduled', updated_at: new Date().toISOString() })
        .eq('id', input.leadId);
      return { success: true };
    }),

  // ── Landing Pages da Franquia ───────────────────────────────────────────

  getLandingPages: franchiseeProcedure
    .query(async ({ ctx }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      const { data, error } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('*')
        .eq('franchise_id', franchiseId)
        .order('created_at', { ascending: false });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  createLandingPageForFranchisee: franchiseeProcedure
    .input(z.object({
      title: z.string().min(3),
      procedure: z.string().default('crescimento-capilar'),
      utmSource: z.string().default('meta'),
      utmMedium: z.string().default('cpc'),
      address: z.string().optional(),
      zipCode: z.string().optional(),
      // Vendedores selecionados para receber leads desta LP
      sellerIds: z.array(z.string()).min(1, 'Selecione ao menos um vendedor'),
    }))
    .mutation(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      const { data: franchise } = await supabaseAdmin
        .from('franchises')
        .select('slug, city, state')
        .eq('id', franchiseId)
        .single();
      if (!franchise) throw new TRPCError({ code: 'NOT_FOUND', message: 'Franquia não encontrada' });
      // Verificar que todos os vendedores pertencem à franquia
      const { data: sellers } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .eq('franchise_id', franchiseId)
        .eq('role', 'seller')
        .in('id', input.sellerIds);
      if (!sellers || sellers.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum vendedor válido selecionado' });
      }
      const baseSlug = franchise.slug + '-' + input.procedure;
      const timestamp = Date.now().toString(36);
      const slug = `${baseSlug}-${timestamp}`;
      const insertData: Record<string, unknown> = {
        franchise_id: franchiseId,
        slug,
        title: input.title,
        procedure: input.procedure,
        city: franchise.city,
        state: franchise.state,
        utm_source: input.utmSource,
        utm_medium: input.utmMedium,
        utm_campaign: slug,
        active: true,
      };
      if (input.address) insertData.address = input.address;
      if (input.zipCode) insertData.zip_code = input.zipCode;
      const { data, error } = await supabaseAdmin
        .from('franchise_landing_pages')
        .insert(insertData)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      // Salvar vínculos LP → vendedores no TiDB
      const { getDb } = await import('../db');
      const db = await getDb();
      if (db) {
        const { landingPageSellers } = await import('../../drizzle/schema');
        const sellerLinks = sellers.map((s) => ({
          landingPageId: data.id,
          sellerId: s.id,
          sellerName: s.name,
        }));
        await db.insert(landingPageSellers).values(sellerLinks);
      }
      return { ...data, assignedSellers: sellers };
    }),

  // ── Criação manual de clínica (venda 1:1; faturamento enviado por fora) ────
  // Form interno do owner — substitui a contratação self-service da landing.
  createClinicManual: ownerProcedure
    .input(z.object({
      franchiseName: z.string().min(2, "Nome da clínica obrigatório"),
      city: z.string().min(2, "Cidade obrigatória"),
      state: z.string().length(2, "Estado deve ter 2 letras"),
      plan: z.enum(["free", "starter", "pro", "network"]).default("pro"),
      ownerName: z.string().min(2, "Nome do responsável obrigatório"),
      ownerEmail: z.string().email("Email inválido"),
      ownerWhatsapp: z.string().min(10, "WhatsApp inválido"),
      servicePhone: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const email = input.ownerEmail.toLowerCase();
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single();
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
      }

      const baseSlug = input.franchiseName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      // Sem trial: conta manual já entra ativa no plano combinado no 1:1
      const { data: franchise, error: franchiseErr } = await supabaseAdmin
        .from("franchises")
        .insert({
          name: input.franchiseName,
          slug,
          city: input.city,
          state: input.state.toUpperCase(),
          plan: input.plan,
          active: true,
          ...(input.servicePhone ? { phone: input.servicePhone } : {}),
        })
        .select("id")
        .single();
      if (franchiseErr || !franchise) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao criar clínica: ${franchiseErr?.message}` });
      }

      // Senha temporária — o owner repassa no 1:1 e o franqueado troca depois
      const tempPassword = `Hz-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
      const passwordHash = await hashPassword(tempPassword);
      const { data: newUser, error: userErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          name: input.ownerName,
          email,
          password_hash: passwordHash,
          role: "franchisee" as UserRole,
          franchise_id: franchise.id,
          phone: input.ownerWhatsapp,
          active: true,
        })
        .select("id")
        .single();
      if (userErr || !newUser) {
        await supabaseAdmin.from("franchises").delete().eq("id", franchise.id);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao criar usuário: ${userErr?.message}` });
      }

      await supabaseAdmin.from("franchises").update({ owner_id: newUser.id }).eq("id", franchise.id);

      // Vendedor inicial — recebe os leads (o responsável também vende no começo).
      // Login = email com sufixo "+vendedor" e a mesma senha temporária.
      const sellerEmail = email.replace("@", "+vendedor@");
      const { data: seller } = await supabaseAdmin
        .from("profiles")
        .insert({
          name: input.ownerName,
          email: sellerEmail,
          password_hash: passwordHash,
          role: "seller" as UserRole,
          franchise_id: franchise.id,
          phone: input.ownerWhatsapp,
          active: true,
        })
        .select("id")
        .single();

      // Landing page pronta — o link /l/:slug já funciona e distribui para o vendedor
      const lpSlug = `${slug}-diagnostico`;
      const { data: lp } = await supabaseAdmin
        .from("franchise_landing_pages")
        .insert({
          franchise_id: franchise.id,
          slug: lpSlug,
          title: `Diagnóstico Capilar — ${input.franchiseName}`,
          procedure: "crescimento-capilar",
          city: input.city,
          state: input.state.toUpperCase(),
          utm_campaign: lpSlug,
          active: true,
        })
        .select("id")
        .single();

      // Vincula o vendedor à LP (round-robin distribui os leads para ele)
      if (seller && lp) {
        try {
          const { getDb } = await import("../db");
          const db = await getDb();
          if (db) {
            const { landingPageSellers } = await import("../../drizzle/schema");
            await db.insert(landingPageSellers).values({ landingPageId: lp.id, sellerId: seller.id, sellerName: input.ownerName });
          }
        } catch (e) {
          console.error("[createClinicManual] vínculo LP-vendedor falhou:", e);
        }
      }

      return {
        franchiseId: franchise.id,
        franchiseSlug: slug,
        landingPageSlug: lp ? lpSlug : null,
        ownerEmail: email,
        sellerEmail,
        tempPassword,
        message: "Clínica criada com link de captação pronto para teste.",
      };
    }),

  // ── Registro público de franqueado ─────────────────────────────────────────
  registerFranchisee: publicProcedure
    .input(z.object({
      name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
      email: z.string().email("Email inválido"),
      password: z.string().min(6, "Senha deve ter ao menos 6 caracteres"),
      whatsapp: z.string().min(10, "WhatsApp inválido"),
      instagram: z.string().optional(),
      address: z.string().optional(),
      servicePhone: z.string().optional(), // Número de atendimento da unidade (WhatsApp)
      franchiseName: z.string().min(2, "Nome da clínica obrigatório"),
      city: z.string().min(2, "Cidade obrigatória"),
      state: z.string().length(2, "Estado deve ter 2 letras"),
    }))
    .mutation(async ({ input }) => {
      // Verificar se email já existe
      const { data: existing } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", input.email.toLowerCase())
        .single();

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Email já cadastrado" });
      }

      // Criar slug único para a franquia
      const baseSlug = input.franchiseName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      // Trial de 15 dias: ativar imediatamente sem exigir pagamento
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 15);

      // Criar a franquia já ativa com trial de 15 dias
      const franchiseInsert: Record<string, unknown> = {
        name: input.franchiseName,
        slug,
        city: input.city,
        state: input.state.toUpperCase(),
        plan: "free",
        active: true, // Ativa imediatamente — trial de 15 dias sem cartão
        trial_ends_at: trialEndsAt.toISOString(),
      };
      // Adicionar address apenas se a coluna existir (migration pendente)
      if (input.address) {
        franchiseInsert.address = input.address;
      }
      // Adicionar número de atendimento da unidade
      if (input.servicePhone) {
        franchiseInsert.phone = input.servicePhone;
      }

      const { data: franchise, error: franchiseErr } = await supabaseAdmin
        .from("franchises")
        .insert(franchiseInsert)
        .select("id")
        .single();

      if (franchiseErr || !franchise) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao criar franquia: ${franchiseErr?.message}` });
      }

      // Criar o perfil do franqueado já ativo (trial de 15 dias sem cartão)
      const passwordHash = await hashPassword(input.password);
      const profileInsert: Record<string, unknown> = {
        name: input.name,
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        role: "franchisee" as UserRole,
        franchise_id: franchise.id,
        phone: input.whatsapp,
        active: true, // Ativa imediatamente — trial de 15 dias sem cartão
      };

      const { data: newUser, error: userErr } = await supabaseAdmin
        .from("profiles")
        .insert(profileInsert)
        .select("id, name, email, role, franchise_id, phone, avatar_url, active, created_at, updated_at")
        .single();

      if (userErr || !newUser) {
        // Rollback: deletar franquia criada
        await supabaseAdmin.from("franchises").delete().eq("id", franchise.id);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao criar usuário: ${userErr?.message}` });
      }

      // Atualizar owner_id da franquia
      await supabaseAdmin
        .from("franchises")
        .update({ owner_id: newUser.id })
        .eq("id", franchise.id);

      // Enviar email de boas-vindas via Brevo
      try {
        const { sendWelcomeFranchisee } = await import('../brevo');
        await sendWelcomeFranchisee({
          email: input.email.toLowerCase(),
          name: input.name,
          clinicName: input.franchiseName,
          trialDays: 15,
        });
      } catch (emailErr) {
        console.error('[Brevo] Erro ao enviar boas-vindas ao franqueado:', emailErr);
      }

      // Retornar dados para fazer login direto e redirecionar ao painel
      return {
        email: input.email.toLowerCase(),
        franchiseId: franchise.id,
        franchiseSlug: slug,
        message: "Conta criada! Seus 15 dias grátis já começaram.",
        trialStarted: true,
      };
    }),

  // ── Verificar convite ─────────────────────────────────────────────────────
  getInviteInfo: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const { data: invite, error } = await supabaseAdmin
        .from("access_invites")
        .select("*, franchises(name, city, state)")
        .eq("token", input.token)
        .single();

      if (error || !invite) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Convite expirado" });
      }

      if (invite.uses >= invite.max_uses) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Convite já utilizado" });
      }

      return {
        role: invite.role as UserRole,
        franchiseName: (invite.franchises as { name: string } | null)?.name ?? null,
        franchiseCity: (invite.franchises as { city: string } | null)?.city ?? null,
        email: invite.email,
      };
    }),

  // ── Meta Pixel ─────────────────────────────────────────────────────────────
  /**
   * Busca o pixel_id da franquia.
   * Usa a coluna pixel_id se existir, caso contrário lê do campo utm_campaign
   * de uma landing page especial com slug "__pixel_config__<franchiseId>".
   */
  getFranchisePixel: franchiseeProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      // Pixel armazenado em LP especial com slug __pixel_<franchiseId>__
      const configSlug = `__pixel_${input.franchiseId.replace(/-/g, '')}__`;
      const { data: lp } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('utm_campaign')
        .eq('slug', configSlug)
        .single();
      const stored = (lp as { utm_campaign?: string } | null)?.utm_campaign || null;
      return { pixelId: stored && stored.startsWith('pixel:') ? stored.slice(6) : null };
    }),

  /**
   * Atualiza o pixel_id da franquia.
   * Usa a coluna pixel_id se existir, caso contrário persiste em uma landing page
   * especial com slug "__pixel_<franchiseId>__" usando utm_campaign como storage.
   */
  updateFranchisePixel: franchiseeProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      pixelId: z.string().max(30).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      // Pixel armazenado em LP especial com slug __pixel_<franchiseId>__
      const configSlug = `__pixel_${input.franchiseId.replace(/-/g, '')}__`;
      const utmValue = input.pixelId ? `pixel:${input.pixelId}` : null;
      const { data: existing } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('id')
        .eq('slug', configSlug)
        .single();
      if (existing) {
        await supabaseAdmin
          .from('franchise_landing_pages')
          .update({ utm_campaign: utmValue })
          .eq('slug', configSlug);
      } else {
        await supabaseAdmin
          .from('franchise_landing_pages')
          .insert({
            franchise_id: input.franchiseId,
            slug: configSlug,
            title: '__pixel_config__',
            procedure: 'config',
            active: false,
            utm_campaign: utmValue,
          });
      }
      return { success: true, method: 'lp_config' };
    }),

  // ── Meta CAPI Token ────────────────────────────────────────────────────────
  /**
   * Busca o CAPI Access Token da franquia.
   * Armazenado em uma landing page especial com prefixo 'capi:' no utm_campaign.
   */
  getCapiToken: franchiseeProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      // CAPI token armazenado em LP especial com slug __capi_<franchiseId>__
      const configSlug = `__capi_${input.franchiseId.replace(/-/g, '')}__`;
      const { data: lp } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('utm_campaign')
        .eq('slug', configSlug)
        .single();
      const stored = (lp as { utm_campaign?: string } | null)?.utm_campaign || null;
      return { capiToken: stored && stored.startsWith('capi:') ? stored.slice(5) : null };
    }),

  /**
   * Atualiza o CAPI Access Token da franquia.
   */
  updateCapiToken: franchiseeProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      capiToken: z.string().max(300).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      // CAPI token armazenado em LP especial com slug __capi_<franchiseId>__
      const configSlug = `__capi_${input.franchiseId.replace(/-/g, '')}__`;
      const capiValue = input.capiToken ? `capi:${input.capiToken}` : null;
      const { data: existing } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('id')
        .eq('slug', configSlug)
        .single();
      if (existing) {
        await supabaseAdmin
          .from('franchise_landing_pages')
          .update({ utm_campaign: capiValue })
          .eq('slug', configSlug);
      } else {
        await supabaseAdmin
          .from('franchise_landing_pages')
          .insert({
            franchise_id: input.franchiseId,
            slug: configSlug,
            title: '__capi_config__',
            procedure: 'config',
            active: false,
            utm_campaign: capiValue,
          });
      }
      return { success: true, method: 'fallback' };
    }),

  /**
   * Busca o test_event_code da franquia (para debug no Meta Events Manager).
   */
  getTestEventCode: franchiseeProcedure
    .input(z.object({ franchiseId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      const configSlug = `__testcode_${input.franchiseId.replace(/-/g, '')}__`;
      const { data: lp } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('utm_campaign')
        .eq('slug', configSlug)
        .single();
      const stored = (lp as { utm_campaign?: string } | null)?.utm_campaign || null;
      return { testEventCode: stored && stored.startsWith('testcode:') ? stored.slice(9) : null };
    }),

  /**
   * Atualiza o test_event_code da franquia.
   */
  updateTestEventCode: franchiseeProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      testEventCode: z.string().max(50).nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      const configSlug = `__testcode_${input.franchiseId.replace(/-/g, '')}__`;
      const codeValue = input.testEventCode ? `testcode:${input.testEventCode}` : null;
      const { data: existing } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('id')
        .eq('slug', configSlug)
        .single();
      if (existing) {
        await supabaseAdmin
          .from('franchise_landing_pages')
          .update({ utm_campaign: codeValue })
          .eq('slug', configSlug);
      } else {
        await supabaseAdmin
          .from('franchise_landing_pages')
          .insert({
            franchise_id: input.franchiseId,
            slug: configSlug,
            title: '__testcode_config__',
            procedure: 'config',
            active: false,
            utm_campaign: codeValue,
          });
      }
      return { success: true };
    }),

  /**
   * Envia um evento de teste para o Meta CAPI.
   * Permite verificar se o pixel_id + access_token estão corretos.
   */
  testCapiEvent: franchiseeProcedure
    .input(z.object({
      franchiseId: z.string().uuid(),
      pixelId: z.string(),
      capiToken: z.string(),
      testEventCode: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { homenzUser } = ctx;
      if (homenzUser.role !== 'owner' && homenzUser.franchise_id !== input.franchiseId) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      const { sendCapiEvent } = await import('../metaCapi');
      const result = await sendCapiEvent({
        pixelId: input.pixelId,
        accessToken: input.capiToken,
        eventName: 'PageView',
        testEventCode: input.testEventCode,
        customData: { test: true, source: 'homenz_pixel_test' },
      });
      return result;
    }),

  // ── Notificações de leads novos para vendedores ──────────────────────────

  /**
   * Retorna a contagem de leads novos (atribuídos após lastSeenAt).
   * O frontend armazena o timestamp do último acesso em localStorage.
   * Polling a cada 30s para detectar leads novos em tempo real.
   */
  updateFranchiseSettings: franchiseeProcedure
    .input(z.object({
      address: z.string().optional(),
      phone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });

      const updateData: Record<string, string> = {};
      if (input.address !== undefined) updateData.address = input.address;
      if (input.phone !== undefined) updateData.phone = input.phone;

      if (Object.keys(updateData).length === 0) return { success: true };

      const { error } = await supabaseAdmin
        .from('franchises')
        .update(updateData)
        .eq('id', franchiseId);

      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return { success: true };
    }),

  getFranchiseSettings: franchiseeProcedure
    .query(async ({ ctx }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) return { address: '', phone: '' };

      const { data } = await supabaseAdmin
        .from('franchises')
        .select('address, phone')
        .eq('id', franchiseId)
        .single();

      return {
        address: (data?.address as string) || '',
        phone: (data?.phone as string) || '',
      };
    }),

  getNewLeadsCount: supabaseProcedure
    .input(z.object({
      lastSeenAt: z.string().optional(), // ISO timestamp do último acesso
    }))
    .query(async ({ ctx, input }) => {
      if (ctx.homenzUser.role !== 'seller') {
        return { count: 0, newLeads: [] as { id: string; name: string; phone: string; lead_score: number; temperature: string; created_at: string }[] };
      }
      // Usar lastSeenAt fornecido ou fallback para últimos 5 minutos
      const since = input.lastSeenAt
        ? new Date(input.lastSeenAt).toISOString()
        : new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: newLeads } = await supabaseAdmin
        .from('leads')
        .select('id, name, phone, lead_score, temperature, funnel_step, photo_url, attendance_status, last_activity_at, created_at')
        .eq('assigned_to', ctx.homenzUser.id)
        .gt('created_at', since)
        .order('created_at', { ascending: false });

      // Temperatura por AÇÃO (#11) também na notificação de lead novo (emoji do sino).
      const nowNL = Date.now();
      const enriched = (newLeads ?? []).map((l) => ({
        id: l.id as string,
        name: l.name as string,
        phone: l.phone as string,
        lead_score: l.lead_score as number,
        temperature: actionTemperature(l as ActionTempLead, nowNL),
        created_at: l.created_at as string,
      }));

      return {
        count: enriched.length,
        newLeads: enriched,
      };
    }),

  // ── Vendedores da franquia ─────────────────────────────────────────────────

  /**
   * Retorna todos os vendedores ativos da franquia do usuário autenticado.
   * Usado no modal de criação/edição de LP para selecionar quais vendedores
   * vão receber leads daquela página específica.
   */
  getSellers: franchiseeProcedure
    .query(async ({ ctx }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, name, email, phone, active, created_at')
        .eq('franchise_id', franchiseId)
        .eq('role', 'seller')
        .eq('active', true)
        .order('name', { ascending: true });
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data ?? [];
    }),

  /**
   * Retorna os vendedores vinculados a uma landing page específica.
   * Lê da tabela landing_page_sellers no TiDB.
   */
  getLandingPageSellers: franchiseeProcedure
    .input(z.object({ landingPageId: z.string() }))
    .query(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      // Verificar que a LP pertence à franquia
      const { data: lp } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('id')
        .eq('id', input.landingPageId)
        .eq('franchise_id', franchiseId)
        .single();
      if (!lp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Landing page não encontrada' });
      // Buscar vínculos no TiDB
      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) return [];
      const { landingPageSellers } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      const rows = await db
        .select()
        .from(landingPageSellers)
        .where(eq(landingPageSellers.landingPageId, input.landingPageId));
      return rows.map((r) => ({ sellerId: r.sellerId, sellerName: r.sellerName ?? '' }));
    }),

  /**
   * Atualiza os vendedores vinculados a uma landing page.
   * Remove os vínculos anteriores e insere os novos.
   * Usado no modal de edição de LP.
   */
  assignSellersToLandingPage: franchiseeProcedure
    .input(z.object({
      landingPageId: z.string(),
      sellerIds: z.array(z.string()).min(1, 'Selecione ao menos um vendedor'),
    }))
    .mutation(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Franquia não encontrada' });
      // Verificar que a LP pertence à franquia
      const { data: lp } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('id')
        .eq('id', input.landingPageId)
        .eq('franchise_id', franchiseId)
        .single();
      if (!lp) throw new TRPCError({ code: 'NOT_FOUND', message: 'Landing page não encontrada' });
      // Verificar que todos os vendedores pertencem à franquia
      const { data: sellers } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .eq('franchise_id', franchiseId)
        .eq('role', 'seller')
        .in('id', input.sellerIds);
      if (!sellers || sellers.length === 0) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Nenhum vendedor válido selecionado' });
      }
      // Atualizar vínculos no TiDB
      const { getDb } = await import('../db');
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Banco de dados indisponível' });
      const { landingPageSellers } = await import('../../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      // Remover vínculos anteriores
      await db.delete(landingPageSellers).where(eq(landingPageSellers.landingPageId, input.landingPageId));
      // Inserir novos vínculos
      const sellerLinks = sellers.map((s) => ({
        landingPageId: input.landingPageId,
        sellerId: s.id,
        sellerName: s.name,
      }));
      await db.insert(landingPageSellers).values(sellerLinks);
      return { success: true, assignedSellers: sellers };
    }),

  updateLandingPage: franchiseeProcedure
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().min(3).max(120).optional(),
      procedure: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const franchiseId = ctx.homenzUser.franchise_id;
      if (!franchiseId) throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem franquia associada' });

      // Verificar que a LP pertence à franquia do usuário
      const { data: existing } = await supabaseAdmin
        .from('franchise_landing_pages')
        .select('id, franchise_id')
        .eq('id', input.id)
        .eq('franchise_id', franchiseId)
        .single();
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND', message: 'Landing page não encontrada' });

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (input.title !== undefined) updateData.title = input.title;
      if (input.procedure !== undefined) updateData.procedure = input.procedure;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.state !== undefined) updateData.state = input.state;

      const { data, error } = await supabaseAdmin
        .from('franchise_landing_pages')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
      return data;
    }),
});

