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

export const clinicRouter = router({
  // Buscar clínica pelo slug (público — para landing page)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const clinic = await getClinicBySlug(input.slug);
      if (!clinic || !clinic.active)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clínica não encontrada",
        });
      // Retornar apenas dados públicos
      return {
        id: clinic.id,
        slug: clinic.slug,
        name: clinic.name,
        city: clinic.city,
        state: clinic.state,
        bio: clinic.bio,
        logoUrl: clinic.logoUrl,
        coverUrl: clinic.coverUrl,
        services: clinic.services,
        workingHours: clinic.workingHours,
        whatsapp: clinic.whatsapp,
        address: clinic.address,
        zipCode: clinic.zipCode,
        phone: clinic.phone,
      };
    }),

  // Criar clínica (onboarding)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3),
        slug: z
          .string()
          .min(3)
          .regex(/^[a-z0-9-]+$/, "Apenas letras minúsculas, números e hífens"),
        ownerName: z.string().min(3),
        email: z.string().email(),
        phone: z.string().min(8),
        whatsapp: z.string().min(8),
        city: z.string().min(2),
        state: z.string().length(2),
        address: z.string().optional(),
        zipCode: z.string().optional(),
        cnpj: z.string().optional(),
        bio: z.string().optional(),
        services: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar se slug já existe
      const existing = await getClinicBySlug(input.slug);
      if (existing)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Este link já está em uso",
        });

      // Verificar se usuário já tem clínica
      const myClinic = await getClinicForUser(ctx.user.id);
      if (myClinic)
        throw new TRPCError({
          code: "CONFLICT",
          message: "Você já possui uma clínica cadastrada",
        });

      const inserted = await db.insert(clinics).values({
        ...input,
        ownerUserId: ctx.user.id,
        plan: "free",
        active: true,
        services: input.services ?? [],
        workingHours: {
          mon: [{ start: "09:00", end: "18:00" }],
          tue: [{ start: "09:00", end: "18:00" }],
          wed: [{ start: "09:00", end: "18:00" }],
          thu: [{ start: "09:00", end: "18:00" }],
          fri: [{ start: "09:00", end: "18:00" }],
          sat: [],
          sun: [],
        },
      });

      const clinicId = Number(
        (inserted as any)[0]?.insertId ?? (inserted as any).insertId
      );

      // Adicionar owner como membro
      await db.insert(clinicUsers).values({
        clinicId,
        userId: ctx.user.id,
        role: "owner",
        active: true,
        acceptedAt: new Date(),
      });

      // Seed plan_limits se não existir
      await seedPlanLimits(db);

      await notifyOwner({
        title: "Nova clínica cadastrada!",
        content: `${input.name} (${input.city}/${input.state}) acabou de se cadastrar.`,
      });

      return { clinicId, slug: input.slug };
    }),

  // Atualizar dados da clínica
  update: clinicProcedure
    .input(
      z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        address: z.string().optional(),
        zipCode: z.string().optional(),
        services: z.array(z.string()).optional(),
        workingHours: z.record(z.string(), z.unknown()).optional(),
        notifyWhatsapp: z.string().optional(),
        notifyEmail: z.string().optional(),
        googleCalendarId: z.string().optional(),
        calComApiKey: z.string().optional(),
        calComEventTypeId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(clinics)
        .set(input as any)
        .where(eq(clinics.id, ctx.clinic.id));
      return { success: true };
    }),

  // Minha clínica (painel)
  mine: clinicProcedure.query(async ({ ctx }) => ctx.clinic),

  // Estatísticas da clínica
  stats: clinicProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const allLeads = await db
      .select()
      .from(leads)
      .where(eq(leads.clinicId, ctx.clinic.id));

    const total = allLeads.length;
    const byStep = allLeads.reduce(
      (acc, l) => {
        acc[l.funnelStep] = (acc[l.funnelStep] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const scheduled = allLeads.filter(l =>
      ["scheduled", "confirmed", "completed"].includes(l.funnelStep)
    ).length;

    const conversionRate =
      total > 0 ? Math.round((scheduled / total) * 100) : 0;

    const avgScore = allLeads
      .filter(l => l.leadScore !== null)
      .reduce((sum, l, _, arr) => sum + (l.leadScore ?? 0) / arr.length, 0);

    const unreadNotifs = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.clinicId, ctx.clinic.id),
          eq(notifications.targetType, "clinic"),
          eq(notifications.read, false)
        )
      );

    return {
      total,
      byStep,
      scheduled,
      conversionRate,
      avgScore: Math.round(avgScore),
      unreadNotifications: unreadNotifs[0]?.count ?? 0,
    };
  }),
});
