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

export const followupsRouter = router({
  // Agendar sequência de follow-up para um lead
  schedule: clinicProcedure
    .input(z.object({ leadId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { leadFollowups } = await import("../../drizzle/schema");
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
      const { leadFollowups } = await import("../../drizzle/schema");
      await db
        .update(leadFollowups)
        .set({
          status: "cancelled",
          cancelledAt: new Date(),
          cancelReason: "lead_converted",
        })
        .where(
          and(
            eq(leadFollowups.leadId, input.leadId),
            eq(leadFollowups.clinicId, ctx.clinic.id),
            eq(leadFollowups.status, "pending")
          )
        );
      return { success: true };
    }),

  // Listar follow-ups de um lead
  listByLead: clinicProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { leadFollowups } = await import("../../drizzle/schema");
      return db
        .select()
        .from(leadFollowups)
        .where(
          and(
            eq(leadFollowups.leadId, input.leadId),
            eq(leadFollowups.clinicId, ctx.clinic.id)
          )
        )
        .orderBy(leadFollowups.scheduledAt);
    }),
});
