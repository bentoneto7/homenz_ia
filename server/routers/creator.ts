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

export const creatorRouter = router({
  // Verificar se o usuário logado é owner
  isOwner: protectedProcedure.query(({ ctx }) => {
    return ctx.user.role === "owner";
  }),

  // Gerar link de convite por nível
  createInvite: protectedProcedure
    .input(
      z.object({
        role: z.enum(["admin", "franchisee", "seller"]),
        label: z.string().optional(),
        maxUses: z.number().default(1),
        expiresInHours: z.number().default(72),
        origin: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const token = nanoid(32);
      const expiresAt = new Date(
        Date.now() + input.expiresInHours * 60 * 60 * 1000
      );
      await db.insert(accessInvites).values({
        createdByUserId: ctx.user.id,
        role: input.role,
        label: input.label,
        token,
        maxUses: input.maxUses,
        expiresAt,
      });
      const inviteUrl = `${input.origin}/join?token=${token}`;
      return { token, inviteUrl, expiresAt };
    }),

  // Listar todos os convites gerados
  listInvites: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db
      .select()
      .from(accessInvites)
      .orderBy(desc(accessInvites.createdAt));
  }),

  // Revogar convite
  revokeInvite: protectedProcedure
    .input(z.object({ inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(accessInvites)
        .set({ active: false })
        .where(eq(accessInvites.id, input.inviteId));
      return { success: true };
    }),

  // Listar todos os usuários por role
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(users).orderBy(desc(users.createdAt));
  }),

  // Alterar role de um usuário
  setUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin", "franchisee", "seller", "owner"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  // Promover o próprio usuário a owner (apenas se não houver nenhum owner ainda)
  claimOwner: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    // Verificar se já existe um owner
    const existingOwners = await db
      .select()
      .from(users)
      .where(eq(users.role, "owner"));
    if (existingOwners.length > 0) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Já existe um owner cadastrado",
      });
    }
    await db
      .update(users)
      .set({ role: "owner" })
      .where(eq(users.id, ctx.user.id));
    return { success: true };
  }),
});
