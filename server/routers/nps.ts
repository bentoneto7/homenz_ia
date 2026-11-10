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

export const npsRouter = router({
  submit: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        score: z.number().min(0).max(10),
        comment: z.string().optional(),
        allowTestimonial: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lead = await requireLeadByToken(input.sessionToken);

      const category =
        input.score >= 9
          ? "promoter"
          : input.score >= 7
            ? "passive"
            : "detractor";

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
});
