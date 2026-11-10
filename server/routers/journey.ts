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

export const journeyRouter = router({
  // Listar todos os eventos de um lead
  getTimeline: clinicProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { leadEvents } = await import("../../drizzle/schema");
      return db
        .select()
        .from(leadEvents)
        .where(
          and(
            eq(leadEvents.leadId, input.leadId),
            eq(leadEvents.clinicId, ctx.clinic.id)
          )
        )
        .orderBy(leadEvents.createdAt);
    }),

  // Registrar evento manualmente (ex: contato via WhatsApp)
  addEvent: clinicProcedure
    .input(
      z.object({
        leadId: z.number(),
        eventType: z.enum([
          "lead_created",
          "chat_started",
          "chat_completed",
          "chat_abandoned",
          "photos_started",
          "photos_completed",
          "photos_abandoned",
          "ai_processing_started",
          "ai_result_ready",
          "schedule_opened",
          "appointment_created",
          "appointment_confirmed",
          "appointment_cancelled",
          "appointment_completed",
          "appointment_no_show",
          "followup_sent",
          "whatsapp_contacted",
          "nps_sent",
          "nps_responded",
          "status_changed",
        ]),
        description: z.string().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { leadEvents } = await import("../../drizzle/schema");
      // Verificar que o lead pertence à clínica
      const lead = await db
        .select()
        .from(leads)
        .where(
          and(eq(leads.id, input.leadId), eq(leads.clinicId, ctx.clinic.id))
        )
        .limit(1);
      if (!lead[0])
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Lead não encontrado",
        });
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
        await db
          .update(leads)
          .set({ lastActivityAt: new Date() })
          .where(eq(leads.id, input.leadId));
      }
      return { success: true };
    }),

  // Analytics do funil por clínica
  funnelAnalytics: clinicProcedure
    .input(
      z.object({
        startDate: z.number().optional(), // timestamp ms
        endDate: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = input.endDate ? new Date(input.endDate) : new Date();

      // Total de leads no período
      const totalLeads = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`
          )
        );

      // Leads por etapa do funil
      const byStep = await db
        .select({
          funnelStep: leads.funnelStep,
          count: sql<number>`count(*)`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`
          )
        )
        .groupBy(leads.funnelStep);

      // Agendamentos no período
      const apptStats = await db
        .select({
          status: appointments.status,
          count: sql<number>`count(*)`,
        })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, ctx.clinic.id),
            sql`${appointments.createdAt} >= ${startDate}`,
            sql`${appointments.createdAt} <= ${endDate}`
          )
        )
        .groupBy(appointments.status);

      // Leads por UTM source
      const bySource = await db
        .select({
          utmSource: leads.utmSource,
          count: sql<number>`count(*)`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`
          )
        )
        .groupBy(leads.utmSource)
        .orderBy(desc(sql<number>`count(*)`));

      // Leads por prioridade
      const byPriority = await db
        .select({
          priority: leads.priority,
          count: sql<number>`count(*)`,
        })
        .from(leads)
        .where(
          and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.createdAt} >= ${startDate}`,
            sql`${leads.createdAt} <= ${endDate}`
          )
        )
        .groupBy(leads.priority);

      // Taxa de conversão: leads que chegaram em scheduled / total
      const scheduled =
        byStep.find(s => s.funnelStep === "scheduled")?.count ?? 0;
      const total = totalLeads[0]?.count ?? 0;
      const conversionRate =
        total > 0 ? Math.round((Number(scheduled) / Number(total)) * 100) : 0;

      // Leads abandonados (sem atividade há mais de 2 horas)
      const abandonedLeads = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(
          and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.lastActivityAt} < ${new Date(Date.now() - 2 * 60 * 60 * 1000)}`,
            sql`${leads.funnelStep} NOT IN ('scheduled', 'confirmed', 'completed', 'cancelled')`
          )
        );

      return {
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        totalLeads: Number(total),
        conversionRate,
        abandonedCount: Number(abandonedLeads[0]?.count ?? 0),
        byStep: byStep.map(s => ({
          step: s.funnelStep,
          count: Number(s.count),
        })),
        bySource: bySource.map(s => ({
          source: s.utmSource ?? "direto",
          count: Number(s.count),
        })),
        byPriority: byPriority.map(p => ({
          priority: p.priority,
          count: Number(p.count),
        })),
        appointments: {
          total: apptStats.reduce((acc, a) => acc + Number(a.count), 0),
          confirmed: Number(
            apptStats.find(a => a.status === "confirmed")?.count ?? 0
          ),
          completed: Number(
            apptStats.find(a => a.status === "completed")?.count ?? 0
          ),
          cancelled: Number(
            apptStats.find(a => a.status === "cancelled")?.count ?? 0
          ),
          noShow: Number(
            apptStats.find(a => a.status === "no_show")?.count ?? 0
          ),
        },
      };
    }),

  // Leads que precisam de recuperação (abandonados no funil)
  getRecoveryLeads: clinicProcedure
    .input(
      z.object({
        hoursInactive: z.number().default(2),
        limit: z.number().default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const cutoff = new Date(
        Date.now() - input.hoursInactive * 60 * 60 * 1000
      );
      return db
        .select()
        .from(leads)
        .where(
          and(
            eq(leads.clinicId, ctx.clinic.id),
            sql`${leads.lastActivityAt} < ${cutoff}`,
            sql`${leads.funnelStep} NOT IN ('scheduled', 'confirmed', 'completed', 'cancelled')`
          )
        )
        .orderBy(desc(leads.leadScore), desc(leads.lastActivityAt))
        .limit(input.limit);
    }),
});
