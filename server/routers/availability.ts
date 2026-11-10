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

export const availabilityRouter = router({
  // Listar configurações de disponibilidade da clínica
  list: clinicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const { clinicAvailability } = await import("../../drizzle/schema");
    return db
      .select()
      .from(clinicAvailability)
      .where(eq(clinicAvailability.clinicId, ctx.clinic.id))
      .orderBy(clinicAvailability.dayOfWeek);
  }),

  // Salvar configurações de disponibilidade (substitui todas as existentes)
  save: clinicProcedure
    .input(
      z.array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          startTime: z.string().regex(/^\d{2}:\d{2}$/),
          endTime: z.string().regex(/^\d{2}:\d{2}$/),
          slotDurationMinutes: z.number().default(60),
          breakBetweenMinutes: z.number().default(0),
          maxConcurrentAppointments: z.number().default(1),
          active: z.boolean().default(true),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicAvailability } = await import("../../drizzle/schema");
      // Deletar todas as configurações atuais
      await db
        .delete(clinicAvailability)
        .where(eq(clinicAvailability.clinicId, ctx.clinic.id));
      // Inserir as novas
      if (input.length > 0) {
        await db
          .insert(clinicAvailability)
          .values(input.map(d => ({ ...d, clinicId: ctx.clinic.id })));
      }
      return { success: true };
    }),

  // Buscar slots disponíveis para uma data específica (público)
  getSlots: publicProcedure
    .input(
      z.object({
        clinicId: z.number(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // "YYYY-MM-DD"
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicAvailability, clinicBlockedDates } = await import(
        "../../drizzle/schema"
      );

      // Verificar se a data está bloqueada
      const blocked = await db
        .select()
        .from(clinicBlockedDates)
        .where(
          and(
            eq(clinicBlockedDates.clinicId, input.clinicId),
            eq(clinicBlockedDates.blockedDate, input.date)
          )
        )
        .limit(1);
      if (blocked.length > 0)
        return { slots: [], blocked: true, reason: blocked[0].reason };

      // Dia da semana da data solicitada
      const [year, month, day] = input.date.split("-").map(Number);
      const dateObj = new Date(year!, month! - 1, day!);
      const dayOfWeek = dateObj.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb

      // Buscar configuração de disponibilidade para esse dia
      const avail = await db
        .select()
        .from(clinicAvailability)
        .where(
          and(
            eq(clinicAvailability.clinicId, input.clinicId),
            eq(clinicAvailability.dayOfWeek, dayOfWeek),
            eq(clinicAvailability.active, true)
          )
        )
        .limit(1);

      // Fallback: se não há configuração, usar horário padrão Seg-Sex 08:00-18:00, Sáb 08:00-13:00
      const defaultAvail =
        dayOfWeek >= 1 && dayOfWeek <= 5
          ? {
              startTime: "08:00",
              endTime: "18:00",
              slotDurationMinutes: 60,
              breakBetweenMinutes: 0,
            }
          : dayOfWeek === 6
            ? {
                startTime: "08:00",
                endTime: "13:00",
                slotDurationMinutes: 60,
                breakBetweenMinutes: 0,
              }
            : null; // Domingo sem atendimento
      if (!avail[0] && !defaultAvail) return { slots: [], blocked: false };

      const cfg = avail[0] ?? defaultAvail!;
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
      const existingAppts = await db
        .select({ scheduledAt: appointments.scheduledAt })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, input.clinicId),
            sql`${appointments.scheduledAt} >= ${startOfDay}`,
            sql`${appointments.scheduledAt} <= ${endOfDay}`,
            sql`${appointments.status} NOT IN ('cancelled', 'no_show')`
          )
        );

      // Marcar slots ocupados
      const bookedTimes = new Set(
        existingAppts.map(a => {
          const d = new Date(a.scheduledAt);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        })
      );

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
    const { clinicBlockedDates } = await import("../../drizzle/schema");
    return db
      .select()
      .from(clinicBlockedDates)
      .where(eq(clinicBlockedDates.clinicId, ctx.clinic.id))
      .orderBy(clinicBlockedDates.blockedDate);
  }),

  // Adicionar data bloqueada
  blockDate: clinicProcedure
    .input(z.object({ date: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { clinicBlockedDates } = await import("../../drizzle/schema");
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
      const { clinicBlockedDates } = await import("../../drizzle/schema");
      await db
        .delete(clinicBlockedDates)
        .where(
          and(
            eq(clinicBlockedDates.id, input.id),
            eq(clinicBlockedDates.clinicId, ctx.clinic.id)
          )
        );
      return { success: true };
    }),
});
