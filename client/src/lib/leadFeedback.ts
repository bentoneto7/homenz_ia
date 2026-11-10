/**
 * Feedback progressivo do lead no card do vendedor (#12)
 *
 * Fonte da verdade: `.homenz-assets/ref/guia-feedback-ia.txt` (Guia de feedback IA
 * do cliente, 32 etapas). Aqui ficam os TEMPLATES CURADOS do Guia mapeados por
 * etapa — determinístico e instantâneo (sem chamada à fal por card; ver nota no fim).
 *
 * Cada etapa tem:
 *  - label: nome da etapa em pt-BR (timeline)
 *  - macro: status macro do CRM (Em aberto / Em atendimento / Agendado / Concluído / Perdido / Reativação)
 *  - recommendation: o texto "Recomendação exibida no card" do Guia (o disclaimer/ação)
 *  - nextAction: "Próxima ação" do Guia (rótulo curto)
 *  - message: mensagem de WhatsApp recomendada, com variáveis {{...}}
 *
 * MELHORIA FUTURA: trocar `message` por geração via fal (server) mantendo este
 * mapa como fallback. A UI já isola o texto em `resolveLeadFeedback().filledMessage`,
 * então basta o backend devolver um texto alternativo.
 */

// Slugs de etapa do Guia (subconjunto alcançável pelos dados atuais do funil).
export type LeadStage =
  | "new_lead"
  | "diagnosis_started"
  | "photo_skipped"
  | "photo_uploaded"
  | "ai_simulation_generated"
  | "scheduling_started"
  | "appointment_confirmed"
  | "attended"
  | "no_show"
  | "closed_won"
  | "lost_price"
  | "lost_no_interest"
  | "reactivation_7d"
  | "inactive_24h";

export type LeadMacroStatus =
  | "Em aberto" | "Em atendimento" | "Agendado" | "Concluído" | "Perdido" | "Reativação";

export interface StageFeedback {
  stage: LeadStage;
  label: string;
  macro: LeadMacroStatus;
  recommendation: string;
  nextAction: string;
  message: string;
}

