import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { nanoid } from "nanoid";
import { eq, desc, and, sql, getTableColumns } from "drizzle-orm";
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

export const appointmentsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        scheduledAt: z.number(),
        consultationType: z
          .enum(["evaluation", "procedure", "followup"])
          .default("evaluation"),
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

      const appointmentId = Number(
        (ins as any)[0]?.insertId ?? (ins as any).insertId
      );

      await updateLeadFunnelStep(lead.id, "scheduled");

      const dateStr = scheduledDate.toLocaleDateString("pt-BR");
      const timeStr = scheduledDate.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

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

      await db
        .update(appointments)
        .set({ confirmationSent: true })
        .where(eq(appointments.id, appointmentId));

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
      return { appointmentId };
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
    .input(
      z.object({
        status: z.string().optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [eq(appointments.clinicId, ctx.clinic.id)];
      if (input.status)
        conditions.push(eq(appointments.status, input.status as any));
      return db
        .select({
          ...getTableColumns(appointments),
          leadName: leads.name,
          leadPhone: leads.phone,
        })
        .from(appointments)
        .leftJoin(leads, eq(appointments.leadId, leads.id))
        .where(and(...conditions))
        .orderBy(desc(appointments.scheduledAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  updateStatus: clinicProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum([
          "pending",
          "confirmed",
          "cancelled",
          "completed",
          "no_show",
        ]),
        notes: z.string().optional(),
        cancellationReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(appointments)
        .set({
          status: input.status,
          attendantNotes: input.notes,
          cancellationReason: input.cancellationReason,
        })
        .where(
          and(
            eq(appointments.id, input.id),
            eq(appointments.clinicId, ctx.clinic.id)
          )
        );

      const appt = await db
        .select()
        .from(appointments)
        .where(eq(appointments.id, input.id))
        .limit(1);
      if (!appt[0]) return { success: true };

      const lead = await db
        .select()
        .from(leads)
        .where(eq(leads.id, appt[0].leadId))
        .limit(1);
      if (!lead[0]) return { success: true };

      const dateStr = new Date(appt[0].scheduledAt).toLocaleDateString("pt-BR");
      const timeStr = new Date(appt[0].scheduledAt).toLocaleTimeString(
        "pt-BR",
        { hour: "2-digit", minute: "2-digit" }
      );

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
          content:
            "Gostaríamos de saber sua opinião sobre o atendimento. Avalie sua experiência!",
          type: "nps_request",
        });
      }

      return { success: true };
    }),
});
