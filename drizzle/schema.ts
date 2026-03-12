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
  role: mysqlEnum("role", ["user", "admin", "franchisee", "seller", "owner"]).default("user").notNull(),
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
  // Rede / Franquia
  brandId: int("brandId"),                    // FK → brands.id (se for franquia de uma rede)

  // Trial de 15 dias
  trialActive: boolean("trialActive").default(true).notNull(),
  trialEndsAt: timestamp("trialEndsAt"),      // null = sem trial (plano pago)

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
  // ── Controle de alertas de temperatura ──────────────────────────────────────────────────
  lastAlertSentAt: timestamp("lastAlertSentAt"),       // quando foi enviado o último alerta
  lastAlertTemperature: mysqlEnum("lastAlertTemperature", ["hot", "warm", "cold", "lost"]), // temperatura do último alerta
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
  baldnessLevel: varchar("baldnessLevel", { length: 200 }),  // Norwood I-VII / Ludwig I-III
  baldnessScale: mysqlEnum("baldnessScale", ["norwood", "ludwig"]),
  affectedAreas: json("affectedAreas"),   // string[]
  densityEstimate: varchar("densityEstimate", { length: 500 }),
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

// ─────────────────────────────────────────────────────────────────────────────
// DISPONIBILIDADE DA CLÍNICA (sistema de agendamento próprio)
// ─────────────────────────────────────────────────────────────────────────────

