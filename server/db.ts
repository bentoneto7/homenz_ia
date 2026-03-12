import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  users, clinics, clinicUsers, leads, leadPhotos,
  aiResults, appointments, notifications, npsResponses,
  planLimits, treatments, passwordResetTokens,
  InsertUser,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "homenz-clinic-secret-2024";
const JWT_EXPIRES_IN = "7d";

export async function loginClinic(email: string, password: string): Promise<{ user: typeof users.$inferSelect; token: string } | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  const user = result[0];
  if (!user || !user.passwordHash) return null;
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));
  return { user, token };
}

export async function verifyClinicToken(token: string): Promise<typeof users.$inferSelect | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number; role: string };
    const db = await getDb();
    if (!db) return null;
    const result = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    return result[0] ?? null;
  } catch {
    return null;
  }
}

export async function registerClinicUser(data: { name: string; email: string; password: string }): Promise<{ user: typeof users.$inferSelect; token: string } | null> {
  const db = await getDb();
  if (!db) return null;
  // Verificar se email já existe
  const existing = await db.select().from(users).where(eq(users.email, data.email.toLowerCase().trim())).limit(1);
  if (existing[0]) return null;
  const passwordHash = await bcrypt.hash(data.password, 10);
  await db.insert(users).values({
    name: data.name,
    email: data.email.toLowerCase().trim(),
    passwordHash,
    loginMethod: "email",
    role: "user",
    active: true,
    lastSignedIn: new Date(),
  });
  const result = await db.select().from(users).where(eq(users.email, data.email.toLowerCase().trim())).limit(1);
  const user = result[0];
  if (!user) return null;
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { user, token };
}

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user"); return; }

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ── Clinics ──────────────────────────────────────────────────────────────────

export async function getClinicBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clinics).where(eq(clinics.slug, slug)).limit(1);
  return result[0] ?? null;
}

export async function getClinicByOwnerId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clinics).where(eq(clinics.ownerUserId, userId)).limit(1);
  return result[0] ?? null;
}

export async function getClinicForUser(userId: number) {
  const db = await getDb();
  if (!db) return null;
  // Check clinic_users table first
  const member = await db
    .select()
    .from(clinicUsers)
    .where(and(eq(clinicUsers.userId, userId), eq(clinicUsers.active, true)))
    .limit(1);
  if (member[0]) {
    const clinic = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, member[0].clinicId))
      .limit(1);
    return clinic[0] ?? null;
  }
  // Fallback: check owner
  return getClinicByOwnerId(userId);
}

// ── Plan Limits ───────────────────────────────────────────────────────────────

export async function getPlanLimits(plan: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(planLimits)
    .where(eq(planLimits.plan, plan as any))
    .limit(1);
  return result[0] ?? null;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export async function getLeadByToken(sessionToken: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(leads)
    .where(eq(leads.sessionToken, sessionToken))
    .limit(1);
  return result[0] ?? null;
}

export async function updateLeadFunnelStep(
  leadId: number,
  funnelStep: typeof leads.$inferSelect["funnelStep"]
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(leads)
    .set({ funnelStep, lastActivityAt: new Date() })
    .where(eq(leads.id, leadId));
}

// ── Recuperação de Senha ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria um token de recuperação de senha para o email informado.
 * Retorna o token gerado (para enviar por email) ou null se o email não existir.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
  const user = result[0];
  if (!user) return null;
  // Invalidar tokens anteriores
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
  // Gerar novo token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
  await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });
  return token;
}

/**
 * Verifica o token de recuperação e redefine a senha.
 * Retorna true se bem-sucedido, false se token inválido/expirado.
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token)).limit(1);
  const resetToken = result[0];
  if (!resetToken) return false;
  if (resetToken.usedAt) return false; // já usado
  if (new Date() > resetToken.expiresAt) return false; // expirado
  // Atualizar senha
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ passwordHash }).where(eq(users.id, resetToken.userId));
  // Marcar token como usado
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));
  return true;
}