const STAGES: Record<LeadStage, Omit<StageFeedback, "stage">> = {
  new_lead: {
    label: "Novo lead",
    macro: "Em aberto",
    recommendation: "Novo lead. Abordar imediatamente enquanto a intenção está alta.",
    nextAction: "Chamar no WhatsApp",
    message:
      "Oi, {{nome}}! Tudo bem?\n" +
      "Vi que você começou sua avaliação capilar pela Homenz {{unidade}}.\n" +
      "Vou te ajudar com um diagnóstico inicial rápido. É bem simples e leva menos de 2 minutos.\n" +
      "Pra começar: você está buscando entender melhor sobre queda, entradas, falhas ou afinamento dos fios?",
  },
  diagnosis_started: {
    label: "Diagnóstico iniciado",
    macro: "Em atendimento",
    recommendation: "Diagnóstico iniciado. Manter o lead avançando até completar a avaliação.",
    nextAction: "Retomar diagnóstico",
    message:
      "Perfeito, {{nome}}.\n" +
      "Vi que você começou seu diagnóstico capilar e parou no meio. Posso te ajudar a continuar?\n" +
      "São só algumas perguntas rápidas para entender melhor seu caso e montar uma orientação inicial. É gratuito.",
  },
  photo_skipped: {
    label: "Pulou a foto",
    macro: "Em atendimento",
    recommendation: "Lead sem foto. Continuar para agendamento ou WhatsApp.",
    nextAction: "Conduzir para agenda",
    message:
      "Sem problema, {{nome}}.\n" +
      "A foto ajuda na simulação, mas você também pode fazer a avaliação presencial sem enviar agora.\n" +
      "O especialista consegue analisar melhor pessoalmente e te orientar com segurança.\n" +
      "Quer que eu veja um horário gratuito para você?",
  },
  photo_uploaded: {
    label: "Foto enviada",
    macro: "Em atendimento",
    recommendation: "Foto enviada. Gerar simulação e conduzir para agendamento.",
    nextAction: "Gerar simulação",
    message:
      "Perfeito, {{nome}}. Recebi sua foto.\n" +
      "Agora vou gerar uma simulação inicial para te mostrar um possível caminho de resultado.\n" +
      "Importante: isso é uma expectativa visual, não uma garantia. A indicação correta é confirmada na avaliação presencial.",
  },
  ai_simulation_generated: {
    label: "Simulação gerada",
    macro: "Em atendimento",
    recommendation: "Simulação entregue. Momento ideal para converter em agendamento.",
    nextAction: "Abrir agenda",
    message:
      "{{nome}}, sua simulação já mostra um possível caminho de resultado.\n" +
      "Pelo que você informou, faz sentido passar por uma avaliação gratuita com um especialista da Homenz {{unidade}}.\n" +
      "Assim a equipe consegue analisar seu caso com mais precisão e te mostrar o melhor plano.\n" +
      "Quer escolher um horário agora?",
  },
  scheduling_started: {
    label: "Agendamento iniciado",
    macro: "Em atendimento",
    recommendation: "Escolheu agenda, mas não confirmou. Ajudar a finalizar.",
    nextAction: "Finalizar agendamento",
    message:
      "{{nome}}, vi que você chegou na etapa de escolher o horário da avaliação.\n" +
      "Tenho alguns horários disponíveis na Homenz {{unidade}}.\n" +
      "Você prefere ir de manhã, à tarde ou no fim do dia?",
  },
  appointment_confirmed: {
    label: "Agendou a avaliação",
    macro: "Agendado",
    recommendation: "Cliente agendou. Confirmar presença e reduzir no-show.",
    nextAction: "Confirmar presença",
    message:
      "Perfeito, {{nome}}. Sua avaliação gratuita ficou agendada.\n" +
      "Unidade: Homenz {{unidade}}\n" +
      "Data: {{data}}\n" +
      "Horário: {{horario}}\n" +
      "Endereço: {{endereco}}\n" +
      "No dia, o especialista vai avaliar seu caso e te orientar sobre o melhor caminho.\n" +
      "Posso contar com você nesse horário?",
  },
  attended: {
    label: "Compareceu",
    macro: "Concluído",
    recommendation: "Compareceu. Registrar proposta e próximo passo comercial.",
    nextAction: "Tirar dúvidas / proposta",
    message:
      "{{nome}}, obrigado por comparecer à avaliação.\n" +
      "Agora que a equipe já entendeu melhor o seu caso, o próximo passo é avaliar o plano indicado e tirar qualquer dúvida antes da decisão.\n" +
      "Ficou alguma dúvida sobre o tratamento, valores ou próximos passos?",
  },
  no_show: {
    label: "Não compareceu",
    macro: "Reativação",
    recommendation: "Não compareceu. Recuperar sem gerar culpa.",
    nextAction: "Remarcar",
    message:
      "Oi, {{nome}}. Tudo bem?\n" +
      "Vi que você não conseguiu comparecer à avaliação. Acontece.\n" +
      "Quer que eu veja um novo horário para você?\n" +
      "Quanto antes avaliarmos, mais clareza você tem sobre o que está acontecendo e quais caminhos fazem sentido.",
  },
  closed_won: {
    label: "Fechou",
    macro: "Concluído",
    recommendation: "Cliente fechou. Enviar boas-vindas e orientar próximos passos.",
    nextAction: "Boas-vindas / pós-venda",
    message:
      "{{nome}}, seja bem-vindo à Homenz {{unidade}}.\n" +
      "A partir de agora, a equipe vai te acompanhar de perto para conduzir o tratamento da melhor forma possível.\n" +
      "Qualquer dúvida durante o processo, pode chamar por aqui.",
  },
  lost_price: {
    label: "Não fechou",
    macro: "Reativação",
    recommendation: "Não fechou por preço. Manter relacionamento e reativar com condição.",
    nextAction: "Programar reativação",
    message:
      "Entendo, {{nome}}.\n" +
      "Vou deixar registrado que neste momento o investimento ficou fora do que você estava planejando.\n" +
      "Se em outro momento fizer sentido retomar, posso te ajudar novamente.\n" +
      "E se surgir alguma condição especial da clínica, posso te avisar?",
  },
  lost_no_interest: {
    label: "Sem interesse",
    macro: "Perdido",
    recommendation: "Sem interesse. Encerrar com elegância.",
    nextAction: "Marcar como perdido",
    message:
      "Sem problema, {{nome}}.\n" +
      "Obrigado por me responder.\n" +
      "Vou encerrar seu atendimento por aqui, mas se em algum momento você quiser retomar a avaliação ou tirar dúvidas, é só me chamar.",
  },
  reactivation_7d: {
    label: "Reativação",
    macro: "Reativação",
    recommendation: "Reativação curta. Retomar assunto enquanto ainda há memória da avaliação.",
    nextAction: "Reabrir conversa",
    message:
      "Oi, {{nome}}. Tudo bem?\n" +
      "Passando para saber se você ainda pensa em fazer uma avaliação capilar.\n" +
      "Às vezes a pessoa deixa para depois, mas a dúvida continua.\n" +
      "Se ainda fizer sentido, posso verificar um horário gratuito na Homenz {{unidade}}.",
  },
  inactive_24h: {
    label: "Inativo 24h",
    macro: "Em aberto",
    recommendation: "Lead inativo há mais de 24h. Reengajamento necessário.",
    nextAction: "Enviar reativação",
    message:
      "Oi, {{nome}}. Tudo bem?\n" +
      "Estou encerrando alguns atendimentos aqui, mas antes quis te chamar mais uma vez.\n" +
      "Você ainda tem interesse em fazer uma avaliação capilar gratuita na Homenz {{unidade}}?\n" +
      "Se sim, posso te mostrar os horários disponíveis.",
  },
};

