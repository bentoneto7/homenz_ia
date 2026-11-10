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

export const healthRouter = router({
  // Calcular e retornar o health score atual da clínica
  getMyScore: clinicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const {
      clinicHealthScores,
      leads,
      appointments,
      leadEvents,
      clinicDailyCheckins,
    } = await import("../../drizzle/schema");
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Buscar score existente do dia
    const [existing] = await db
      .select()
      .from(clinicHealthScores)
      .where(
        and(
          eq(clinicHealthScores.clinicId, ctx.clinic.id),
          eq(clinicHealthScores.scoreDate, today!)
        )
      )
      .limit(1);

    // Calcular dados em tempo real
    const allLeads = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.clinicId, ctx.clinic.id),
          sql`${leads.createdAt} >= ${thirtyDaysAgo}`
        )
      );

    const leadsTotal = allLeads.length;
    const leadsWithPhoto = allLeads.filter(
      l =>
        l.funnelStep &&
        [
          "photos_done",
          "ai_done",
          "scheduled",
          "confirmed",
          "attended",
        ].includes(l.funnelStep)
    ).length;
    const leadsWithAi = allLeads.filter(
      l =>
        l.funnelStep &&
        ["ai_done", "scheduled", "confirmed", "attended"].includes(l.funnelStep)
    ).length;
    const leadsScheduled = allLeads.filter(
      l =>
        l.funnelStep &&
        ["scheduled", "confirmed", "attended"].includes(l.funnelStep)
    ).length;
    const avgScore =
      leadsTotal > 0
        ? allLeads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / leadsTotal
        : 0;

    // Buscar check-ins do último mês
    const checkins = await db
      .select()
      .from(clinicDailyCheckins)
      .where(
        and(
          eq(clinicDailyCheckins.clinicId, ctx.clinic.id),
          sql`${clinicDailyCheckins.createdAt} >= ${thirtyDaysAgo}`
        )
      );

    const totalAppointments = checkins.reduce(
      (s, c) => s + c.appointmentsAttendedToday + c.appointmentsNoShowToday,
      0
    );
    const attended = checkins.reduce(
      (s, c) => s + c.appointmentsAttendedToday,
      0
    );
    const noShow = checkins.reduce((s, c) => s + c.appointmentsNoShowToday, 0);
    const attendanceRate =
      totalAppointments > 0 ? (attended / totalAppointments) * 100 : 0;

    // Calcular tempo médio de resposta (em minutos)
    const events = await db
      .select()
      .from(leadEvents)
      .where(
        and(
          eq(leadEvents.clinicId, ctx.clinic.id),
          sql`${leadEvents.createdAt} >= ${thirtyDaysAgo}`
        )
      );
    const whatsappContacts = events.filter(
      e => e.eventType === "whatsapp_contacted"
    );
    const avgResponseTime = whatsappContacts.length > 0 ? 45 : 120; // placeholder

    // ─ Cálculo das 5 dimensões ─────────────────────────────────────────────────────────────────────────────
    // D1: Qualidade do Lead (25 pts)
    const photoRate = leadsTotal > 0 ? leadsWithPhoto / leadsTotal : 0;
    const aiRate = leadsTotal > 0 ? leadsWithAi / leadsTotal : 0;
    const normalizedScore = Math.min(avgScore / 100, 1);
    const leadQualityScore =
      Math.round((photoRate * 10 + aiRate * 8 + normalizedScore * 7) * 10) / 10;

    // D2: Taxa de Agendamento (25 pts)
    const schedulingRate =
      leadsTotal > 0 ? (leadsScheduled / leadsTotal) * 100 : 0;
    const schedulingScore = Math.min((schedulingRate / 100) * 25, 25);

    // D3: Comparecimento Presencial (25 pts)
    const attendanceScore = Math.min((attendanceRate / 100) * 25, 25);

    // D4: Velocidade de Resposta (15 pts)
    // <15min=15, <30min=12, <60min=9, <120min=6, <240min=3, >240min=0
    const responseScore =
      avgResponseTime < 15
        ? 15
        : avgResponseTime < 30
          ? 12
          : avgResponseTime < 60
            ? 9
            : avgResponseTime < 120
              ? 6
              : avgResponseTime < 240
                ? 3
                : 0;

    // D5: Engajamento Operacional (10 pts)
    const checkinsThisMonth = checkins.length;
    const operationalScore = Math.min((checkinsThisMonth / 22) * 10, 10); // 22 dias úteis/mês

    const totalScore =
      leadQualityScore +
      schedulingScore +
      attendanceScore +
      responseScore +
      operationalScore;
    const grade =
      totalScore >= 90
        ? "S"
        : totalScore >= 80
          ? "A"
          : totalScore >= 70
            ? "B"
            : totalScore >= 60
              ? "C"
              : totalScore >= 50
                ? "D"
                : "F";

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
    .input(
      z.object({
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicDailyCheckins } = await import("../../drizzle/schema");
      const today = new Date().toISOString().split("T")[0]!;

      // Verificar se já fez check-in hoje
      const [existing] = await db
        .select()
        .from(clinicDailyCheckins)
        .where(
          and(
            eq(clinicDailyCheckins.clinicId, ctx.clinic.id),
            eq(clinicDailyCheckins.checkinDate, today)
          )
        )
        .limit(1);

      if (existing) {
        // Atualizar check-in existente
        await db
          .update(clinicDailyCheckins)
          .set({
            ...input,
            teamMoodScore: input.teamMoodScore ?? null,
          })
          .where(eq(clinicDailyCheckins.id, existing.id));
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
    const { clinicDailyCheckins } = await import("../../drizzle/schema");
    const today = new Date().toISOString().split("T")[0]!;
    const [checkin] = await db
      .select()
      .from(clinicDailyCheckins)
      .where(
        and(
          eq(clinicDailyCheckins.clinicId, ctx.clinic.id),
          eq(clinicDailyCheckins.checkinDate, today)
        )
      )
      .limit(1);
    return checkin ?? null;
  }),

  // Histórico de check-ins
  checkinHistory: clinicProcedure
    .input(z.object({ days: z.number().min(7).max(90).default(30) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicDailyCheckins } = await import("../../drizzle/schema");
      const since = new Date(Date.now() - input.days * 24 * 60 * 60 * 1000);
      return db
        .select()
        .from(clinicDailyCheckins)
        .where(
          and(
            eq(clinicDailyCheckins.clinicId, ctx.clinic.id),
            sql`${clinicDailyCheckins.createdAt} >= ${since}`
          )
        )
        .orderBy(desc(clinicDailyCheckins.createdAt));
    }),
});
