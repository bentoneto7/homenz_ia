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

export const notificationsRouter = router({
  getByToken: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lead = await requireLeadByToken(input.sessionToken);
      return db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.targetType, "lead"),
            eq(notifications.leadId, lead.id)
          )
        )
        .orderBy(desc(notifications.createdAt));
    }),

  listClinic: clinicProcedure
    .input(z.object({ unreadOnly: z.boolean().default(false) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const conditions = [
        eq(notifications.clinicId, ctx.clinic.id),
        eq(notifications.targetType, "clinic"),
      ];
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
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.clinicId, ctx.clinic.id)
          )
        );
      return { success: true };
    }),

  markAllRead: clinicProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.clinicId, ctx.clinic.id),
          eq(notifications.targetType, "clinic")
        )
      );
    return { success: true };
  }),

  unreadCount: clinicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.clinicId, ctx.clinic.id),
          eq(notifications.targetType, "clinic"),
          eq(notifications.read, false)
        )
      );
    return { count: result[0]?.count ?? 0 };
  }),
});
