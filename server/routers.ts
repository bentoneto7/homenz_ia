import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { nanoid } from "nanoid";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  getDb, upsertUser, getUserByOpenId,
  getClinicBySlug, getClinicForUser, getLeadByToken,
  updateLeadFunnelStep, getPlanLimits,
} from "./db";
import {
  clinics, clinicUsers, leads, leadPhotos,
  aiResults, appointments, notifications, npsResponses,
  planLimits, treatments, users, accessInvites, accessInviteUses,
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

// ── Helpers ──────────────────────────────────────────────────────────────────

const clinicProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const clinic = await getClinicForUser(ctx.user.id);
  if (!clinic) throw new TRPCError({ code: "FORBIDDEN", message: "Nenhuma clínica associada" });
  return next({ ctx: { ...ctx, clinic } });
});

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

async function requireLeadByToken(sessionToken: string) {
  const lead = await getLeadByToken(sessionToken);
  if (!lead) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado" });
  return lead;
}

async function insertNotification(data: {
  clinicId: number;
  targetType: "clinic" | "lead";
  leadId?: number;
  title: string;
  content: string;
  type: "new_lead" | "chat_completed" | "photos_uploaded" | "ai_ready" | "appointment_new" | "appointment_confirmed" | "appointment_cancelled" | "appointment_reminder" | "treatment_followup" | "nps_request";
  channel?: "platform" | "whatsapp" | "email" | "sms";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    clinicId: data.clinicId,
    targetType: data.targetType,
    leadId: data.leadId,
    title: data.title,
    content: data.content,
    type: data.type,
    channel: data.channel ?? "platform",
  });
}

// ── Helper de eventos de jornada ────────────────────────────────────────────
async function insertLeadEvent(data: {
  clinicId: number;
  leadId: number;
  eventType: string;
  description?: string;
  metadata?: Record<string, unknown>;
  triggeredBy?: "system" | "lead" | "clinic";
}) {
  try {
    const db = await getDb();
    if (!db) return;
    const { leadEvents } = await import("../drizzle/schema");
    await db.insert(leadEvents).values({
      clinicId: data.clinicId,
      leadId: data.leadId,
      eventType: data.eventType as any,
      description: data.description,
      metadata: data.metadata ?? null,
      triggeredBy: data.triggeredBy ?? "system",
    });
  } catch (e) {
    // Não quebrar o fluxo principal se o evento falhar
    console.warn("[leadEvent] Failed to insert:", e);
  }
}
// ── Router ───────────────────────────────────────────────────────────────────

import { homenzRouter } from "./routers/homenz";