// Conjuntos de funnel_step (cobre TiDB e Supabase) para resolver a etapa.
const SCHEDULED_STEPS = new Set(["scheduled", "confirmed"]);
const AI_STEPS = new Set(["ai_processing", "ai_ready", "ai_done", "ai_failed"]);
const PHOTO_STEPS = new Set(["photos_uploaded", "photos_done", "photos_completed"]);
const DIAGNOSIS_STEPS = new Set([
  "chat_started", "form_started", "diagnosis_started",
  "complaint_identified", "region_identified", "duration_identified",
  "treatment_history_identified", "goal_identified", "photo_requested",
]);
const QUIZ_DONE_STEPS = new Set(["chat_completed", "chat_done", "form_completed", "form_done"]);

export interface FeedbackLead {
  funnel_step?: string | null;
  appointment_at?: string | null;
  photo_url?: string | null;
  attendance_status?: string | null;
  created_at?: string | null;
  last_activity_at?: string | null;
  city?: string | null;
}

/**
 * Resolve a ETAPA do lead a partir dos campos que o sistema já tem
 * (funnel_step + appointment_at + attendance_status + photo_url). O desfecho do
 * atendimento (quando o vendedor marcou) tem prioridade sobre a etapa do funil.
 */
export function resolveLeadStage(lead: FeedbackLead): LeadStage {
  const att = lead.attendance_status;
  // 1) Desfecho marcado pelo vendedor manda
  if (att === "closed_sale") return "closed_won";
  if (att === "closed_no_sale") return "lost_price";
  if (att === "contact_later") return "reactivation_7d";
  if (att === "resolved") return "attended";

  // 2) Agendou (etapa mais avançada do funil automático)
  if (lead.appointment_at || SCHEDULED_STEPS.has(lead.funnel_step ?? "")) return "appointment_confirmed";

  // 3) Etapas de foto/IA
  const step = lead.funnel_step ?? "";
  if (step === "schedule_started") return "scheduling_started";
  if (AI_STEPS.has(step)) return "ai_simulation_generated";
  if (PHOTO_STEPS.has(step) || lead.photo_url) return "photo_uploaded";

  // 4) Terminou o quiz mas não enviou foto
  if (QUIZ_DONE_STEPS.has(step)) return "photo_skipped";

  // 5) Começou o diagnóstico
  if (DIAGNOSIS_STEPS.has(step)) return "diagnosis_started";

  // 6) Lead novo (landing) — se ficou >24h parado e sem atendimento, vira reengajamento
  if (!att || att === "open") {
    const ref = new Date(lead.last_activity_at ?? lead.created_at ?? Date.now()).getTime();
    const hours = (Date.now() - ref) / 3_600_000;
    if (hours > 24) return "inactive_24h";
  }
  return "new_lead";
}

