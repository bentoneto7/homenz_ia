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

export const inviteRouter = router({
  // Verificar token de convite (público)
  check: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [invite] = await db
        .select()
        .from(accessInvites)
        .where(eq(accessInvites.token, input.token));
      if (!invite || !invite.active)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite inválido ou expirado",
        });
      if (invite.expiresAt && invite.expiresAt < new Date())
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite expirado" });
      if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite já utilizado",
        });
      return { role: invite.role, label: invite.label };
    }),

  // Aceitar convite (usuário logado)
  accept: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const [invite] = await db
        .select()
        .from(accessInvites)
        .where(eq(accessInvites.token, input.token));
      if (!invite || !invite.active)
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite inválido" });
      if (invite.expiresAt && invite.expiresAt < new Date())
        throw new TRPCError({ code: "NOT_FOUND", message: "Convite expirado" });
      if (invite.maxUses !== -1 && invite.useCount >= invite.maxUses)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Convite já utilizado",
        });
      // Aplicar o role ao usuário
      await db
        .update(users)
        .set({ role: invite.role })
        .where(eq(users.id, ctx.user.id));
      // Registrar uso
      await db
        .insert(accessInviteUses)
        .values({ inviteId: invite.id, userId: ctx.user.id });
      await db
        .update(accessInvites)
        .set({ useCount: invite.useCount + 1 })
        .where(eq(accessInvites.id, invite.id));
      return { success: true, role: invite.role };
    }),
});