export const appRouter = router({
  system: systemRouter,
  homenz: homenzRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    myClinic: protectedProcedure.query(async ({ ctx }) => {
      return getClinicForUser(ctx.user.id);
    }),
  }),

  // ── CLÍNICAS ───────────────────────────────────────────────────────────────
  clinic: router({
    // Buscar clínica pelo slug (público — para landing page)
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const clinic = await getClinicBySlug(input.slug);
        if (!clinic || !clinic.active)
          throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada" });
        // Retornar apenas dados públicos
        return {
          id: clinic.id,
          slug: clinic.slug,
          name: clinic.name,
          city: clinic.city,
          state: clinic.state,
          bio: clinic.bio,
          logoUrl: clinic.logoUrl,
          coverUrl: clinic.coverUrl,
          services: clinic.services,
          workingHours: clinic.workingHours,
          whatsapp: clinic.whatsapp,
        };
      }),

    // Criar clínica (onboarding)
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(3),
          slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
          ownerName: z.string().min(3),
          email: z.string().email(),
          phone: z.string().min(8),
          whatsapp: z.string().min(8),
          city: z.string().min(2),
          state: z.string().length(2),
          address: z.string().optional(),
          zipCode: z.string().optional(),
          cnpj: z.string().optional(),
          bio: z.string().optional(),
          services: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        // Verificar se slug já existe
        const existing = await getClinicBySlug(input.slug);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Este link já está em uso" });

        // Verificar se usuário já tem clínica
        const myClinic = await getClinicForUser(ctx.user.id);
        if (myClinic) throw new TRPCError({ code: "CONFLICT", message: "Você já possui uma clínica cadastrada" });

        const inserted = await db.insert(clinics).values({
          ...input,
          ownerUserId: ctx.user.id,
          plan: "free",
          active: true,
          services: input.services ?? [],
          workingHours: {
            mon: [{ start: "09:00", end: "18:00" }],
            tue: [{ start: "09:00", end: "18:00" }],
            wed: [{ start: "09:00", end: "18:00" }],
            thu: [{ start: "09:00", end: "18:00" }],
            fri: [{ start: "09:00", end: "18:00" }],
            sat: [],
            sun: [],
          },
        });

        const clinicId = Number((inserted as any)[0]?.insertId ?? (inserted as any).insertId);

        // Adicionar owner como membro
        await db.insert(clinicUsers).values({
          clinicId,
          userId: ctx.user.id,
          role: "owner",
          active: true,
          acceptedAt: new Date(),
        });

        // Seed plan_limits se não existir
        await seedPlanLimits(db);

        await notifyOwner({
          title: "Nova clínica cadastrada!",
          content: `${input.name} (${input.city}/${input.state}) acabou de se cadastrar.`,
        });

        return { clinicId, slug: input.slug };
      }),

    // Atualizar dados da clínica
    update: clinicProcedure
      .input(
        z.object({
          name: z.string().optional(),
          bio: z.string().optional(),
          phone: z.string().optional(),
          whatsapp: z.string().optional(),
          address: z.string().optional(),
          zipCode: z.string().optional(),
          services: z.array(z.string()).optional(),
          workingHours: z.record(z.string(), z.unknown()).optional(),
          notifyWhatsapp: z.string().optional(),
          notifyEmail: z.string().optional(),
          googleCalendarId: z.string().optional(),
          calComApiKey: z.string().optional(),
          calComEventTypeId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(clinics).set(input as any).where(eq(clinics.id, ctx.clinic.id));
        return { success: true };
      }),

    // Minha clínica (painel)
    mine: clinicProcedure.query(async ({ ctx }) => ctx.clinic),

    // Estatísticas da clínica
    stats: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const allLeads = await db
        .select()
        .from(leads)
        .where(eq(leads.clinicId, ctx.clinic.id));

      const total = allLeads.length;
      const byStep = allLeads.reduce((acc, l) => {
        acc[l.funnelStep] = (acc[l.funnelStep] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const scheduled = allLeads.filter((l) =>
        ["scheduled", "confirmed", "completed"].includes(l.funnelStep)
      ).length;

      const conversionRate = total > 0 ? Math.round((scheduled / total) * 100) : 0;

      const avgScore = allLeads
        .filter((l) => l.leadScore !== null)
        .reduce((sum, l, _, arr) => sum + (l.leadScore ?? 0) / arr.length, 0);

      const unreadNotifs = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.clinicId, ctx.clinic.id),
            eq(notifications.targetType, "clinic"),
            eq(notifications.read, false)
          )
        );

      return {
        total,
        byStep,
        scheduled,
        conversionRate,
        avgScore: Math.round(avgScore),
        unreadNotifications: unreadNotifs[0]?.count ?? 0,
      };
    }),
  }),

  // ── LEADS ──────────────────────────────────────────────────────────────────
  leads: router({
    // Criar lead (landing page pública)
    create: publicProcedure
      .input(
        z.object({
          clinicSlug: z.string(),
          name: z.string().min(2),
          phone: z.string().min(8),
          email: z.string().email().optional(),
          region: z.string().optional(),
          // UTMs capturados da URL
          utmSource: z.string().optional(),
          utmMedium: z.string().optional(),
          utmCampaign: z.string().optional(),
          utmContent: z.string().optional(),
          utmTerm: z.string().optional(),
          referrer: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const clinic = await getClinicBySlug(input.clinicSlug);
        if (!clinic || !clinic.active)
          throw new TRPCError({ code: "NOT_FOUND", message: "Clínica não encontrada" });

        // Verificar limite do plano
        const limits = await getPlanLimits(clinic.plan);
        if (limits && limits.leadsPerMonth !== -1 && clinic.currentMonthLeads >= limits.leadsPerMonth) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Limite de leads do plano atingido" });
        }

        const sessionToken = nanoid(32);
        const inserted = await db.insert(leads).values({
          clinicId: clinic.id,
          name: input.name,
          phone: input.phone,
          email: input.email,
          region: input.region ?? clinic.city,
          utmSource: input.utmSource,
          utmMedium: input.utmMedium,
          utmCampaign: input.utmCampaign,
          utmContent: input.utmContent,
          utmTerm: input.utmTerm,
          referrer: input.referrer,
          sessionToken,
          funnelStep: "form_done",
          lastActivityAt: new Date(),
        });

        // Incrementar contador mensal
        await db
          .update(clinics)
          .set({ currentMonthLeads: sql`${clinics.currentMonthLeads} + 1` })
          .where(eq(clinics.id, clinic.id));

        // Notificação para a clínica
        await insertNotification({
          clinicId: clinic.id,
          targetType: "clinic",
          leadId: Number((inserted as any)[0]?.insertId ?? (inserted as any).insertId),
          title: "Novo lead capturado!",
          content: `${input.name} (${input.phone}) iniciou o diagnóstico.${input.utmSource ? ` Origem: ${input.utmSource}` : ""}`,
          type: "new_lead",
        });

         await notifyOwner({
          title: `Novo lead — ${clinic.name}`,
          content: `${input.name} (${input.phone}) via ${input.utmCampaign ?? "orgânico"}.`,
        });
        const leadId = Number((inserted as any)[0]?.insertId ?? (inserted as any).insertId);
        // Registrar evento de jornada
        await insertLeadEvent({
          clinicId: clinic.id,
          leadId,
          eventType: "lead_created",
          description: `Lead ${input.name} capturado via formulário`,
          metadata: {
            utmSource: input.utmSource,
            utmCampaign: input.utmCampaign,
            phone: input.phone,
          },
          triggeredBy: "lead",
        });
        return { sessionToken, clinicSlug: clinic.slug };
      }),

    // Buscar lead pelo token
    getByToken: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const lead = await requireLeadByToken(input.sessionToken);
        // Retornar apenas dados não-sensíveis
        return {
          id: lead.id,
          name: lead.name,
          funnelStep: lead.funnelStep,
          gender: lead.gender,
          age: lead.age,
          leadScore: lead.leadScore,
          priority: lead.priority,
        };
      }),

    // Salvar respostas do chat
    saveChatAnswers: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          gender: z.enum(["male", "female", "other"]).optional(),
          age: z.number().optional(),
          hairProblem: z.string().optional(),
          hairLossType: z.enum(["frontal", "vertex", "total", "diffuse", "temporal", "other"]).optional(),
          hairLossTime: z.string().optional(),
          previousTreatments: z.string().optional(),
          expectations: z.string().optional(),
          howDidYouHear: z.string().optional(),
          chatAnswers: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);
        const { sessionToken, chatAnswers, ...rest } = input;

        await db
          .update(leads)
          .set({
            ...rest,
            chatAnswers: chatAnswers ?? {},
            funnelStep: "chat_done",
            lastActivityAt: new Date(),
          })
          .where(eq(leads.id, lead.id));

         await insertNotification({
          clinicId: lead.clinicId,
          targetType: "clinic",
          leadId: lead.id,
          title: "Chat concluído",
          content: `${lead.name} completou o diagnóstico conversacional.`,
          type: "chat_completed",
        });
        await insertLeadEvent({
          clinicId: lead.clinicId,
          leadId: lead.id,
          eventType: "chat_completed",
          description: `${lead.name} completou o chat de diagnóstico`,
          metadata: { hairProblem: input.hairProblem, hairLossType: input.hairLossType },
          triggeredBy: "lead",
        });
        return { success: true };
      }),
    // Atualizar funnelStepp
    updateStep: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          funnelStep: z.enum([
            "landing", "form_started", "form_done", "chat_started", "chat_done",
            "photos_started", "photos_done", "ai_processing", "ai_done",
            "schedule_started", "scheduled", "confirmed", "completed", "cancelled",
          ]),
        })
      )
      .mutation(async ({ input }) => {
        const lead = await requireLeadByToken(input.sessionToken);
        await updateLeadFunnelStep(lead.id, input.funnelStep);
        return { success: true };
      }),

    // Admin/Clínica: listar leads
    list: clinicProcedure
      .input(
        z.object({
          funnelStep: z.string().optional(),
          priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
          limit: z.number().default(50),
          offset: z.number().default(0),
        })
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const conditions = [eq(leads.clinicId, ctx.clinic.id)];
        if (input.funnelStep) conditions.push(eq(leads.funnelStep, input.funnelStep as any));
        if (input.priority) conditions.push(eq(leads.priority, input.priority));
        return db
          .select()
          .from(leads)
          .where(and(...conditions))
          .orderBy(desc(leads.createdAt))
          .limit(input.limit)
          .offset(input.offset);
      }),

    // Admin/Clínica: detalhe do lead
    getById: clinicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db
          .select()
          .from(leads)
          .where(and(eq(leads.id, input.id), eq(leads.clinicId, ctx.clinic.id)))
          .limit(1);
        if (!result[0]) throw new TRPCError({ code: "NOT_FOUND" });
        return result[0];
      }),
  }),

  // ── FOTOS ──────────────────────────────────────────────────────────────────
  photos: router({
    upload: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          photoType: z.enum(["front", "top", "left", "right"]),
          base64: z.string(),
          keypoints: z
            .array(z.object({ x: z.number(), y: z.number(), label: z.string() }))
            .optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);

        const base64Data = input.base64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const mimeType = input.base64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
        const ext = mimeType === "image/png" ? "png" : "jpg";
        const fileKey = `clinics/${lead.clinicId}/leads/${lead.id}/photos/${input.photoType}-${nanoid(8)}.${ext}`;

        const { url } = await storagePut(fileKey, buffer, mimeType);

        await db.insert(leadPhotos).values({
          leadId: lead.id,
          clinicId: lead.clinicId,
          photoType: input.photoType,
          s3Key: fileKey,
          s3Url: url,
          keypoints: input.keypoints ?? [],
        });

        const photos = await db
          .select()
          .from(leadPhotos)
          .where(eq(leadPhotos.leadId, lead.id));

        if (photos.length >= 1) {
          await updateLeadFunnelStep(lead.id, "photos_done");
        }

         if (photos.length === 1) {
          await insertNotification({
            clinicId: lead.clinicId,
            targetType: "clinic",
            leadId: lead.id,
            title: "Fotos recebidas!",
            content: `${lead.name} enviou fotos para análise.`,
            type: "photos_uploaded",
          });
          await insertLeadEvent({
            clinicId: lead.clinicId,
            leadId: lead.id,
            eventType: "photos_started",
            description: `${lead.name} iniciou o envio de fotos`,
            triggeredBy: "lead",
          });
        }
        if (photos.length >= 2) {
          await insertLeadEvent({
            clinicId: lead.clinicId,
            leadId: lead.id,
            eventType: "photos_completed",
            description: `${lead.name} completou o envio de ${photos.length} fotos`,
            metadata: { totalPhotos: photos.length },
            triggeredBy: "lead",
          });
        }
        return { url, totalPhotos: photos.length };
      }),

    listByToken: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);
        return db.select().from(leadPhotos).where(eq(leadPhotos.leadId, lead.id));
      }),

    listByLeadId: clinicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return db
          .select()
          .from(leadPhotos)
          .where(and(eq(leadPhotos.leadId, input.leadId), eq(leadPhotos.clinicId, ctx.clinic.id)));
      }),
  }),

  // ── IA ─────────────────────────────────────────────────────────────────────
  ai: router({
    processPhotos: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);

        // Verificar limite do plano
        const clinic = await db
          .select()
          .from(clinics)
          .where(eq(clinics.id, lead.clinicId))
          .limit(1);
        if (!clinic[0]) throw new TRPCError({ code: "NOT_FOUND" });

        const limits = await getPlanLimits(clinic[0].plan);
        if (limits && limits.aiAnalysesPerMonth !== -1 && clinic[0].currentMonthAiAnalyses >= limits.aiAnalysesPerMonth) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Limite de análises do plano atingido" });
        }

        // Verificar resultado existente
        const existing = await db
          .select()
          .from(aiResults)
          .where(eq(aiResults.leadId, lead.id))
          .limit(1);

        if (existing[0]?.processingStatus === "done") {
          return { resultId: existing[0].id, status: "done" };
        }

        let resultId: number;
        if (existing[0]) {
          resultId = existing[0].id;
          await db.update(aiResults).set({ processingStatus: "processing" }).where(eq(aiResults.id, resultId));
        } else {
          const ins = await db.insert(aiResults).values({
            leadId: lead.id,
            clinicId: lead.clinicId,
            processingStatus: "processing",
          });
          resultId = Number((ins as any)[0]?.insertId ?? (ins as any).insertId);
        }

        await updateLeadFunnelStep(lead.id, "ai_processing");

        const photos = await db
          .select()
          .from(leadPhotos)
          .where(eq(leadPhotos.leadId, lead.id));

        if (photos.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma foto encontrada" });
        }

        try {
          // Análise com LLM
          const photoMessages = photos.map((p) => ({
            type: "image_url" as const,
            image_url: { url: p.s3Url, detail: "high" as const },
          }));

          const analysisResp = await invokeLLM({
            messages: [
              {
                role: "system",
                content: `Você é um especialista em tricologia e preenchimento capilar. Analise as fotos e retorne JSON com:
- baldnessLevel: nível na escala Norwood (homens: I-VII) ou Ludwig (mulheres: I-III)
- baldnessScale: "norwood" ou "ludwig"
- affectedAreas: array com áreas afetadas (frontal, temporal, vertex, coronal, diffuse)
- densityEstimate: estimativa de densidade (ex: "30% da densidade normal no vertex")
- recommendedTreatment: tratamento recomendado em português
- estimatedSessions: número de sessões estimadas (inteiro)
- analysisText: laudo completo em português (2-3 parágrafos)
- leadScore: pontuação 0-100 baseada em: urgência da calvície (40pts), expectativa realista (30pts), histórico de tratamentos (30pts)
- leadScoreBreakdown: objeto com { baldnessWeight, expectationWeight, historyWeight }
- priority: "low", "medium", "high" ou "urgent"`,
              },
              {
                role: "user",
                content: [
                  {
                    type: "text" as const,
                    text: `Paciente: ${lead.name}, gênero: ${lead.gender ?? "não informado"}, idade: ${lead.age ?? "não informada"}. Problema: ${lead.hairProblem ?? "queda capilar"}. Tipo: ${lead.hairLossType ?? "não informado"}. Há quanto tempo: ${lead.hairLossTime ?? "não informado"}. Tratamentos anteriores: ${lead.previousTreatments ?? "nenhum"}. Expectativas: ${lead.expectations ?? "não informadas"}.`,
                  },
                  ...photoMessages,
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "hair_analysis",
                strict: true,
                schema: {
                  type: "object",
                  properties: {
                    baldnessLevel: { type: "string" },
                    baldnessScale: { type: "string" },
                    affectedAreas: { type: "array", items: { type: "string" } },
                    densityEstimate: { type: "string" },
                    recommendedTreatment: { type: "string" },
                    estimatedSessions: { type: "number" },
                    analysisText: { type: "string" },
                    leadScore: { type: "number" },
                    leadScoreBreakdown: {
                      type: "object",
                      properties: {
                        baldnessWeight: { type: "number" },
                        expectationWeight: { type: "number" },
                        historyWeight: { type: "number" },
                      },
                      required: ["baldnessWeight", "expectationWeight", "historyWeight"],
                      additionalProperties: false,
                    },
                    priority: { type: "string" },
                  },
                  required: [
                    "baldnessLevel", "baldnessScale", "affectedAreas", "densityEstimate",
                    "recommendedTreatment", "estimatedSessions", "analysisText",
                    "leadScore", "leadScoreBreakdown", "priority",
                  ],
                  additionalProperties: false,
                },
              },
            },
          });

          const rawContent = analysisResp.choices[0]?.message?.content;
          const analysis = JSON.parse(typeof rawContent === "string" ? rawContent : "{}");

          // Gerar imagem simulada pós-preenchimento
          const frontPhoto = photos.find((p) => p.photoType === "front") ?? photos[0];
          let afterImageUrl = frontPhoto.s3Url;
          try {
            const imgResult = await generateImage({
              prompt: `Realistic hair filling treatment result simulation. Natural-looking hair fibers covering the affected areas (${(analysis.affectedAreas as string[])?.join(", ")}). Same person, same face, professional clinical result, photorealistic, high quality.`,
              originalImages: [{ url: frontPhoto.s3Url, mimeType: "image/jpeg" }],
            });
            afterImageUrl = imgResult.url ?? frontPhoto.s3Url;
          } catch (imgErr) {
            console.warn("[AI] Image generation failed, using original:", imgErr);
          }

          // Salvar resultado
          await db.update(aiResults).set({
            analysisText: analysis.analysisText,
            baldnessLevel: analysis.baldnessLevel,
            baldnessScale: analysis.baldnessScale,
            affectedAreas: analysis.affectedAreas,
            densityEstimate: analysis.densityEstimate,
            beforeImageUrl: frontPhoto.s3Url,
            afterImageUrl,
            recommendedTreatment: analysis.recommendedTreatment,
            estimatedSessions: analysis.estimatedSessions,
            leadScore: analysis.leadScore,
            leadScoreBreakdown: analysis.leadScoreBreakdown,
            processingStatus: "done",
          }).where(eq(aiResults.id, resultId));

          // Atualizar lead com score e prioridade
          await db.update(leads).set({
            leadScore: analysis.leadScore,
            leadScoreBreakdown: analysis.leadScoreBreakdown,
            priority: analysis.priority as any,
            funnelStep: "ai_done",
            lastActivityAt: new Date(),
          }).where(eq(leads.id, lead.id));

          // Incrementar contador de análises
          await db.update(clinics).set({
            currentMonthAiAnalyses: sql`${clinics.currentMonthAiAnalyses} + 1`,
          }).where(eq(clinics.id, lead.clinicId));

          // Notificações
          await insertNotification({
            clinicId: lead.clinicId,
            targetType: "clinic",
            leadId: lead.id,
            title: "Análise 3D concluída!",
            content: `${lead.name} — Score: ${analysis.leadScore}/100 | Nível: ${analysis.baldnessLevel} | Prioridade: ${analysis.priority}`,
            type: "ai_ready",
          });

          await notifyOwner({
            title: `Análise pronta — ${lead.name}`,
            content: `Score: ${analysis.leadScore}/100 | ${analysis.baldnessLevel} | ${analysis.priority}`,
          });
          await insertLeadEvent({
            clinicId: lead.clinicId,
            leadId: lead.id,
            eventType: "ai_result_ready",
            description: `Análise 3D concluída — Score ${analysis.leadScore}/100, nível ${analysis.baldnessLevel}`,
            metadata: { leadScore: analysis.leadScore, priority: analysis.priority, baldnessLevel: analysis.baldnessLevel },
            triggeredBy: "system",
          });
          return { resultId, status: "done" };;
        } catch (err) {
          await db.update(aiResults).set({
            processingStatus: "error",
            errorMessage: String(err),
          }).where(eq(aiResults.id, resultId));
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar análise" });
        }
      }),

    getResultByToken: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);
        const result = await db
          .select()
          .from(aiResults)
          .where(eq(aiResults.leadId, lead.id))
          .limit(1);
        return result[0] ?? null;
      }),

    getResultByLeadId: clinicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db
          .select()
          .from(aiResults)
          .where(and(eq(aiResults.leadId, input.leadId), eq(aiResults.clinicId, ctx.clinic.id)))
          .limit(1);
        return result[0] ?? null;
      }),
  }),

  // ── AGENDAMENTOS ───────────────────────────────────────────────────────────
  appointments: router({
    create: publicProcedure
      .input(
        z.object({
          sessionToken: z.string(),
          scheduledAt: z.number(),
          consultationType: z.enum(["evaluation", "procedure", "followup"]).default("evaluation"),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);
        const scheduledDate = new Date(input.scheduledAt);

        const ins = await db.insert(appointments).values({
          clinicId: lead.clinicId,
          leadId: lead.id,
          scheduledAt: scheduledDate,
          consultationType: input.consultationType,
          attendantNotes: input.notes,
          status: "pending",
          confirmationSent: false,
          reminderSent: false,
        });

        const appointmentId = Number((ins as any)[0]?.insertId ?? (ins as any).insertId);

        await updateLeadFunnelStep(lead.id, "scheduled");

        const dateStr = scheduledDate.toLocaleDateString("pt-BR");
        const timeStr = scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        // Notificação para a clínica
        await insertNotification({
          clinicId: lead.clinicId,
          targetType: "clinic",
          leadId: lead.id,
          title: "Novo agendamento!",
          content: `${lead.name} agendou para ${dateStr} às ${timeStr}. Telefone: ${lead.phone}`,
          type: "appointment_new",
        });

        // Confirmação para o lead
        await insertNotification({
          clinicId: lead.clinicId,
          targetType: "lead",
          leadId: lead.id,
          title: "Agendamento recebido!",
          content: `Seu agendamento para ${dateStr} às ${timeStr} foi recebido. Em breve a clínica confirmará.`,
          type: "appointment_confirmed",
        });

        await db.update(appointments).set({ confirmationSent: true }).where(eq(appointments.id, appointmentId));

        await notifyOwner({
          title: "Novo agendamento!",
          content: `${lead.name} (${lead.phone}) — ${dateStr} às ${timeStr}`,
        });
        await insertLeadEvent({
          clinicId: lead.clinicId,
          leadId: lead.id,
          eventType: "appointment_scheduled",
          description: `Consulta agendada para ${dateStr} às ${timeStr}`,
          metadata: { appointmentId, scheduledAt: scheduledDate.toISOString() },
          triggeredBy: "lead",
        });
        return { appointmentId };;
      }),

    getByToken: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);
        const result = await db
          .select()
          .from(appointments)
          .where(eq(appointments.leadId, lead.id))
          .orderBy(desc(appointments.createdAt))
          .limit(1);
        return result[0] ?? null;
      }),

    list: clinicProcedure
      .input(z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const conditions = [eq(appointments.clinicId, ctx.clinic.id)];
        if (input.status) conditions.push(eq(appointments.status, input.status as any));
        return db
          .select()
          .from(appointments)
          .where(and(...conditions))
          .orderBy(desc(appointments.scheduledAt))
          .limit(input.limit)
          .offset(input.offset);
      }),

    updateStatus: clinicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
        notes: z.string().optional(),
        cancellationReason: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        await db.update(appointments).set({
          status: input.status,
          attendantNotes: input.notes,
          cancellationReason: input.cancellationReason,
        }).where(and(eq(appointments.id, input.id), eq(appointments.clinicId, ctx.clinic.id)));

        const appt = await db.select().from(appointments).where(eq(appointments.id, input.id)).limit(1);
        if (!appt[0]) return { success: true };

        const lead = await db.select().from(leads).where(eq(leads.id, appt[0].leadId)).limit(1);
        if (!lead[0]) return { success: true };

        const dateStr = new Date(appt[0].scheduledAt).toLocaleDateString("pt-BR");
        const timeStr = new Date(appt[0].scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

        if (input.status === "confirmed") {
          await updateLeadFunnelStep(lead[0].id, "confirmed");
          await insertNotification({
            clinicId: ctx.clinic.id,
            targetType: "lead",
            leadId: lead[0].id,
            title: "Consulta confirmada!",
            content: `Sua consulta em ${dateStr} às ${timeStr} foi confirmada. Até lá!`,
            type: "appointment_confirmed",
          });
        } else if (input.status === "cancelled") {
          await updateLeadFunnelStep(lead[0].id, "cancelled");
          await insertNotification({
            clinicId: ctx.clinic.id,
            targetType: "lead",
            leadId: lead[0].id,
            title: "Agendamento cancelado",
            content: `Seu agendamento de ${dateStr} foi cancelado.${input.cancellationReason ? ` Motivo: ${input.cancellationReason}` : ""}`,
            type: "appointment_cancelled",
          });
        } else if (input.status === "completed") {
          await updateLeadFunnelStep(lead[0].id, "completed");
          // Disparar NPS após 24h (simulado como notificação imediata aqui)
          await insertNotification({
            clinicId: ctx.clinic.id,
            targetType: "lead",
            leadId: lead[0].id,
            title: "Como foi sua consulta?",
            content: "Gostaríamos de saber sua opinião sobre o atendimento. Avalie sua experiência!",
            type: "nps_request",
          });
        }

        return { success: true };
      }),
  }),

  // ── NOTIFICAÇÕES ───────────────────────────────────────────────────────────
  notifications: router({
    getByToken: publicProcedure
      .input(z.object({ sessionToken: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);
        return db
          .select()
          .from(notifications)
          .where(and(eq(notifications.targetType, "lead"), eq(notifications.leadId, lead.id)))
          .orderBy(desc(notifications.createdAt));
      }),

    listClinic: clinicProcedure
      .input(z.object({ unreadOnly: z.boolean().default(false) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const conditions = [eq(notifications.clinicId, ctx.clinic.id), eq(notifications.targetType, "clinic")];
        if (input.unreadOnly) conditions.push(eq(notifications.read, false));
        return db
          .select()
          .from(notifications)
          .where(and(...conditions))
          .orderBy(desc(notifications.createdAt))
          .limit(100);
      }),

    markRead: clinicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(notifications).set({ read: true })
          .where(and(eq(notifications.id, input.id), eq(notifications.clinicId, ctx.clinic.id)));
        return { success: true };
      }),

    markAllRead: clinicProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(notifications).set({ read: true })
        .where(and(eq(notifications.clinicId, ctx.clinic.id), eq(notifications.targetType, "clinic")));
      return { success: true };
    }),

    unreadCount: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(and(
          eq(notifications.clinicId, ctx.clinic.id),
          eq(notifications.targetType, "clinic"),
          eq(notifications.read, false),
        ));
      return { count: result[0]?.count ?? 0 };
    }),
  }),

  // ── DISPONIBILIDADE (agendamento próprio) ───────────────────────────────────────
  availability: router({
    // Listar configurações de disponibilidade da clínica
    list: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicAvailability } = await import("../drizzle/schema");
      return db.select().from(clinicAvailability)
        .where(eq(clinicAvailability.clinicId, ctx.clinic.id))
        .orderBy(clinicAvailability.dayOfWeek);
    }),

    // Salvar configurações de disponibilidade (substitui todas as existentes)
    save: clinicProcedure
      .input(z.array(z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        slotDurationMinutes: z.number().default(60),
        breakBetweenMinutes: z.number().default(0),
        maxConcurrentAppointments: z.number().default(1),
        active: z.boolean().default(true),
      })))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinicAvailability } = await import("../drizzle/schema");
        // Deletar todas as configurações atuais
        await db.delete(clinicAvailability).where(eq(clinicAvailability.clinicId, ctx.clinic.id));
        // Inserir as novas
        if (input.length > 0) {
          await db.insert(clinicAvailability).values(
            input.map(d => ({ ...d, clinicId: ctx.clinic.id }))
          );
        }
        return { success: true };
      }),

    // Buscar slots disponíveis para uma data específica (público)
    getSlots: publicProcedure
      .input(z.object({
        clinicId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // "YYYY-MM-DD"
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinicAvailability, clinicBlockedDates } = await import("../drizzle/schema");

        // Verificar se a data está bloqueada
        const blocked = await db.select().from(clinicBlockedDates)
          .where(and(
            eq(clinicBlockedDates.clinicId, input.clinicId),
            eq(clinicBlockedDates.blockedDate, input.date)
          )).limit(1);
        if (blocked.length > 0) return { slots: [], blocked: true, reason: blocked[0].reason };

        // Dia da semana da data solicitada
        const [year, month, day] = input.date.split("-").map(Number);
        const dateObj = new Date(year!, month! - 1, day!);
        const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

        // Buscar configuração de disponibilidade para esse dia
        const avail = await db.select().from(clinicAvailability)
          .where(and(
            eq(clinicAvailability.clinicId, input.clinicId),
            eq(clinicAvailability.dayOfWeek, dayOfWeek),
            eq(clinicAvailability.active, true)
          )).limit(1);

        if (!avail[0]) return { slots: [], blocked: false };

        const cfg = avail[0];
        const [startH, startM] = cfg.startTime.split(":").map(Number);
        const [endH, endM] = cfg.endTime.split(":").map(Number);
        const startMinutes = startH! * 60 + startM!;
        const endMinutes = endH! * 60 + endM!;
        const slotDur = cfg.slotDurationMinutes;
        const breakDur = cfg.breakBetweenMinutes;

        // Gerar todos os slots do dia
        const allSlots: string[] = [];
        let cur = startMinutes;
        while (cur + slotDur <= endMinutes) {
          const hh = String(Math.floor(cur / 60)).padStart(2, "0");
          const mm = String(cur % 60).padStart(2, "0");
          allSlots.push(`${hh}:${mm}`);
          cur += slotDur + breakDur;
        }

        // Buscar agendamentos já existentes para essa data
        const startOfDay = new Date(year!, month! - 1, day!, 0, 0, 0);
        const endOfDay = new Date(year!, month! - 1, day!, 23, 59, 59);
        const existingAppts = await db.select({ scheduledAt: appointments.scheduledAt })
          .from(appointments)
          .where(and(
            eq(appointments.clinicId, input.clinicId),
            sql`${appointments.scheduledAt} >= ${startOfDay}`,
            sql`${appointments.scheduledAt} <= ${endOfDay}`,
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
          ));

        // Marcar slots ocupados
        const bookedTimes = new Set(existingAppts.map(a => {
          const d = new Date(a.scheduledAt);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }));

        const slots = allSlots.map(time => ({
          time,
          available: !bookedTimes.has(time),
          datetime: `${input.date}T${time}:00`,
        }));

        return { slots, blocked: false };
      }),

    // Listar datas bloqueadas
    blockedDates: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicBlockedDates } = await import("../drizzle/schema");
      return db.select().from(clinicBlockedDates)
        .where(eq(clinicBlockedDates.clinicId, ctx.clinic.id))
        .orderBy(clinicBlockedDates.blockedDate);
    }),

    // Adicionar data bloqueada
    blockDate: clinicProcedure
      .input(z.object({ date: z.string(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinicBlockedDates } = await import("../drizzle/schema");
        await db.insert(clinicBlockedDates).values({
          clinicId: ctx.clinic.id,
          blockedDate: input.date,
          reason: input.reason,
        });
        return { success: true };
      }),

    // Remover data bloqueada
    unblockDate: clinicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinicBlockedDates } = await import("../drizzle/schema");
        await db.delete(clinicBlockedDates)
          .where(and(eq(clinicBlockedDates.id, input.id), eq(clinicBlockedDates.clinicId, ctx.clinic.id)));
        return { success: true };
      }),
  }),

  // ── NPS ─────────────────────────────────────────────────────────────────────────────
  nps: router({
    submit: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
        score: z.number().min(0).max(10),
        comment: z.string().optional(),
        allowTestimonial: z.boolean().default(false),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const lead = await requireLeadByToken(input.sessionToken);

        const category =
          input.score >= 9 ? "promoter" : input.score >= 7 ? "passive" : "detractor";

        await db.insert(npsResponses).values({
          clinicId: lead.clinicId,
          leadId: lead.id,
          score: input.score,
          category,
          comment: input.comment,
          allowTestimonial: input.allowTestimonial,
          sentAt: new Date(),
          respondedAt: new Date(),
        });

        return { success: true, category };
      }),

    listByClinic: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(npsResponses)
        .where(eq(npsResponses.clinicId, ctx.clinic.id))
        .orderBy(desc(npsResponses.createdAt))
        .limit(100);
    }),
  }),

  // ── JORNADA DO LEAD (timeline de eventos) ─────────────────────────────────────────
  journey: router({
    // Listar todos os eventos de um lead
    getTimeline: clinicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { leadEvents } = await import("../drizzle/schema");
        return db.select().from(leadEvents)
          .where(and(
            eq(leadEvents.leadId, input.leadId),
            eq(leadEvents.clinicId, ctx.clinic.id),
          ))
          .orderBy(leadEvents.createdAt);
      }),

    // Registrar evento manualmente (ex: contato via WhatsApp)
    addEvent: clinicProcedure
      .input(z.object({
        leadId: z.number(),
        eventType: z.enum([
          "lead_created", "chat_started", "chat_completed", "chat_abandoned",
          "photos_started", "photos_completed", "photos_abandoned",
          "ai_processing_started", "ai_result_ready", "schedule_opened",
          "appointment_created", "appointment_confirmed", "appointment_cancelled",
          "appointment_completed", "appointment_no_show", "followup_sent",
          "whatsapp_contacted", "nps_sent", "nps_responded", "status_changed",
        ]),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { leadEvents } = await import("../drizzle/schema");
        // Verificar que o lead pertence à clínica
        const lead = await db.select().from(leads)
          .where(and(eq(leads.id, input.leadId), eq(leads.clinicId, ctx.clinic.id)))
          .limit(1);
        if (!lead[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado" });
        await db.insert(leadEvents).values({
          clinicId: ctx.clinic.id,
          leadId: input.leadId,
          eventType: input.eventType,
          description: input.description,
          metadata: input.metadata ?? null,
          triggeredBy: "clinic",
          triggeredByUserId: ctx.user.id,
        });
        // Se foi contato WhatsApp, atualizar lastActivityAt do lead
        if (input.eventType === "whatsapp_contacted") {
          await db.update(leads).set({ lastActivityAt: new Date() })
            .where(eq(leads.id, input.leadId));
        }
        return { success: true };
      }),

    // Analytics do funil por clínica
    funnelAnalytics: clinicProcedure
      .input(z.object({
        startDate: z.number().optional(), // timestamp ms
        endDate: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();

        // Total de leads no período
        const totalLeads = await db.select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`,
          ));

        // Leads por etapa do funil
        const byStep = await db.select({
          funnelStep: leads.funnelStep,
          count: sql<number>`count(*)`,
        })
          .from(leads)
          .where(and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`,
          ))
          .groupBy(leads.funnelStep);

        // Agendamentos no período
        const apptStats = await db.select({
          status: appointments.status,
          count: sql<number>`count(*)`,
        })
          .from(appointments)
          .where(and(
            eq(appointments.clinicId, ctx.clinic.id),
            sql`${appointments.createdAt} >= ${startDate}`,
            sql`${appointments.createdAt} <= ${endDate}`,
          ))
          .groupBy(appointments.status);

        // Leads por UTM source
        const bySource = await db.select({
          utmSource: leads.utmSource,
          count: sql<number>`count(*)`,
        })
          .from(leads)
          .where(and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`,
          ))
          .groupBy(leads.utmSource)
          .orderBy(desc(sql<number>`count(*)`));

        // Leads por prioridade
        const byPriority = await db.select({
          priority: leads.priority,
          count: sql<number>`count(*)`,
        })
          .from(leads)
          .where(and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`,
          ))
          .groupBy(leads.priority);

        // Taxa de conversão: leads que chegaram em scheduled / total
        const scheduled = byStep.find(s => s.funnelStep === "scheduled")?.count ?? 0;
        const total = totalLeads[0]?.count ?? 0;
        const conversionRate = total > 0 ? Math.round((Number(scheduled) / Number(total)) * 100) : 0;

        // Leads abandonados (sem atividade há mais de 2 horas)
        const abandonedLeads = await db.select({ count: sql<number>`count(*)` })
          .from(leads)
          .where(and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.lastActivityAt} < ${new Date(Date.now() - 2 * 60 * 60 * 1000)}`,
            sql`${leads.funnelStep} NOT IN ('scheduled', 'confirmed', 'completed', 'cancelled')`,
          ));

        return {
          period: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
          totalLeads: Number(total),
          conversionRate,
          abandonedCount: Number(abandonedLeads[0]?.count ?? 0),
          byStep: byStep.map(s => ({ step: s.funnelStep, count: Number(s.count) })),
          bySource: bySource.map(s => ({ source: s.utmSource ?? "direto", count: Number(s.count) })),
          byPriority: byPriority.map(p => ({ priority: p.priority, count: Number(p.count) })),
          appointments: {
            total: apptStats.reduce((acc, a) => acc + Number(a.count), 0),
            confirmed: Number(apptStats.find(a => a.status === "confirmed")?.count ?? 0),
            completed: Number(apptStats.find(a => a.status === "completed")?.count ?? 0),
            cancelled: Number(apptStats.find(a => a.status === "cancelled")?.count ?? 0),
            noShow: Number(apptStats.find(a => a.status === "no_show")?.count ?? 0),
          },
        };
      }),

    // Leads que precisam de recuperação (abandonados no funil)
    getRecoveryLeads: clinicProcedure
      .input(z.object({
        hoursInactive: z.number().default(2),
        limit: z.number().default(50),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const cutoff = new Date(Date.now() - input.hoursInactive * 60 * 60 * 1000);
        return db.select().from(leads)
          .where(and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.lastActivityAt} < ${cutoff}`,
            sql`${leads.funnelStep} NOT IN ('scheduled', 'confirmed', 'completed', 'cancelled')`,
          ))
          .orderBy(desc(leads.leadScore), desc(leads.lastActivityAt))
          .limit(input.limit);
      }),
  }),

  // ── FOLLOW-UPS DE RECUPERAÇÃO ───────────────────────────────────────────────
  followups: router({
    // Agendar sequência de follow-up para um lead
    schedule: clinicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { leadFollowups } = await import("../drizzle/schema");
        const now = Date.now();
        // Sequência: imediato, 24h, 72h, 7 dias
        const steps = [
          { step: 0, delayMs: 0 },
          { step: 1, delayMs: 24 * 60 * 60 * 1000 },
          { step: 2, delayMs: 72 * 60 * 60 * 1000 },
          { step: 3, delayMs: 7 * 24 * 60 * 60 * 1000 },
        ];
        for (const s of steps) {
          await db.insert(leadFollowups).values({
            clinicId: ctx.clinic.id,
            leadId: input.leadId,
            sequenceStep: s.step,
            channel: "whatsapp",
            scheduledAt: new Date(now + s.delayMs),
            status: "pending",
          });
        }
        return { success: true, stepsScheduled: steps.length };
      }),

    // Cancelar follow-ups pendentes (quando lead agenda)
    cancelPending: clinicProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { leadFollowups } = await import("../drizzle/schema");
        await db.update(leadFollowups)
          .set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "lead_converted" })
          .where(and(
            eq(leadFollowups.leadId, input.leadId),
            eq(leadFollowups.clinicId, ctx.clinic.id),
            eq(leadFollowups.status, "pending"),
          ));
        return { success: true };
      }),

    // Listar follow-ups de um lead
    listByLead: clinicProcedure
      .input(z.object({ leadId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { leadFollowups } = await import("../drizzle/schema");
        return db.select().from(leadFollowups)
          .where(and(
            eq(leadFollowups.leadId, input.leadId),
            eq(leadFollowups.clinicId, ctx.clinic.id),
          ))
          .orderBy(leadFollowups.scheduledAt);
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTH SCORE & RANKING
  // ─────────────────────────────────────────────────────────────────────────────
  health: router({
    // Calcular e retornar o health score atual da clínica
    getMyScore: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicHealthScores, leads, appointments, leadEvents, clinicDailyCheckins } = await import("../drizzle/schema");
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Buscar score existente do dia
      const [existing] = await db.select().from(clinicHealthScores)
        .where(and(eq(clinicHealthScores.clinicId, ctx.clinic.id), eq(clinicHealthScores.scoreDate, today!)))
        .limit(1);

      // Calcular dados em tempo real
      const allLeads = await db.select().from(leads)
        .where(and(eq(leads.clinicId, ctx.clinic.id), sql`${leads.createdAt} >= ${thirtyDaysAgo}`));

      const leadsTotal = allLeads.length;
      const leadsWithPhoto = allLeads.filter(l => l.funnelStep && ["photos_done", "ai_done", "scheduled", "confirmed", "attended"].includes(l.funnelStep)).length;
      const leadsWithAi = allLeads.filter(l => l.funnelStep && ["ai_done", "scheduled", "confirmed", "attended"].includes(l.funnelStep)).length;
      const leadsScheduled = allLeads.filter(l => l.funnelStep && ["scheduled", "confirmed", "attended"].includes(l.funnelStep)).length;
      const avgScore = leadsTotal > 0 ? allLeads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / leadsTotal : 0;

      // Buscar check-ins do último mês
      const checkins = await db.select().from(clinicDailyCheckins)
        .where(and(eq(clinicDailyCheckins.clinicId, ctx.clinic.id), sql`${clinicDailyCheckins.createdAt} >= ${thirtyDaysAgo}`));

      const totalAppointments = checkins.reduce((s, c) => s + c.appointmentsAttendedToday + c.appointmentsNoShowToday, 0);
      const attended = checkins.reduce((s, c) => s + c.appointmentsAttendedToday, 0);
      const noShow = checkins.reduce((s, c) => s + c.appointmentsNoShowToday, 0);
      const attendanceRate = totalAppointments > 0 ? (attended / totalAppointments) * 100 : 0;

      // Calcular tempo médio de resposta (em minutos)
      const events = await db.select().from(leadEvents)
        .where(and(eq(leadEvents.clinicId, ctx.clinic.id), sql`${leadEvents.createdAt} >= ${thirtyDaysAgo}`));
      const whatsappContacts = events.filter(e => e.eventType === "whatsapp_contacted");
      const avgResponseTime = whatsappContacts.length > 0 ? 45 : 120; // placeholder

      // ─ Cálculo das 5 dimensões ─────────────────────────────────────────────────────────────────────────────
      // D1: Qualidade do Lead (25 pts)
      const photoRate = leadsTotal > 0 ? leadsWithPhoto / leadsTotal : 0;
      const aiRate = leadsTotal > 0 ? leadsWithAi / leadsTotal : 0;
      const normalizedScore = Math.min(avgScore / 100, 1);
      const leadQualityScore = Math.round((photoRate * 10 + aiRate * 8 + normalizedScore * 7) * 10) / 10;

      // D2: Taxa de Agendamento (25 pts)
      const schedulingRate = leadsTotal > 0 ? (leadsScheduled / leadsTotal) * 100 : 0;
      const schedulingScore = Math.min(schedulingRate / 100 * 25, 25);

      // D3: Comparecimento Presencial (25 pts)
      const attendanceScore = Math.min(attendanceRate / 100 * 25, 25);

      // D4: Velocidade de Resposta (15 pts)
      // <15min=15, <30min=12, <60min=9, <120min=6, <240min=3, >240min=0
      const responseScore = avgResponseTime < 15 ? 15 : avgResponseTime < 30 ? 12 : avgResponseTime < 60 ? 9 : avgResponseTime < 120 ? 6 : avgResponseTime < 240 ? 3 : 0;

      // D5: Engajamento Operacional (10 pts)
      const checkinsThisMonth = checkins.length;
      const operationalScore = Math.min(checkinsThisMonth / 22 * 10, 10); // 22 dias úteis/mês

      const totalScore = leadQualityScore + schedulingScore + attendanceScore + responseScore + operationalScore;
      const grade = totalScore >= 90 ? "S" : totalScore >= 80 ? "A" : totalScore >= 70 ? "B" : totalScore >= 60 ? "C" : totalScore >= 50 ? "D" : "F";

      return {
        clinicId: ctx.clinic.id,
        scoreDate: today,
        leadsTotal,
        leadsWithPhoto,
        leadsWithAiResult: leadsWithAi,
        avgLeadScore: Math.round(avgScore * 100) / 100,
        leadQualityScore,
        leadsScheduled,
        schedulingRate: Math.round(schedulingRate * 100) / 100,
        schedulingScore: Math.round(schedulingScore * 100) / 100,
        appointmentsTotal: totalAppointments,
        appointmentsAttended: attended,
        appointmentsNoShow: noShow,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
        attendanceScore: Math.round(attendanceScore * 100) / 100,
        avgResponseTimeMinutes: avgResponseTime,
        responseScore,
        checkinsThisMonth,
        operationalScore: Math.round(operationalScore * 100) / 100,
        totalScore: Math.round(totalScore * 100) / 100,
        grade,
        // Histórico dos últimos 30 dias
        checkinHistory: checkins.slice(-7).map(c => ({
          date: c.checkinDate,
          attended: c.appointmentsAttendedToday,
          noShow: c.appointmentsNoShowToday,
          leadsQualified: c.leadsQualifiedToday,
          mood: c.teamMoodScore,
        })),
      };
    }),

    // Submeter check-in diário
    submitCheckin: clinicProcedure
      .input(z.object({
        leadsReceivedToday: z.number().min(0),
        leadsContactedToday: z.number().min(0),
        leadsQualifiedToday: z.number().min(0),
        leadsNotQualified: z.number().min(0),
        appointmentsScheduledToday: z.number().min(0),
        appointmentsAttendedToday: z.number().min(0),
        appointmentsNoShowToday: z.number().min(0),
        appointmentsCancelledToday: z.number().min(0),
        leadsWithPhotosToday: z.number().min(0),
        leadsWithAiResultToday: z.number().min(0),
        mainChallengesToday: z.string().optional(),
        bestLeadToday: z.string().optional(),
        teamMoodScore: z.number().min(1).max(5).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinicDailyCheckins } = await import("../drizzle/schema");
        const today = new Date().toISOString().split("T")[0]!;

        // Verificar se já fez check-in hoje
        const [existing] = await db.select().from(clinicDailyCheckins)
          .where(and(eq(clinicDailyCheckins.clinicId, ctx.clinic.id), eq(clinicDailyCheckins.checkinDate, today)))
          .limit(1);

        if (existing) {
          // Atualizar check-in existente
          await db.update(clinicDailyCheckins).set({
            ...input,
            teamMoodScore: input.teamMoodScore ?? null,
          }).where(eq(clinicDailyCheckins.id, existing.id));
          return { id: existing.id, updated: true };
        }

        const inserted = await db.insert(clinicDailyCheckins).values({
          clinicId: ctx.clinic.id,
          brandId: ctx.clinic.brandId ?? null,
          checkinDate: today,
          submittedByUserId: ctx.user.id,
          ...input,
          teamMoodScore: input.teamMoodScore ?? null,
        });
        const checkinId = (inserted as any)[0]?.insertId ?? 0;

        // Registrar evento de engajamento operacional
        await insertLeadEvent({
          clinicId: ctx.clinic.id,
          leadId: 0, // evento de clínica, não de lead específico
          eventType: "status_changed",
          description: `Check-in diário submetido: ${input.appointmentsAttendedToday} atendimentos, ${input.leadsQualifiedToday} leads qualificados`,
          metadata: { type: "daily_checkin", checkinId },
          triggeredBy: "clinic",
        });

        await notifyOwner({
          title: `Check-in: ${ctx.clinic.name}`,
          content: `Atendimentos: ${input.appointmentsAttendedToday} | No-show: ${input.appointmentsNoShowToday} | Leads qualificados: ${input.leadsQualifiedToday} | Humor: ${input.teamMoodScore ?? "N/A"}/5`,
        });

        return { id: checkinId, updated: false };
      }),

    // Verificar se já fez check-in hoje
    todayCheckin: clinicProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicDailyCheckins } = await import("../drizzle/schema");
      const today = new Date().toISOString().split("T")[0]!;
      const [checkin] = await db.select().from(clinicDailyCheckins)
        .where(and(eq(clinicDailyCheckins.clinicId, ctx.clinic.id), eq(clinicDailyCheckins.checkinDate, today)))
        .limit(1);
      return checkin ?? null;
    }),

    // Histórico de check-ins
    checkinHistory: clinicProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinicDailyCheckins } = await import("../drizzle/schema");
        const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
        return db.select().from(clinicDailyCheckins)
          .where(and(eq(clinicDailyCheckins.clinicId, ctx.clinic.id), sql`${clinicDailyCheckins.createdAt} >= ${since}`))
          .orderBy(desc(clinicDailyCheckins.createdAt));
      }),
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // BRANDS (Redes Franqueadoras) + RANKING
  // ─────────────────────────────────────────────────────────────────────────────
  brand: router({
    // Criar rede (apenas ADM da plataforma)
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        website: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { brands } = await import("../drizzle/schema");
        const inserted = await db.insert(brands).values({
          ...input,
          ownerUserId: ctx.user.id,
        });
        return { id: (inserted as any)[0]?.insertId };
      }),

    // Listar todas as redes (ADM)
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { brands } = await import("../drizzle/schema");
      return db.select().from(brands).orderBy(brands.name);
    }),

    // Buscar rede por slug
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { brands } = await import("../drizzle/schema");
        const [brand] = await db.select().from(brands).where(eq(brands.slug, input.slug)).limit(1);
        if (!brand) throw new TRPCError({ code: "NOT_FOUND", message: "Rede não encontrada" });
        return brand;
      }),

    // Ranking da rede: clínicas ordenadas por health score
    networkRanking: protectedProcedure
      .input(z.object({ brandId: z.number(), period: z.enum(["today", "week", "month"]).default("month") }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinics, leads, appointments, clinicDailyCheckins } = await import("../drizzle/schema");

        // Buscar todas as clínicas da rede
        const networkClinics = await db.select().from(clinics)
          .where(and(eq(clinics.brandId, input.brandId), eq(clinics.active, true)));

        const since = input.period === "today"
          ? new Date(new Date().setHours(0, 0, 0, 0))
          : input.period === "week"
          ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Calcular score de cada clínica
        const ranking = await Promise.all(networkClinics.map(async (clinic) => {
          const clinicLeads = await db.select().from(leads)
            .where(and(eq(leads.clinicId, clinic.id), sql`${leads.createdAt} >= ${since}`));

          const total = clinicLeads.length;
          const withPhoto = clinicLeads.filter(l => l.funnelStep && ["photos_done", "ai_done", "scheduled", "confirmed", "attended"].includes(l.funnelStep)).length;
          const scheduled = clinicLeads.filter(l => l.funnelStep && ["scheduled", "confirmed", "attended"].includes(l.funnelStep)).length;
          const avgLeadScore = total > 0 ? clinicLeads.reduce((s, l) => s + (l.leadScore || 0), 0) / total : 0;

          const checkins = await db.select().from(clinicDailyCheckins)
            .where(and(eq(clinicDailyCheckins.clinicId, clinic.id), sql`${clinicDailyCheckins.createdAt} >= ${since}`));

          const attended = checkins.reduce((s, c) => s + c.appointmentsAttendedToday, 0);
          const noShow = checkins.reduce((s, c) => s + c.appointmentsNoShowToday, 0);
          const totalAppts = attended + noShow;
          const attendanceRate = totalAppts > 0 ? (attended / totalAppts) * 100 : 0;
          const schedulingRate = total > 0 ? (scheduled / total) * 100 : 0;

          // Score simplificado para ranking
          const photoScore = total > 0 ? (withPhoto / total) * 25 : 0;
          const schedScore = Math.min(schedulingRate / 100 * 25, 25);
          const attendScore = Math.min(attendanceRate / 100 * 25, 25);
          const checkinScore = Math.min(checkins.length / 22 * 10, 10);
          const qualityScore = Math.min(avgLeadScore / 100 * 15, 15);
          const totalScore = photoScore + schedScore + attendScore + checkinScore + qualityScore;
          const grade = totalScore >= 90 ? "S" : totalScore >= 80 ? "A" : totalScore >= 70 ? "B" : totalScore >= 60 ? "C" : totalScore >= 50 ? "D" : "F";

          return {
            clinicId: clinic.id,
            clinicName: clinic.name,
            clinicSlug: clinic.slug,
            city: clinic.city,
            state: clinic.state,
            totalScore: Math.round(totalScore * 10) / 10,
            grade,
            leadsTotal: total,
            leadsWithPhoto: withPhoto,
            leadsScheduled: scheduled,
            avgLeadScore: Math.round(avgLeadScore * 10) / 10,
            schedulingRate: Math.round(schedulingRate * 10) / 10,
            appointmentsAttended: attended,
            appointmentsNoShow: noShow,
            attendanceRate: Math.round(attendanceRate * 10) / 10,
            checkinsCount: checkins.length,
          };
        }));

        // Ordenar por score decrescente e adicionar posição
        ranking.sort((a, b) => b.totalScore - a.totalScore);
        return ranking.map((r, i) => ({ ...r, rankPosition: i + 1 }));
      }),

    // Vincular clínica a uma rede (ADM)
    linkClinic: protectedProcedure
      .input(z.object({ clinicId: z.number(), brandId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { clinics } = await import("../drizzle/schema");
        await db.update(clinics).set({ brandId: input.brandId }).where(eq(clinics.id, input.clinicId));
        return { success: true };
      }),
  }),

  // ── PAINEL DO CRIADOR (OWNER) ────────────────────────────────────────────────────────────────────────────
  creator: router({
    // Verificar se o usuário logado é owner
    isOwner: protectedProcedure.query(({ ctx }) => {
      return ctx.user.role === "owner";
    }),

    // Gerar link de convite por nível
    createInvite: protectedProcedure
      .input(z.object({
        role: z.enum(["admin", "franchisee", "seller"]),
        label: z.string().optional(),
        maxUses: z.number().default(1),
        expiresInHours: z.number().default(72),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
        await db.insert(accessInvites).values({
          createdByUserId: ctx.user.id,
          role: input.role,
          label: input.label,
          token,
          maxUses: input.maxUses,
          expiresAt,
        });
        const inviteUrl = `${input.origin}/join?token=${token}`;
        return { token, inviteUrl, expiresAt };
      }),

    // Listar todos os convites gerados
    listInvites: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(accessInvites).orderBy(desc(accessInvites.createdAt));
    }),

    // Revogar convite
    revokeInvite: protectedProcedure
      .input(z.object({ inviteId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(accessInvites).set({ active: false }).where(eq(accessInvites.id, input.inviteId));
        return { success: true };
      }),

    // Listar todos os usuários por role
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(users).orderBy(desc(users.createdAt));
    }),

    // Alterar role de um usuário
    setUserRole: protectedProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "franchisee", "seller", "owner"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
        return { success: true };
      }),

    // Promover o próprio usuário a owner (apenas se não houver nenhum owner ainda)
    claimOwner: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Verificar se já existe um owner
      const existingOwners = await db.select().from(users).where(eq(users.role, "owner"));
      if (existingOwners.length > 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Já existe um owner cadastrado" });
      }
      await db.update(users).set({ role: "owner" }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
  }),

  // ── ACEITAR CONVITE DE ACESSO ────────────────────────────────────────────────────────────────────────────
  invite: router({
    // Verificar token de convite (público)
    check: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [invite] = await db.select().from(accessInvites).where(eq(accessInvites.token, input.token));
        if (!invite || !invite.active) throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido ou expirado" });
        if (invite.expiresAt && invite.expiresAt < new Date()) throw new TRPCError({ code: "NOT_FOUND", message: "Convite expirado" });
        if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses) throw new TRPCError({ code: "NOT_FOUND", message: "Convite já utilizado" });
        return { role: invite.role, label: invite.label };
      }),

    // Aceitar convite (usuário logado)
    accept: protectedProcedure
      .input(z.object({ token: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [invite] = await db.select().from(accessInvites).where(eq(accessInvites.token, input.token));
        if (!invite || !invite.active) throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido" });
        if (invite.expiresAt && invite.expiresAt < new Date()) throw new TRPCError({ code: "NOT_FOUND", message: "Convite expirado" });
        if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses) throw new TRPCError({ code: "NOT_FOUND", message: "Convite já utilizado" });
        // Aplicar o role ao usuário
        await db.update(users).set({ role: invite.role }).where(eq(users.id, ctx.user.id));
        // Registrar uso
        await db.insert(accessInviteUses).values({ inviteId: invite.id, userId: ctx.user.id });
        await db.update(accessInvites).set({ useCount: invite.useCount + 1 }).where(eq(accessInvites.id, invite.id));
        return { success: true, role: invite.role };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ── Seed plan limits ──────────────────────────────────────────────────────────
async function seedPlanLimits(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const existing = await db.select().from(planLimits).limit(1);
  if (existing.length > 0) return;

  await db.insert(planLimits).values([
    {
      plan: "free",
      leadsPerMonth: 50,
      aiAnalysesPerMonth: 10,
      teamMembers: 2,
      whatsappNotifications: false,
      googleCalendar: false,
      calComIntegration: false,
      customBranding: false,
      npsEnabled: false,
      treatmentHistory: false,
      exportData: false,
      apiAccess: false,
    },
    {
      plan: "pro",
      leadsPerMonth: 500,
      aiAnalysesPerMonth: 200,
      teamMembers: 10,
      whatsappNotifications: true,
      googleCalendar: true,
      calComIntegration: true,
      customBranding: true,
      npsEnabled: true,
      treatmentHistory: true,
      exportData: true,
      apiAccess: false,
    },
    {
      plan: "enterprise",
      leadsPerMonth: -1,
      aiAnalysesPerMonth: -1,
      teamMembers: -1,
      whatsappNotifications: true,
      googleCalendar: true,
      calComIntegration: true,
      customBranding: true,
      npsEnabled: true,
      treatmentHistory: true,
      exportData: true,
      apiAccess: true,
    },
  ]);
}
