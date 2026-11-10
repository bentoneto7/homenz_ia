// Procedures e helpers compartilhados entre os routers de domínio.
// Extraído de server/routers.ts durante a quebra do god-file.
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../_core/trpc";
import { getDb, getClinicForUser, getLeadByToken } from "../db";
import { notifications, planLimits } from "../../drizzle/schema";

// ── Procedures ────────────────────────────────────────────────────────────────

export const clinicProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const clinic = await getClinicForUser(ctx.user.id);
  if (!clinic)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Nenhuma clínica associada",
    });
  return next({ ctx: { ...ctx, clinic } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function requireLeadByToken(sessionToken: string) {
  const lead = await getLeadByToken(sessionToken);
  if (!lead)
    throw new TRPCError({ code: "NOT_FOUND", message: "Lead não encontrado" });
  return lead;
}

export async function insertNotification(data: {
  clinicId: number;
  targetType: "clinic" | "lead";
  leadId?: number;
  title: string;
  content: string;
  type:
    | "new_lead"
    | "chat_completed"
    | "photos_uploaded"
    | "ai_ready"
    | "appointment_new"
    | "appointment_confirmed"
    | "appointment_cancelled"
    | "appointment_reminder"
    | "treatment_followup"
    | "nps_request";
  channel?: "platform" | "whatsapp" | "email" | "sms";
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({
    clinicId: data.clinicId,
    targetType: data.targetType,
    leadId: data.leadId,
    title: data.title,
    content: data.content,
    type: data.type,
    channel: data.channel ?? "platform",
  });
}

// ── Helper de eventos de jornada ────────────────────────────────────────────
export async function insertLeadEvent(data: {
  clinicId: number;
  leadId: number;
  eventType: string;
  description?: string;
  metadata?: Record<string, unknown>;
  triggeredBy?: "system" | "lead" | "clinic";
}) {
  try {
    const db = await getDb();
    if (!db) return;
    const { leadEvents } = await import("../../drizzle/schema");
    await db.insert(leadEvents).values({
      clinicId: data.clinicId,
      leadId: data.leadId,
      eventType: data.eventType as any,
      description: data.description,
      metadata: data.metadata ?? null,
      triggeredBy: data.triggeredBy ?? "system",
    });
  } catch (e) {
    // Não quebrar o fluxo principal se o evento falhar
    console.warn("[leadEvent] Failed to insert:", e);
  }
}

// ── Seed plan limits ──────────────────────────────────────────────────────────
export async function seedPlanLimits(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
) {
  const existing = await db.select().from(planLimits).limit(1);
  if (existing.length > 0) return;

  await db.insert(planLimits).values([
    {
      plan: "free",
      leadsPerMonth: 50,
      aiAnalysesPerMonth: 10,
      teamMembers: 2,
      whatsappNotifications: false,
      googleCalendar: false,
      calComIntegration: false,
      customBranding: false,
      npsEnabled: false,
      treatmentHistory: false,
      exportData: false,
      apiAccess: false,
    },
    {
      plan: "pro",
      leadsPerMonth: 500,
      aiAnalysesPerMonth: 200,
      teamMembers: 10,
      whatsappNotifications: true,
      googleCalendar: true,
      calComIntegration: true,
      customBranding: true,
      npsEnabled: true,
      treatmentHistory: true,
      exportData: true,
      apiAccess: false,
    },
    {
      plan: "enterprise",
      leadsPerMonth: -1,
      aiAnalysesPerMonth: -1,
      teamMembers: -1,
      whatsappNotifications: true,
      googleCalendar: true,
      calComIntegration: true,
      customBranding: true,
      npsEnabled: true,
      treatmentHistory: true,
      exportData: true,
      apiAccess: true,
    },
  ]);
}
