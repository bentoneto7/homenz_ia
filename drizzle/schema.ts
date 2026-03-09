import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  boolean,
  decimal,
  tinyint,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────────────────────────────────────
// USUÁRIOS (Manus Auth)
// ─────────────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// PLANOS E LIMITES
// ─────────────────────────────────────────────────────────────────────────────

export const planLimits = mysqlTable("plan_limits", {
  id: int("id").autoincrement().primaryKey(),
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).notNull().unique(),
  // Limites mensais
  leadsPerMonth: int("leadsPerMonth").notNull(),       // -1 = ilimitado
  aiAnalysesPerMonth: int("aiAnalysesPerMonth").notNull(),
  teamMembers: int("teamMembers").notNull(),
  // Features habilitadas
  whatsappNotifications: boolean("whatsappNotifications").default(false).notNull(),
  googleCalendar: boolean("googleCalendar").default(false).notNull(),
  calComIntegration: boolean("calComIntegration").default(false).notNull(),
  customBranding: boolean("customBranding").default(false).notNull(),
  npsEnabled: boolean("npsEnabled").default(false).notNull(),
  treatmentHistory: boolean("treatmentHistory").default(false).notNull(),
  exportData: boolean("exportData").default(false).notNull(),
  apiAccess: boolean("apiAccess").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PlanLimit = typeof planLimits.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// CLÍNICAS (tenants)
// ─────────────────────────────────────────────────────────────────────────────

export const clinics = mysqlTable("clinics", {
  id: int("id").autoincrement().primaryKey(),
  // Identificação pública
  slug: varchar("slug", { length: 100 }).notNull().unique(), // ex: clinica-uberaba
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  // Responsável
  ownerName: varchar("ownerName", { length: 255 }).notNull(),
  ownerUserId: int("ownerUserId").notNull(), // FK → users.id
  // Contato
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  whatsapp: varchar("whatsapp", { length: 20 }).notNull(),
  // Localização
  address: text("address"),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zipCode", { length: 9 }),
  // Branding
  logoUrl: text("logoUrl"),
  coverUrl: text("coverUrl"),
  bio: text("bio"),
  // Serviços e horários
  services: json("services"),       // string[]
  workingHours: json("workingHours"), // { mon: [{start, end}], ... }
  // Integrações de agendamento
  googleCalendarId: varchar("googleCalendarId", { length: 255 }),
  googleCalendarToken: text("googleCalendarToken"), // OAuth token JSON
  calComApiKey: varchar("calComApiKey", { length: 255 }),
  calComEventTypeId: varchar("calComEventTypeId", { length: 100 }),
  // Notificações
  notifyWhatsapp: varchar("notifyWhatsapp", { length: 20 }), // número para receber alertas
  notifyEmail: varchar("notifyEmail", { length: 320 }),
  // Plano e status
  plan: mysqlEnum("plan", ["free", "pro", "enterprise"]).default("free").notNull(),
  active: boolean("active").default(true).notNull(),
  // Contadores mensais (reset todo mês)
  currentMonthLeads: int("currentMonthLeads").default(0).notNull(),
  currentMonthAiAnalyses: int("currentMonthAiAnalyses").default(0).notNull(),
  countersResetAt: timestamp("countersResetAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Clinic = typeof clinics.$inferSelect;
export type InsertClinic = typeof clinics.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// MEMBROS DA EQUIPE DA CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────

export const clinicUsers = mysqlTable("clinic_users", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["owner", "manager", "attendant"]).default("attendant").notNull(),
  active: boolean("active").default(true).notNull(),
  invitedAt: timestamp("invitedAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
});

export type ClinicUser = typeof clinicUsers.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// LEADS
// ─────────────────────────────────────────────────────────────────────────────

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),

  // ── Etapa 1: Captura inicial (landing page) ──────────────────────────────
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),  // WhatsApp capturado no passo 1
  email: varchar("email", { length: 320 }),
  region: varchar("region", { length: 255 }),

  // ── UTM / Rastreamento de mídia (capturado automaticamente da URL) ────────
  utmSource: varchar("utmSource", { length: 100 }),   // ex: facebook, google
  utmMedium: varchar("utmMedium", { length: 100 }),   // ex: cpc, social
  utmCampaign: varchar("utmCampaign", { length: 255 }), // ex: calvicie-uberaba-maio
  utmContent: varchar("utmContent", { length: 255 }),
  utmTerm: varchar("utmTerm", { length: 255 }),
  referrer: text("referrer"),                          // URL de origem completa

  // ── Etapa 2: Chat TypeBot ─────────────────────────────────────────────────
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  age: int("age"),
  hairProblem: text("hairProblem"),
  hairLossType: mysqlEnum("hairLossType", [
    "frontal", "vertex", "total", "diffuse", "temporal", "other"
  ]),
  hairLossTime: varchar("hairLossTime", { length: 100 }),
  previousTreatments: text("previousTreatments"),
  expectations: text("expectations"),
  howDidYouHear: varchar("howDidYouHear", { length: 255 }), // resposta do lead (não confiável, mas útil)
  chatAnswers: json("chatAnswers"),                    // todas as respostas em JSON

  // ── Rastreamento do funil ─────────────────────────────────────────────────
  funnelStep: mysqlEnum("funnelStep", [
    "landing",      // chegou na landing page
    "form_started", // começou a preencher o formulário
    "form_done",    // formulário inicial concluído
    "chat_started", // entrou no chat
    "chat_done",    // chat concluído
    "photos_started", // começou a tirar fotos
    "photos_done",  // fotos enviadas
    "ai_processing", // IA processando
    "ai_done",      // resultado 3D gerado
    "schedule_started", // abriu tela de agendamento
    "scheduled",    // agendamento criado
    "confirmed",    // agendamento confirmado pela clínica
    "completed",    // consulta realizada
    "cancelled",    // cancelado
  ]).default("landing").notNull(),

  abandonedAt: timestamp("abandonedAt"),              // quando parou de avançar
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),

  // ── Score e qualificação ──────────────────────────────────────────────────
  leadScore: int("leadScore"),                        // 0–100, calculado pela IA
  leadScoreBreakdown: json("leadScoreBreakdown"),     // { baldnessWeight, expectationWeight, ... }
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium"),

  // ── Sessão anônima ────────────────────────────────────────────────────────
  sessionToken: varchar("sessionToken", { length: 128 }).unique(),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// FOTOS DO LEAD
