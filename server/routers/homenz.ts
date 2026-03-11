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
      
      // Calcular métricas por franquia
      const franchisesWithStats = stats.franchises.map((f) => {
        const franchiseLeads = stats.leads.filter((l) => l.franchise_id === f.id);
        const franchiseSellers = stats.sellers.filter((s) => s.franchise_id === f.id);
        const hot = franchiseLeads.filter((l) => l.temperature === "hot").length;
        const warm = franchiseLeads.filter((l) => l.temperature === "warm").length;
        const cold = franchiseLeads.filter((l) => l.temperature === "cold").length;
        const scheduled = franchiseLeads.filter((l) => l.funnel_step === "scheduled").length;
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
      const totalScheduled = stats.leads.filter((l) => l.funnel_step === "scheduled").length;
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

      const [franchise, leads, sellers, metrics] = await Promise.all([
        getFranchiseById(targetFranchiseId),
        getLeadsByFranchise(targetFranchiseId),
        getSellersByFranchise(targetFranchiseId),
        getAllSellerMetrics(targetFranchiseId),
      ]);

      const hot = leads.filter((l) => l.temperature === "hot").length;
      const warm = leads.filter((l) => l.temperature === "warm").length;
      const cold = leads.filter((l) => l.temperature === "cold").length;
      const scheduled = leads.filter((l) => l.funnel_step === "scheduled").length;
      const avgScore = leads.length > 0
        ? Math.round(leads.reduce((acc, l) => acc + (l.lead_score || 0), 0) / leads.length)
        : 0;

      // Enriquecer métricas com nome do vendedor
      const sellersWithMetrics = sellers.map((s) => {
        const m = metrics.find((m) => m.seller_id === s.id);
        return {
          ...s,
          metrics: m ?? null,
          leadsAssigned: leads.filter((l) => l.assigned_to === s.id).length,
        };
      });

      // Funil de conversão
      const funnelSteps = [
        { step: "Leads recebidos", key: "all" },
        { step: "Chat iniciado", key: "chat_started" },
        { step: "Chat concluído", key: "chat_done" },
        { step: "Fotos enviadas", key: "photos_done" },
        { step: "IA processada", key: "ai_done" },
        { step: "Agendado", key: "scheduled" },
      ];

      const funnel = funnelSteps.map((f, i) => {
        const count = f.key === "all" 
          ? leads.length 
          : leads.filter((l) => l.funnel_step === f.key || 
              (f.key === "chat_started" && ["chat_started", "chat_done", "photos_started", "photos_done", "ai_processing", "ai_done", "schedule_started", "scheduled"].includes(l.funnel_step))
            ).length;
        return {
          ...f,
          count,
          pct: leads.length > 0 ? Math.round((count / leads.length) * 100) : 0,
        };
      });

      return {
        franchise,
        leads: leads.slice(0, 20), // últimos 20 leads
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
      return { token, inviteUrl: `${origin}/join?token=${token}` };
    }),

  // ── Vendedor: visão dos leads ─────────────────────────────────────────────

  sellerDashboard: supabaseProcedure
    .query(async ({ ctx }) => {
      if (ctx.homenzUser.role !== "seller") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a vendedores" });
      }

      const [leads, metrics] = await Promise.all([
        getLeadsBySeller(ctx.homenzUser.id),
        getSellerMetrics(ctx.homenzUser.id, ctx.homenzUser.franchise_id!),
      ]);

      const hot = leads.filter((l) => l.temperature === "hot");
      const warm = leads.filter((l) => l.temperature === "warm");
      const cold = leads.filter((l) => l.temperature === "cold");

      return {
        leads: { hot, warm, cold, all: leads },
        metrics,
        stats: {
          totalLeads: leads.length,
          hotLeads: hot.length,
          warmLeads: warm.length,
          coldLeads: cold.length,
          scheduledLeads: leads.filter((l) => l.funnel_step === "scheduled").length,
        },
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
      return data;
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

      // Criar a franquia (inativa até pagamento)
      const franchiseInsert: Record<string, unknown> = {
        name: input.franchiseName,
        slug,
        city: input.city,
        state: input.state.toUpperCase(),
        plan: "free",
        active: false, // Ativa após pagamento
      };
      // Adicionar address apenas se a coluna existir (migration pendente)
      if (input.address) {
        franchiseInsert.address = input.address;
      }

      const { data: franchise, error: franchiseErr } = await supabaseAdmin
        .from("franchises")
        .insert(franchiseInsert)
        .select("id")
        .single();

      if (franchiseErr || !franchise) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Erro ao criar franquia: ${franchiseErr?.message}` });
      }

      // Criar o perfil do franqueado (inativo até pagamento)
      const passwordHash = await hashPassword(input.password);
      const profileInsert: Record<string, unknown> = {
        name: input.name,
        email: input.email.toLowerCase(),
        password_hash: passwordHash,
        role: "franchisee" as UserRole,
        franchise_id: franchise.id,
        phone: input.whatsapp,
        active: false, // Ativa após pagamento Stripe
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

      // Não fazer login automático — conta inativa até pagamento
      // Retornar dados para redirecionar para /planos
      return {
        email: input.email.toLowerCase(),
        franchiseId: franchise.id,
        franchiseSlug: slug,
        message: "Conta criada! Complete o pagamento para ativar o acesso.",
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
});
