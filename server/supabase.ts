import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Cliente com service role (backend — acesso total)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cliente com anon key (frontend — acesso restrito)
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

// ── Tipos ────────────────────────────────────────────────────────────────────

export type UserRole = "owner" | "franchisee" | "seller";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  franchise_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Franchise {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  owner_id?: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  plan: "free" | "pro" | "enterprise";
  active: boolean;
  trial_ends_at?: string;
  total_leads: number;
  total_scheduled: number;
  avg_lead_score: number;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  franchise_id: string;
  assigned_to?: string;
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  hair_problem?: string;
  hair_loss_type?: string;
  lead_score: number;
  temperature: "hot" | "warm" | "cold";
  funnel_step: string;
  chat_answers?: Record<string, unknown>;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface SellerMetrics {
  id: string;
  seller_id: string;
  franchise_id: string;
  period_start: string;
  period_end: string;
  leads_assigned: number;
  leads_contacted: number;
  leads_scheduled: number;
  leads_confirmed: number;
  avg_response_minutes: number;
  conversion_rate: number;
  score: number;
  created_at: string;
}

// ── Funções de autenticação ──────────────────────────────────────────────────

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "homenz-secret-key-2024";
const JWT_EXPIRES_IN = "7d";

export async function loginUser(email: string, password: string): Promise<{
  user: Profile;
  token: string;
} | null> {
  // Buscar usuário pelo email (inclui inativos para franqueados aguardando pagamento)
  const { data: user, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !user) return null;

  // Verificar senha
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) return null;

  // Gerar token JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role, franchiseId: user.franchise_id },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  // Salvar sessão no banco
  await supabaseAdmin.from("user_sessions").insert({
    user_id: user.id,
    token,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // Remover password_hash do retorno
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser as Profile, token };
}

export async function verifyToken(token: string): Promise<Profile | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      role: UserRole;
      franchiseId?: string;
    };

    // Buscar perfil sem filtrar por active (franqueados inativos ainda podem ter token)
    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, role, phone, avatar_url, franchise_id, active, created_at, updated_at")
      .eq("id", payload.userId)
      .single();

    if (error || !user) return null;
    return user as Profile;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ── Funções de dados ─────────────────────────────────────────────────────────

export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, role, phone, avatar_url, franchise_id, active, created_at, updated_at")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function getFranchiseById(id: string): Promise<Franchise | null> {
  const { data, error } = await supabaseAdmin
    .from("franchises")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Franchise;
}

export async function getAllFranchises(): Promise<Franchise[]> {
  const { data, error } = await supabaseAdmin
    .from("franchises")
    .select("*")
    .eq("active", true)
    .order("name");
  if (error) return [];
  return data as Franchise[];
}

export async function getSellersByFranchise(franchiseId: string): Promise<Profile[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, role, phone, avatar_url, franchise_id, active, created_at, updated_at")
    .eq("franchise_id", franchiseId)
    .eq("role", "seller")
    .eq("active", true)
    .order("name");
  if (error) return [];
  return data as Profile[];
}

export async function getLeadsByFranchise(franchiseId: string): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("franchise_id", franchiseId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data as Lead[];
}

export async function getLeadsBySeller(sellerId: string): Promise<Lead[]> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("assigned_to", sellerId)
    .order("lead_score", { ascending: false });
  if (error) return [];
  return data as Lead[];
}

export async function getSellerMetrics(sellerId: string, franchiseId: string): Promise<SellerMetrics | null> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("seller_metrics")
    .select("*")
    .eq("seller_id", sellerId)
    .eq("franchise_id", franchiseId)
    .eq("period_start", startOfMonth)
    .single();
  if (error) return null;
  return data as SellerMetrics;
}

export async function getAllSellerMetrics(franchiseId: string): Promise<SellerMetrics[]> {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  const { data, error } = await supabaseAdmin
    .from("seller_metrics")
    .select("*")
    .eq("franchise_id", franchiseId)
    .eq("period_start", startOfMonth)
    .order("score", { ascending: false });
  if (error) return [];
  return data as SellerMetrics[];
}

export async function addLeadEvent(data: {
  leadId: string;
  franchiseId: string;
  eventType: string;
  description?: string;
  metadata?: Record<string, unknown>;
  triggeredBy?: "system" | "lead" | "seller";
  sellerId?: string;
}): Promise<void> {
  await supabaseAdmin.from("lead_events").insert({
    lead_id: data.leadId,
    franchise_id: data.franchiseId,
    event_type: data.eventType,
    description: data.description,
    metadata: data.metadata,
    triggered_by: data.triggeredBy ?? "system",
    seller_id: data.sellerId,
  });
}

export async function getLeadTimeline(leadId: string) {
  const { data, error } = await supabaseAdmin
    .from("lead_events")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data;
}

export async function createInvite(data: {
  franchiseId: string;
  invitedBy: string;
  role: "franchisee" | "seller";
  email?: string;
  maxUses?: number;
  expiresInDays?: number;
}): Promise<string> {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const expiresAt = data.expiresInDays
    ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  await supabaseAdmin.from("access_invites").insert({
    token,
    franchise_id: data.franchiseId,
    invited_by: data.invitedBy,
    role: data.role,
    email: data.email,
    max_uses: data.maxUses ?? 1,
    expires_at: expiresAt,
  });

  return token;
}

export async function getNetworkStats() {
  // Retorna todas as franquias (ativas e inativas) para o dono da rede
  const { data: franchises } = await supabaseAdmin
    .from("franchises")
    .select("*");

  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("id, temperature, lead_score, funnel_step, franchise_id");

  const { data: sellers } = await supabaseAdmin
    .from("profiles")
    .select("id, name, franchise_id")
    .eq("role", "seller")
    .eq("active", true);

  const { data: metrics } = await supabaseAdmin
    .from("seller_metrics")
    .select("*")
    .order("score", { ascending: false });

  return {
    franchises: franchises ?? [],
    leads: leads ?? [],
    sellers: sellers ?? [],
    metrics: metrics ?? [],
  };
}