// ─────────────────────────────────────────────────────────────────────────────

export const leadPhotos = mysqlTable("lead_photos", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  clinicId: int("clinicId").notNull(),
  photoType: mysqlEnum("photoType", ["front", "top", "left", "right"]).notNull(),
  s3Key: varchar("s3Key", { length: 512 }).notNull(),
  s3Url: text("s3Url").notNull(),
  keypoints: json("keypoints"),  // [{ x, y, label }]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadPhoto = typeof leadPhotos.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// RESULTADOS DA IA
// ─────────────────────────────────────────────────────────────────────────────

export const aiResults = mysqlTable("ai_results", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  clinicId: int("clinicId").notNull(),
  // Análise
  analysisText: text("analysisText"),
  baldnessLevel: varchar("baldnessLevel", { length: 50 }),  // Norwood I-VII / Ludwig I-III
  baldnessScale: mysqlEnum("baldnessScale", ["norwood", "ludwig"]),
  affectedAreas: json("affectedAreas"),   // string[]
  densityEstimate: varchar("densityEstimate", { length: 100 }),
  // Imagens geradas
  beforeImageUrl: text("beforeImageUrl"),
  afterImageUrl: text("afterImageUrl"),
  after360Urls: json("after360Urls"),     // string[]
  // Recomendação
  recommendedTreatment: text("recommendedTreatment"),
  estimatedSessions: int("estimatedSessions"),
  // Lead Score (gerado junto com a análise)
  leadScore: int("leadScore"),            // 0–100
  leadScoreBreakdown: json("leadScoreBreakdown"),
  // Status
  processingStatus: mysqlEnum("processingStatus", ["pending", "processing", "done", "error"])
    .default("pending").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiResult = typeof aiResults.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// AGENDAMENTOS
// ─────────────────────────────────────────────────────────────────────────────

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  leadId: int("leadId").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  durationMinutes: int("durationMinutes").default(60).notNull(),
  consultationType: mysqlEnum("consultationType", [
    "evaluation", "procedure", "followup"
  ]).default("evaluation").notNull(),
  // Integrações de calendário
  googleEventId: varchar("googleEventId", { length: 255 }),
  googleEventLink: text("googleEventLink"),
  calComBookingId: varchar("calComBookingId", { length: 255 }),
  calComBookingUrl: text("calComBookingUrl"),
  // Status e notas
  status: mysqlEnum("status", [
    "pending", "confirmed", "cancelled", "completed", "no_show"
  ]).default("pending").notNull(),
  attendantNotes: text("attendantNotes"),
  cancellationReason: text("cancellationReason"),
  confirmationSent: boolean("confirmationSent").default(false).notNull(),
  reminderSent: boolean("reminderSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// HISTÓRICO CLÍNICO (tratamentos realizados)
// ─────────────────────────────────────────────────────────────────────────────

export const treatments = mysqlTable("treatments", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  leadId: int("leadId").notNull(),
  appointmentId: int("appointmentId"),
  // Dados do procedimento
  treatmentType: varchar("treatmentType", { length: 255 }).notNull(),
  sessionNumber: int("sessionNumber").default(1).notNull(),
  areasTargeted: json("areasTargeted"),  // string[]
  productsUsed: json("productsUsed"),    // string[]
  technician: varchar("technician", { length: 255 }),
  notes: text("notes"),
  // Resultado
  beforePhotoUrl: text("beforePhotoUrl"),
  afterPhotoUrl: text("afterPhotoUrl"),
  satisfactionRating: tinyint("satisfactionRating"), // 1–5
  // Próxima sessão
  nextSessionRecommendedAt: timestamp("nextSessionRecommendedAt"),
  performedAt: timestamp("performedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Treatment = typeof treatments.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICAÇÕES (multicanal)
// ─────────────────────────────────────────────────────────────────────────────

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  targetType: mysqlEnum("targetType", ["clinic", "lead"]).notNull(),
  leadId: int("leadId"),
  // Conteúdo
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", [
    "new_lead",
    "chat_completed",
    "photos_uploaded",
    "ai_ready",
    "appointment_new",
    "appointment_confirmed",
    "appointment_cancelled",
    "appointment_reminder",
    "treatment_followup",
    "nps_request",
  ]).notNull(),
  // Canal de entrega
  channel: mysqlEnum("channel", ["platform", "whatsapp", "email", "sms"]).default("platform").notNull(),
  templateId: varchar("templateId", { length: 100 }),  // para Evolution API / Zap
  // Status de entrega
  read: boolean("read").default(false).notNull(),
  delivered: boolean("delivered").default(false).notNull(),
  deliveredAt: timestamp("deliveredAt"),
  deliveryError: text("deliveryError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// NPS / FEEDBACK PÓS-CONSULTA
// ─────────────────────────────────────────────────────────────────────────────

export const npsResponses = mysqlTable("nps_responses", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  leadId: int("leadId").notNull(),
  appointmentId: int("appointmentId"),
  // NPS padrão (0–10)
  score: tinyint("score").notNull(),
  category: mysqlEnum("category", ["detractor", "passive", "promoter"]).notNull(),
  // Feedback qualitativo
  comment: text("comment"),
  // Consentimento para usar como depoimento
  allowTestimonial: boolean("allowTestimonial").default(false).notNull(),
  // Rastreamento
  sentAt: timestamp("sentAt").notNull(),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NpsResponse = typeof npsResponses.$inferSelect;
