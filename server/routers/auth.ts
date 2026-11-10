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

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
  myClinic: protectedProcedure.query(async ({ ctx }) => {
    return getClinicForUser(ctx.user.id);
  }),
  // ── Auth próprio para clínicas (sem Manus OAuth) ─────────────────────────────────────────
  loginClinic: publicProcedure
    .input(z.object({ email: z.string().email(), password: z.string().min(6) }))
    .mutation(async ({ input }) => {
      const result = await loginClinic(input.email, input.password);
      if (!result)
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "E-mail ou senha incorretos",
        });
      return { token: result.token, user: result.user };
    }),
  registerClinic: publicProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const result = await registerClinicUser(input);
      if (!result)
        throw new TRPCError({
          code: "CONFLICT",
          message: "E-mail já cadastrado",
        });
      return { token: result.token, user: result.user };
    }),
  // Solicitar recuperação de senha (envia link por email)
  forgotPassword: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const token = await createPasswordResetToken(input.email);
      if (token) {
        // Enviar email com link de recuperação via Brevo
        const origin =
          ctx.req.headers.origin ||
          ctx.req.headers.referer?.replace(/\/[^/]*$/, "") ||
          "https://homenzadvanced.com";
        const resetUrl = `${origin}/recuperar-senha?token=${token}`;
        try {
          // Buscar nome do usuário
          const { supabaseAdmin } = await import("../supabase");
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("name")
            .eq("email", input.email.toLowerCase())
            .single();
          const { sendPasswordReset } = await import("../brevo");
          await sendPasswordReset({
            email: input.email,
            name: profile?.name ?? input.email.split("@")[0],
            resetLink: resetUrl,
          });
          console.log(
            `[ForgotPassword] Email de recuperação enviado para ${input.email}`
          );
        } catch (emailErr) {
          console.error(
            "[Brevo] Erro ao enviar email de recuperação:",
            emailErr
          );
        }
      }
      // Sempre retornar sucesso para não revelar se o email existe
      return {
        success: true,
        message:
          "Se o e-mail estiver cadastrado, você receberá um link de recuperação.",
      };
    }),
  // Redefinir senha com token
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(10),
        newPassword: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const success = await resetPasswordWithToken(
        input.token,
        input.newPassword
      );
      if (!success)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Token inválido ou expirado. Solicite um novo link.",
        });
      return { success: true };
    }),
});