export interface MessageVars {
  nome?: string | null;
  unidade?: string | null;
  cidade?: string | null;
  vendedor_nome?: string | null;
  data?: string | null;
  horario?: string | null;
  endereco?: string | null;
}

/**
 * Preenche o template substituindo {{var}} pelos valores disponíveis.
 * Linha do tipo "Rótulo: {{var}}" cuja variável não tem valor é omitida inteira
 * (evita "Endereço: " vazio). Variáveis inline sem valor viram "".
 */
export function fillMessageTemplate(template: string, vars: MessageVars): string {
  const get = (key: string): string | null => {
    const v = (vars as Record<string, unknown>)[key];
    return v == null || v === "" ? null : String(v);
  };
  const lines = template.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    const isLabelLine = /^[^:]{1,20}:\s*\{\{\w+\}\}\s*$/.test(line.trim());
    const keys = Array.from(line.matchAll(/\{\{(\w+)\}\}/g), (m) => m[1]);
    // "Data: {{data}}" sem valor → pula a linha
    if (isLabelLine && keys.some((k) => get(k) == null)) continue;
    out.push(line.replace(/\{\{(\w+)\}\}/g, (_, k) => get(k) ?? ""));
  }
  return out.join("\n").trim();
}

export interface ResolvedFeedback extends StageFeedback {
  filledMessage: string;
}

/** Junta etapa + template preenchido para o card consumir direto. */
export function resolveLeadFeedback(lead: FeedbackLead, vars: MessageVars): ResolvedFeedback {
  const stage = resolveLeadStage(lead);
  const base = STAGES[stage];
  return {
    stage,
    ...base,
    filledMessage: fillMessageTemplate(base.message, vars),
  };
}

// Marcos da timeline visíveis no card.
export const TIMELINE_MILESTONES = [
  { key: "lead", label: "Chegou" },
  { key: "diagnosis", label: "Diagnóstico" },
  { key: "photo", label: "Foto" },
  { key: "simulation", label: "Simulação" },
  { key: "scheduled", label: "Agendou" },
  { key: "attended", label: "Avaliação" },
] as const;

export type MilestoneKey = typeof TIMELINE_MILESTONES[number]["key"];

/** Índice do marco atingido (0-based) para desenhar a timeline. -1 = nenhum. */
export function milestoneIndexForStage(stage: LeadStage): number {
  switch (stage) {
    case "new_lead":
    case "inactive_24h":
      return 0;
    case "diagnosis_started":
      return 1;
    case "photo_skipped":
    case "photo_uploaded":
      return 2;
    case "ai_simulation_generated":
      return 3;
    case "scheduling_started":
    case "appointment_confirmed":
      return 4;
    case "attended":
    case "closed_won":
      return 5;
    case "no_show":
      return 4;
    case "lost_price":
    case "lost_no_interest":
    case "reactivation_7d":
      return 1;
    default:
      return 0;
  }
}
