import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { nanoid } from "nanoid";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  getDb,
  upsertUser,
  getUserByOpenId,
  getClinicBySlug,
  getClinicForUser,
  getLeadByToken,
  updateLeadFunnelStep,
  getPlanLimits,
  loginClinic,
  registerClinicUser,
  createPasswordResetToken,
  resetPasswordWithToken,
} from "../db";
import {
  clinics,
  clinicUsers,
  leads,
  leadPhotos,
  aiResults,
  appointments,
  notifications,
  npsResponses,
  planLimits,
  treatments,
  users,
  accessInvites,
  accessInviteUses,
} from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { generateImage } from "../_core/imageGeneration";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";
import {
  clinicProcedure,
  adminProcedure,
  requireLeadByToken,
  insertNotification,
  insertLeadEvent,
  seedPlanLimits,
} from "./_shared";

export const leadsRouter = router({
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clínica não encontrada",
        });

      // Verificar limite do plano
      const limits = await getPlanLimits(clinic.plan);
      if (
        limits &&
        limits.leadsPerMonth !== -1 &&
        clinic.currentMonthLeads >= limits.leadsPerMonth
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Limite de leads do plano atingido",
        });
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
        leadId: Number(
          (inserted as any)[0]?.insertId ?? (inserted as any).insertId
        ),
        title: "Novo lead capturado!",
        content: `${input.name} (${input.phone}) iniciou o diagnóstico.${input.utmSource ? ` Origem: ${input.utmSource}` : ""}`,
        type: "new_lead",
      });

      await notifyOwner({
        title: `Novo lead — ${clinic.name}`,
        content: `${input.name} (${input.phone}) via ${input.utmCampaign ?? "orgânico"}.`,
      });
      const leadId = Number(
        (inserted as any)[0]?.insertId ?? (inserted as any).insertId
      );
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
        hairLossType: z
          .enum(["frontal", "vertex", "total", "diffuse", "temporal", "other"])
          .optional(),
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
        metadata: {
          hairProblem: input.hairProblem,
          hairLossType: input.hairLossType,
        },
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
          "landing",
          "form_started",
          "form_done",
          "chat_started",
          "chat_done",
          "photos_started",
          "photos_done",
          "ai_processing",
          "ai_done",
          "schedule_started",
          "scheduled",
          "confirmed",
          "completed",
          "cancelled",
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
      if (input.funnelStep)
        conditions.push(eq(leads.funnelStep, input.funnelStep as any));
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
});