// Configuração de disponibilidade semanal da clínica
export const clinicAvailability = mysqlTable("clinic_availability", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  // Dia da semana: 0=Domingo, 1=Segunda, ..., 6=Sábado
  dayOfWeek: tinyint("dayOfWeek").notNull(),
  // Horário de início e fim (formato "HH:MM")
  startTime: varchar("startTime", { length: 5 }).notNull(),  // ex: "08:00"
  endTime: varchar("endTime", { length: 5 }).notNull(),      // ex: "18:00"
  // Duração de cada slot em minutos
  slotDurationMinutes: int("slotDurationMinutes").default(60).notNull(),
  // Intervalo entre slots (pausa)
  breakBetweenMinutes: int("breakBetweenMinutes").default(0).notNull(),
  // Máximo de agendamentos simultâneos nesse dia
  maxConcurrentAppointments: int("maxConcurrentAppointments").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClinicAvailability = typeof clinicAvailability.$inferSelect;
export type InsertClinicAvailability = typeof clinicAvailability.$inferInsert;

// Bloqueios de data específica (feriados, férias, etc.)
export const clinicBlockedDates = mysqlTable("clinic_blocked_dates", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  blockedDate: varchar("blockedDate", { length: 10 }).notNull(), // "YYYY-MM-DD"
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClinicBlockedDate = typeof clinicBlockedDates.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────
// JORNADA DO LEAD (timeline de eventos)
// ─────────────────────────────────────────────────────────────────────────────

export const leadEvents = mysqlTable("lead_events", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  leadId: int("leadId").notNull(),
  // Tipo de evento
  eventType: mysqlEnum("eventType", [
    "lead_created",          // chegou na landing e preencheu o form
    "chat_started",          // entrou no chat
    "chat_completed",        // concluiu o chat
    "chat_abandoned",        // abandonou o chat
    "photos_started",        // iniciou captura de fotos
    "photos_completed",      // enviou todas as fotos
    "photos_abandoned",      // abandonou na etapa de fotos
    "ai_processing_started", // IA começou a processar
    "ai_result_ready",       // resultado 3D gerado
    "schedule_opened",       // abriu tela de agendamento
    "appointment_created",   // agendamento criado
    "appointment_confirmed", // clínica confirmou
    "appointment_cancelled", // cancelado (lead ou clínica)
    "appointment_completed", // consulta realizada
    "appointment_no_show",   // não compareceu
    "followup_sent",         // mensagem de recuperação enviada
    "whatsapp_contacted",    // clínica contatou via WhatsApp
    "nps_sent",              // NPS enviado
    "nps_responded",         // NPS respondido
    "status_changed",        // mudança manual de status
  ]).notNull(),
  // Dados do evento
  description: text("description"),
  metadata: json("metadata"),           // dados extras do evento
  // Quem gerou o evento
  triggeredBy: mysqlEnum("triggeredBy", ["system", "lead", "clinic"]).default("system").notNull(),
  triggeredByUserId: int("triggeredByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadEvent = typeof leadEvents.$inferSelect;
export type InsertLeadEvent = typeof leadEvents.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// FOLLOW-UPS DE RECUPERAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

export const leadFollowups = mysqlTable("lead_followups", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  leadId: int("leadId").notNull(),
  // Sequência de follow-up
  sequenceStep: tinyint("sequenceStep").notNull(),  // 0=imediato, 1=24h, 2=72h, 3=7d
  channel: mysqlEnum("channel", ["whatsapp", "platform"]).default("whatsapp").notNull(),
  // Agendamento
  scheduledAt: timestamp("scheduledAt").notNull(),
  // Status
  status: mysqlEnum("status", ["pending", "sent", "delivered", "failed", "cancelled"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: varchar("cancelReason", { length: 255 }),
  // Mensagem enviada
  messageText: text("messageText"),
  // Quem enviou (se manual)
  sentByUserId: int("sentByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LeadFollowup = typeof leadFollowups.$inferSelect;
export type InsertLeadFollowup = typeof leadFollowups.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// REDES / MARCAS (Franqueadoras como Homenz)
// ─────────────────────────────────────────────────────────────────────────────

export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),        // ex: "Homenz"
  slug: varchar("slug", { length: 100 }).notNull().unique(), // ex: "homenz"
  logoUrl: text("logoUrl"),
  coverUrl: text("coverUrl"),
  primaryColor: varchar("primaryColor", { length: 7 }).default("#D4A843"),
  website: varchar("website", { length: 255 }),
  ownerUserId: int("ownerUserId").notNull(), // FK → users.id (ADM da rede)
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH SCORE DIÁRIO POR CLÍNICA
// ─────────────────────────────────────────────────────────────────────────────

export const clinicHealthScores = mysqlTable("clinic_health_scores", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  brandId: int("brandId"),                    // FK → brands.id (se for franquia)
  scoreDate: varchar("scoreDate", { length: 10 }).notNull(), // "YYYY-MM-DD"

  // ─ Dimensão 1: Qualidade do Lead (25 pontos) ─────────────────────────────
  // Calculado automaticamente com base nos dados do funil
  leadsTotal: int("leadsTotal").default(0).notNull(),
  leadsWithPhoto: int("leadsWithPhoto").default(0).notNull(),
  leadsWithAiResult: int("leadsWithAiResult").default(0).notNull(),
  avgLeadScore: decimal("avgLeadScore", { precision: 5, scale: 2 }).default("0"),
  leadQualityScore: decimal("leadQualityScore", { precision: 5, scale: 2 }).default("0"), // 0-25

  // ─ Dimensão 2: Taxa de Agendamento (25 pontos) ─────────────────────────
  // Calculado automaticamente
  leadsScheduled: int("leadsScheduled").default(0).notNull(),
  schedulingRate: decimal("schedulingRate", { precision: 5, scale: 2 }).default("0"), // %
  schedulingScore: decimal("schedulingScore", { precision: 5, scale: 2 }).default("0"), // 0-25

  // ─ Dimensão 3: Comparecimento Presencial (25 pontos) ───────────────────
  // Informado pela clínica via check-in diário
  appointmentsTotal: int("appointmentsTotal").default(0).notNull(),
  appointmentsAttended: int("appointmentsAttended").default(0).notNull(),
  appointmentsNoShow: int("appointmentsNoShow").default(0).notNull(),
  attendanceRate: decimal("attendanceRate", { precision: 5, scale: 2 }).default("0"), // %
  attendanceScore: decimal("attendanceScore", { precision: 5, scale: 2 }).default("0"), // 0-25

  // ─ Dimensão 4: Velocidade de Resposta (15 pontos) ─────────────────────
  // Calculado automaticamente com base nos eventos de jornada
  avgResponseTimeMinutes: decimal("avgResponseTimeMinutes", { precision: 8, scale: 2 }).default("0"),
  responseScore: decimal("responseScore", { precision: 5, scale: 2 }).default("0"), // 0-15

  // ─ Dimensão 5: Engajamento Operacional (10 pontos) ────────────────────
  // Calculado com base no check-in diário e uso da plataforma
  checkinsThisMonth: int("checkinsThisMonth").default(0).notNull(),
  platformUsageDays: int("platformUsageDays").default(0).notNull(),
  operationalScore: decimal("operationalScore", { precision: 5, scale: 2 }).default("0"), // 0-10

  // ─ Score Total e Classificação ──────────────────────────────────────────────────────────
  totalScore: decimal("totalScore", { precision: 5, scale: 2 }).default("0").notNull(), // 0-100
  grade: mysqlEnum("grade", ["S", "A", "B", "C", "D", "F"]).default("F").notNull(),
  // S=90-100, A=80-89, B=70-79, C=60-69, D=50-59, F=<50
  rankPosition: int("rankPosition"),  // posição no ranking da rede naquele dia

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ClinicHealthScore = typeof clinicHealthScores.$inferSelect;
export type InsertClinicHealthScore = typeof clinicHealthScores.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// CHECK-IN DIÁRIO DA CLÍNICA (entrevista operacional)
// ─────────────────────────────────────────────────────────────────────────────

export const clinicDailyCheckins = mysqlTable("clinic_daily_checkins", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  brandId: int("brandId"),
  checkinDate: varchar("checkinDate", { length: 10 }).notNull(), // "YYYY-MM-DD"
  submittedByUserId: int("submittedByUserId").notNull(),

  // ─ Perguntas sobre Leads ────────────────────────────────────────────────────────────
  leadsReceivedToday: int("leadsReceivedToday").default(0).notNull(),
  leadsContactedToday: int("leadsContactedToday").default(0).notNull(),
  leadsQualifiedToday: int("leadsQualifiedToday").default(0).notNull(), // leads que a clínica considerou qualificados
  leadsNotQualified: int("leadsNotQualified").default(0).notNull(),

  // ─ Perguntas sobre Agendamentos ───────────────────────────────────────────────────
  appointmentsScheduledToday: int("appointmentsScheduledToday").default(0).notNull(),
  appointmentsAttendedToday: int("appointmentsAttendedToday").default(0).notNull(),
  appointmentsNoShowToday: int("appointmentsNoShowToday").default(0).notNull(),
  appointmentsCancelledToday: int("appointmentsCancelledToday").default(0).notNull(),

  // ─ Perguntas sobre Fotos e IA ─────────────────────────────────────────────────────
  leadsWithPhotosToday: int("leadsWithPhotosToday").default(0).notNull(),
  leadsWithAiResultToday: int("leadsWithAiResultToday").default(0).notNull(),

  // ─ Perguntas Qualitativas (texto livre) ──────────────────────────────────────────
  mainChallengesToday: text("mainChallengesToday"),    // "Qual o maior desafio de hoje?"
  bestLeadToday: text("bestLeadToday"),                // "Qual foi o melhor lead de hoje?"
  teamMoodScore: tinyint("teamMoodScore"),             // 1-5 (humor da equipe)
  notes: text("notes"),                               // observações gerais

  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ClinicDailyCheckin = typeof clinicDailyCheckins.$inferSelect;
export type InsertClinicDailyCheckin = typeof clinicDailyCheckins.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// CONVITES DE VENDEDORES (Franqueado convida vendedor)
// ─────────────────────────────────────────────────────────────────────────────

export const sellerInvites = mysqlTable("seller_invites", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),         // FK → clinics.id
  invitedByUserId: int("invitedByUserId").notNull(), // FK → users.id (franqueado)
  email: varchar("email", { length: 320 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(), // token do link de convite
  status: mysqlEnum("status", ["pending", "accepted", "expired", "revoked"]).default("pending").notNull(),
  acceptedByUserId: int("acceptedByUserId"),   // FK → users.id (vendedor que aceitou)
  expiresAt: timestamp("expiresAt").notNull(),
  acceptedAt: timestamp("acceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SellerInvite = typeof sellerInvites.$inferSelect;
export type InsertSellerInvite = typeof sellerInvites.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// MÉTRICAS DE VENDEDOR (calculadas diariamente)
// ─────────────────────────────────────────────────────────────────────────────

export const sellerMetrics = mysqlTable("seller_metrics", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),  // FK → users.id
  metricDate: varchar("metricDate", { length: 10 }).notNull(), // "YYYY-MM-DD"
  // Leads
  leadsAssigned: int("leadsAssigned").default(0).notNull(),    // leads atribuídos ao vendedor
  leadsContacted: int("leadsContacted").default(0).notNull(),  // leads que o vendedor abordou
  leadsScheduled: int("leadsScheduled").default(0).notNull(),  // leads que agendaram
  leadsConverted: int("leadsConverted").default(0).notNull(),  // leads que compareceram
  // Tempo de resposta
  avgResponseTimeMinutes: decimal("avgResponseTimeMinutes", { precision: 8, scale: 2 }).default("0"),
  fastestResponseMinutes: decimal("fastestResponseMinutes", { precision: 8, scale: 2 }),
  // Taxas
  contactRate: decimal("contactRate", { precision: 5, scale: 2 }).default("0"),    // %
  schedulingRate: decimal("schedulingRate", { precision: 5, scale: 2 }).default("0"), // %
  conversionRate: decimal("conversionRate", { precision: 5, scale: 2 }).default("0"), // %
  // Score gamificado
  performanceScore: int("performanceScore").default(0).notNull(), // 0-100
  rankPosition: int("rankPosition"),  // posição no ranking da clínica naquele dia
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SellerMetric = typeof sellerMetrics.$inferSelect;
export type InsertSellerMetric = typeof sellerMetrics.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// ATRIBUIÇÃO DE LEADS A VENDEDORES
// ─────────────────────────────────────────────────────────────────────────────

export const leadAssignments = mysqlTable("lead_assignments", {
  id: int("id").autoincrement().primaryKey(),
  clinicId: int("clinicId").notNull(),
  leadId: int("leadId").notNull(),
  sellerUserId: int("sellerUserId").notNull(),  // FK → users.id
  assignedByUserId: int("assignedByUserId"),    // FK → users.id (franqueado ou sistema)
  status: mysqlEnum("status", ["active", "completed", "transferred"]).default("active").notNull(),
  // Tempo de resposta do vendedor
  firstContactAt: timestamp("firstContactAt"),
  responseTimeMinutes: decimal("responseTimeMinutes", { precision: 8, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LeadAssignment = typeof leadAssignments.$inferSelect;
export type InsertLeadAssignment = typeof leadAssignments.$inferInsert;

// ─────────────────────────────────────────────────────────────────────────────
// CONVITES DE ACESSO POR NÍVEL (Criador convida Admin/Franqueado/Vendedor)
// ─────────────────────────────────────────────────────────────────────────────

export const accessInvites = mysqlTable("access_invites", {
  id: int("id").autoincrement().primaryKey(),
  // Quem gerou o convite
  createdByUserId: int("createdByUserId").notNull(), // FK → users.id (owner)
  // Nível de acesso que será concedido
  role: mysqlEnum("role", ["admin", "franchisee", "seller"]).notNull(),
  // Descrição opcional (ex: "Franqueado Uberaba", "Vendedor João")
  label: varchar("label", { length: 255 }),
  // Token único do link
  token: varchar("token", { length: 128 }).notNull().unique(),
  // Uso único ou múltiplo
  maxUses: int("maxUses").default(1).notNull(), // 1 = uso único, -1 = ilimitado
  useCount: int("useCount").default(0).notNull(),
  // Expiração
  expiresAt: timestamp("expiresAt"),
  // Status
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccessInvite = typeof accessInvites.$inferSelect;
export type InsertAccessInvite = typeof accessInvites.$inferInsert;

// Registro de quem usou cada convite
export const accessInviteUses = mysqlTable("access_invite_uses", {
  id: int("id").autoincrement().primaryKey(),
  inviteId: int("inviteId").notNull(),
  userId: int("userId").notNull(),
  usedAt: timestamp("usedAt").defaultNow().notNull(),
});

export type AccessInviteUse = typeof accessInviteUses.$inferSelect;

