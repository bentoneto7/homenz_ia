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

export const brandRouter = router({
  // Criar rede (apenas ADM da plataforma)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        slug: z
          .string()
          .min(2)
          .regex(/^[a-z0-9-]+$/),
        logoUrl: z.string().optional(),
        primaryColor: z.string().optional(),
        website: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { brands } = await import("../../drizzle/schema");
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
    const { brands } = await import("../../drizzle/schema");
    return db.select().from(brands).orderBy(brands.name);
  }),

  // Buscar rede por slug
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { brands } = await import("../../drizzle/schema");
      const [brand] = await db
        .select()
        .from(brands)
        .where(eq(brands.slug, input.slug))
        .limit(1);
      if (!brand)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Rede não encontrada",
        });
      return brand;
    }),

  // Ranking da rede: clínicas ordenadas por health score
  networkRanking: protectedProcedure
    .input(
      z.object({
        brandId: z.number(),
        period: z.enum(["today", "week", "month"]).default("month"),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinics, leads, appointments, clinicDailyCheckins } =
        await import("../../drizzle/schema");

      // Buscar todas as clínicas da rede
      const networkClinics = await db
        .select()
        .from(clinics)
        .where(
          and(eq(clinics.brandId, input.brandId), eq(clinics.active, true))
        );

      const since =
        input.period === "today"
          ? new Date(new Date().setHours(0, 0, 0, 0))
          : input.period === "week"
            ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Calcular score de cada clínica
      const ranking = await Promise.all(
        networkClinics.map(async clinic => {
          const clinicLeads = await db
            .select()
            .from(leads)
            .where(
              and(
                eq(leads.clinicId, clinic.id),
                sql`${leads.createdAt} >= ${since}`
              )
            );

          const total = clinicLeads.length;
          const withPhoto = clinicLeads.filter(
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
          const scheduled = clinicLeads.filter(
            l =>
              l.funnelStep &&
              ["scheduled", "confirmed", "attended"].includes(l.funnelStep)
          ).length;
          const avgLeadScore =
            total > 0
              ? clinicLeads.reduce((s, l) => s + (l.leadScore || 0), 0) / total
              : 0;

          const checkins = await db
            .select()
            .from(clinicDailyCheckins)
            .where(
              and(
                eq(clinicDailyCheckins.clinicId, clinic.id),
                sql`${clinicDailyCheckins.createdAt} >= ${since}`
              )
            );

          const attended = checkins.reduce(
            (s, c) => s + c.appointmentsAttendedToday,
            0
          );
          const noShow = checkins.reduce(
            (s, c) => s + c.appointmentsNoShowToday,
            0
          );
          const totalAppts = attended + noShow;
          const attendanceRate =
            totalAppts > 0 ? (attended / totalAppts) * 100 : 0;
          const schedulingRate = total > 0 ? (scheduled / total) * 100 : 0;

          // Score simplificado para ranking
          const photoScore = total > 0 ? (withPhoto / total) * 25 : 0;
          const schedScore = Math.min((schedulingRate / 100) * 25, 25);
          const attendScore = Math.min((attendanceRate / 100) * 25, 25);
          const checkinScore = Math.min((checkins.length / 22) * 10, 10);
          const qualityScore = Math.min((avgLeadScore / 100) * 15, 15);
          const totalScore =
            photoScore + schedScore + attendScore + checkinScore + qualityScore;
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
        })
      );

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
      const { clinics } = await import("../../drizzle/schema");
      await db
        .update(clinics)
        .set({ brandId: input.brandId })
        .where(eq(clinics.id, input.clinicId));
      return { success: true };
    }),
});
