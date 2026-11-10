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

export const photosRouter = router({
  upload: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        photoType: z.enum(["front", "top", "left", "right"]),
        base64: z.string(),
        keypoints: z
          .array(z.object({ x: z.number(), y: z.number(), label: z.string() }))
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lead = await requireLeadByToken(input.sessionToken);

      const base64Data = input.base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const mimeType = input.base64.startsWith("data:image/png")
        ? "image/png"
        : "image/jpeg";
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const fileKey = `clinics/${lead.clinicId}/leads/${lead.id}/photos/${input.photoType}-${nanoid(8)}.${ext}`;

      const { url } = await storagePut(fileKey, buffer, mimeType);

      await db.insert(leadPhotos).values({
        leadId: lead.id,
        clinicId: lead.clinicId,
        photoType: input.photoType,
        s3Key: fileKey,
        s3Url: url,
        keypoints: input.keypoints ?? [],
      });

      const photos = await db
        .select()
        .from(leadPhotos)
        .where(eq(leadPhotos.leadId, lead.id));

      if (photos.length >= 1) {
        await updateLeadFunnelStep(lead.id, "photos_done");
      }

      if (photos.length === 1) {
        await insertNotification({
          clinicId: lead.clinicId,
          targetType: "clinic",
          leadId: lead.id,
          title: "Fotos recebidas!",
          content: `${lead.name} enviou fotos para análise.`,
          type: "photos_uploaded",
        });
        await insertLeadEvent({
          clinicId: lead.clinicId,
          leadId: lead.id,
          eventType: "photos_started",
          description: `${lead.name} iniciou o envio de fotos`,
          triggeredBy: "lead",
        });
      }
      if (photos.length >= 2) {
        await insertLeadEvent({
          clinicId: lead.clinicId,
          leadId: lead.id,
          eventType: "photos_completed",
          description: `${lead.name} completou o envio de ${photos.length} fotos`,
          metadata: { totalPhotos: photos.length },
          triggeredBy: "lead",
        });
      }
      return { url, totalPhotos: photos.length };
    }),

  listByToken: publicProcedure
    .input(z.object({ sessionToken: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const lead = await requireLeadByToken(input.sessionToken);
      return db.select().from(leadPhotos).where(eq(leadPhotos.leadId, lead.id));
    }),

  listByLeadId: clinicProcedure
    .input(z.object({ leadId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db
        .select()
        .from(leadPhotos)
        .where(
          and(
            eq(leadPhotos.leadId, input.leadId),
            eq(leadPhotos.clinicId, ctx.clinic.id)
          )
        );
    }),

  // Upload público sem sessionToken — usado pela FranchiseLanding (/l/:slug)
  // Recebe base64 comprimido (max ~300KB após compressão no cliente)
  uploadPublic: publicProcedure
    .input(z.object({ base64: z.string().max(5_000_000) })) // max ~3.75MB de base64
    .mutation(async ({ input }) => {
      const base64Data = input.base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const mimeType = input.base64.startsWith("data:image/png")
        ? "image/png"
        : "image/jpeg";
      const ext = mimeType === "image/png" ? "png" : "jpg";
      const fileKey = `leads/landing-photos/${nanoid(16)}.${ext}`;
      const { url } = await storagePut(fileKey, buffer, mimeType);
      return { url, key: fileKey };
    }),
});
