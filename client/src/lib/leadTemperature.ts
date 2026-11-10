/**
 * Sistema de Temperatura do Lead
 * Define a urgência de ação com base no tempo desde a última atividade
 * e na etapa do funil em que o lead se encontra.
 */

export type LeadTemperature = "hot" | "warm" | "cold" | "frozen";

export interface TemperatureConfig {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  urgency: string;
  description: string;
  maxMinutes: number; // até quantos minutos essa temperatura se aplica
}

export const TEMPERATURE_CONFIG: Record<LeadTemperature, TemperatureConfig> = {
  hot: {
    label: "Quente",
    emoji: "🔥",
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/40",
    urgency: "AGIR AGORA",
    description: "Lead acabou de entrar — janela de ouro para conversão",
    maxMinutes: 30,
  },
  warm: {
    label: "Morno",
    emoji: "🌡️",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/40",
    urgency: "ATENÇÃO",
    description: "Interesse ainda presente — contato urgente recomendado",
    maxMinutes: 120,
  },
  cold: {
    label: "Frio",
    emoji: "🧊",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/40",
    urgency: "RECUPERAR",
    description: "Interesse esfriando — use mensagem de reengajamento",
    maxMinutes: 1440, // 24h
  },
  frozen: {
    label: "Perdido",
    emoji: "💀",
    color: "text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/40",
    urgency: "ÚLTIMA CHANCE",
    description: "Lead inativo há mais de 24h — tente abordagem diferente",
    maxMinutes: Infinity,
  },
};

export function getLeadTemperature(lastActivityAt: Date | string): LeadTemperature {
  const last = new Date(lastActivityAt);
  const minutesAgo = (Date.now() - last.getTime()) / (1000 * 60);

  if (minutesAgo <= 30) return "hot";
  if (minutesAgo <= 120) return "warm";
  if (minutesAgo <= 1440) return "cold";
  return "frozen";
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPERATURA POR AÇÃO (decisão do cliente Bento, 17/06)
// A temperatura de CHEGADA do lead é a PROFUNDIDADE de interação no funil, não o
// tempo. Só existem 3 níveis (sem "Inativo"):
//   • QUENTE = agendou a consulta
//   • MORNO  = passou da etapa de foto (enviou foto / viu o resultado da IA) mas
//              ainda não agendou
//   • FRIO   = abandonou antes das fotos (≤ ~metade do formulário)
// O tempo de inatividade ainda pode ESFRIAR (nunca esquentar) um lead que segue
// sem atendimento — ver applyInactivityDecay. A duplicata desta régua no backend
// (server/routers/homenz.ts → sellerDashboard) precisa ser mantida idêntica.
// ─────────────────────────────────────────────────────────────────────────────

export type ActionTemperature = "hot" | "warm" | "cold";

// funnel_step que indicam "já agendou" (QUENTE). Cobre TiDB e Supabase.
const SCHEDULED_STEPS = new Set(["scheduled", "confirmed", "completed"]);
// funnel_step a partir da etapa de foto/IA (MORNO quando ainda não agendou).
const PHOTO_OR_DEEPER_STEPS = new Set([
  "photos_started", "photos_uploaded", "photos_done", "photos_completed",
  "ai_processing", "ai_ready", "ai_done", "ai_failed",
  "schedule_started",
]);

/**
 * Temperatura por AÇÃO a partir da progressão do lead no funil.
 * Não depende de tempo — é só a profundidade alcançada.
 */
export function getActionTemperature(lead: {
  funnel_step?: string | null;
  appointment_at?: string | null;
  photo_url?: string | null;
}): ActionTemperature {
  const step = lead.funnel_step ?? "";
  // QUENTE: agendou (por step ou por ter agendamento real registrado)
  if (lead.appointment_at || SCHEDULED_STEPS.has(step)) return "hot";
  // MORNO: chegou na etapa de foto/IA ou enviou foto, mas não agendou
  if (PHOTO_OR_DEEPER_STEPS.has(step) || lead.photo_url) return "warm";
  // FRIO: abandonou antes das fotos (landing, chat_*, form_*, etc.)
  return "cold";
}

/**
 * Esfria (nunca esquenta) um lead por inatividade. Regras:
 * - QUENTE (agendou) NUNCA esfria por tempo: agendamento é compromisso firme e
 *   segue como a maior prioridade do vendedor até a consulta acontecer.
 * - Só esfria enquanto o lead NÃO está em atendimento (open). Lead já trabalhado
 *   pelo vendedor não é rebaixado por tempo.
 * - MORNO parado > 24h e sem atendimento cai para FRIO.
 */
export function applyInactivityDecay(
  base: ActionTemperature,
  opts: { lastActivityAt?: string | null; createdAt?: string | null; attendanceStatus?: string | null },
): ActionTemperature {
  // Agendou: prioridade máxima, sem decaimento por tempo.
  if (base === "hot") return "hot";
  // Em atendimento ou desfecho: respeita a temperatura por ação, sem decaimento.
  if (opts.attendanceStatus && opts.attendanceStatus !== "open") return base;
  const ref = new Date(opts.lastActivityAt ?? opts.createdAt ?? Date.now()).getTime();
  const hoursAgo = (Date.now() - ref) / (1000 * 60 * 60);
  // MORNO parado > 24h sem atendimento esfria para FRIO.
  if (base === "warm" && hoursAgo > 24) return "cold";
  return base;
}

export function getMinutesAgo(date: Date | string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60));
}

export function formatTimeSince(date: Date | string): string {
  const minutes = getMinutesAgo(date);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}min atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h atrás`;
}

export function formatTimeSinceLive(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  return `${seconds}s`;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBOOK DE AÇÕES POR ETAPA DO FUNIL
// Define o que o funcionário deve fazer em cada combinação de etapa + temperatura
// ─────────────────────────────────────────────────────────────────────────────

export interface PlaybookAction {
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  instruction: string;
  whatsappTemplate?: string; // mensagem pré-redigida para WhatsApp
  timeLimit: string; // prazo para agir
}

export type FunnelStep =
  | "landing" | "form_started" | "form_done"
  | "chat_started" | "chat_done"
  | "photos_started" | "photos_done"
  | "ai_processing" | "ai_done"
  | "schedule_started" | "scheduled"
  | "confirmed" | "completed" | "cancelled";

export const FUNNEL_STEP_LABELS: Record<FunnelStep, string> = {
  landing: "Chegou na Landing",
  form_started: "Iniciou Formulário",
  form_done: "Formulário Concluído",
  chat_started: "Iniciou o Chat",
  chat_done: "Chat Concluído",
  photos_started: "Iniciou as Fotos",
  photos_done: "Fotos Enviadas",
  ai_processing: "IA Processando",
  ai_done: "Resultado 3D Pronto",
  schedule_started: "Abrindo Agendamento",
  scheduled: "Agendamento Criado",
  confirmed: "Consulta Confirmada",
  completed: "Consulta Realizada",
  cancelled: "Cancelado",
};

// O funil da franquia (Supabase) usa alguns nomes de step diferentes do mapa
// acima (TiDB). Cobrimos ambos para nunca exibir o valor cru em inglês.
const FUNNEL_STEP_LABELS_EXTRA: Record<string, string> = {
  chat_completed: "Chat Concluído",
  form_completed: "Formulário Concluído",
  photos_completed: "Fotos Enviadas",
  ai_failed: "Falha na IA",
  abandoned: "Abandonado",
  no_show: "Não Compareceu",
};

/** Rótulo pt-BR de um estágio do funil, cobrindo TiDB e Supabase. */
export function funnelStepLabel(step?: string | null): string {
  if (!step) return "—";
  return (
    (FUNNEL_STEP_LABELS as Record<string, string>)[step] ??
    FUNNEL_STEP_LABELS_EXTRA[step] ??
    step.replace(/_/g, " ")
  );
}

export const FUNNEL_STEP_ORDER: FunnelStep[] = [
  "landing", "form_started", "form_done",
  "chat_started", "chat_done",
  "photos_started", "photos_done",
  "ai_processing", "ai_done",
  "schedule_started", "scheduled",
  "confirmed", "completed",
];

export function getPlaybookAction(
  funnelStep: FunnelStep,
  temperature: LeadTemperature,
  leadName: string,
  leadPhone: string,
): PlaybookAction {
  const phone = leadPhone.replace(/\D/g, "");

  const actions: Partial<Record<FunnelStep, Record<LeadTemperature, PlaybookAction>>> = {
    form_done: {
      hot: {
        priority: "critical",
        title: "🔥 Lead acabou de entrar — contate AGORA",
        instruction: "O lead preencheu o formulário há menos de 30 minutos. Essa é a janela de ouro: a taxa de conversão cai 80% após 1 hora. Ligue ou mande WhatsApp imediatamente.",
        whatsappTemplate: `Oi ${leadName}! 😊 Aqui é da Clínica CapilarIA. Vi que você iniciou seu diagnóstico capilar. Posso te ajudar a continuar? Temos horários disponíveis essa semana! 💆‍♂️`,
        timeLimit: "Agir em até 5 minutos",
      },
      warm: {
        priority: "high",
        title: "🌡️ Lead morno — contate nos próximos 30 minutos",
        instruction: "O lead preencheu o formulário mas não avançou. Ainda tem interesse — um contato agora pode reengajar.",
        whatsappTemplate: `Oi ${leadName}! Aqui é da Clínica CapilarIA. Notei que você começou seu diagnóstico capilar. Posso te ajudar a continuar? É rápido e gratuito! 🎯`,
        timeLimit: "Agir em até 30 minutos",
      },
      cold: {
        priority: "medium",
        title: "🧊 Lead esfriando — use mensagem de reengajamento",
        instruction: "O lead parou no formulário há mais de 2 horas. Use uma mensagem com senso de urgência ou benefício exclusivo para reengajar.",
        whatsappTemplate: `${leadName}, tudo bem? 👋 Você iniciou seu diagnóstico capilar gratuito na CapilarIA mas não concluiu. Ainda temos vagas disponíveis essa semana — quer garantir a sua? 🔒`,
        timeLimit: "Agir hoje",
      },
      frozen: {
        priority: "low",
        title: "💀 Lead frio — última tentativa",
        instruction: "Lead inativo há mais de 24h. Tente uma última abordagem com oferta especial ou depoimento de resultado.",
        whatsappTemplate: `${leadName}, oi! 🌟 Você se interessou pelo diagnóstico capilar da CapilarIA. Temos um resultado incrível de um cliente com perfil parecido com o seu — posso te mostrar? Sem compromisso! 😊`,
        timeLimit: "Última tentativa",
      },
    },
    chat_done: {
      hot: {
        priority: "critical",
        title: "🔥 Chat concluído — lead qualificado! Confirme o agendamento",
        instruction: "O lead concluiu o chat e está com alto interesse. Ele está na etapa de fotos agora. Se travar, contate imediatamente para ajudar.",
        whatsappTemplate: `${leadName}, parabéns por concluir o diagnóstico! 🎉 Agora é só tirar as fotos e ver como vai ficar seu resultado. Qualquer dúvida, estou aqui! 📱`,
        timeLimit: "Monitorar em tempo real",
      },
      warm: {
        priority: "high",
        title: "🌡️ Chat concluído mas parou nas fotos",
        instruction: "O lead concluiu o chat mas não avançou para as fotos. Pode ter tido dificuldade técnica ou insegurança. Ofereça ajuda.",
        whatsappTemplate: `${leadName}, vi que você concluiu o chat! 😊 Tá travando nas fotos? É super simples — você tira pelo celular mesmo, em casa. Posso te guiar? 📸`,
        timeLimit: "Agir em até 1 hora",
      },
      cold: {
        priority: "medium",
        title: "🧊 Lead parou após o chat",
        instruction: "O lead completou o chat mas não avançou. Reforce o valor do diagnóstico 3D gratuito.",
        whatsappTemplate: `${leadName}, você está a um passo de ver como vai ficar seu resultado! 🔥 O diagnóstico 3D é gratuito e você vê o antes/depois em minutos. Vale muito a pena continuar! 💪`,
        timeLimit: "Agir hoje",
      },
      frozen: {
        priority: "low",
        title: "💀 Lead abandonou após o chat",
        instruction: "Lead inativo após o chat. Tente reativar com prova social.",
        whatsappTemplate: `${leadName}, oi! Você fez o diagnóstico mas não viu o resultado. Olha o que aconteceu com um cliente nosso: [foto resultado]. Quer ver o seu também? 🎯`,
        timeLimit: "Última tentativa",
      },
    },
    photos_done: {
      hot: {
        priority: "critical",
        title: "🔥 Fotos enviadas — IA processando! Acompanhe",
        instruction: "O lead enviou as fotos e está aguardando o resultado da IA. Esse é o momento de maior ansiedade — esteja disponível para quando o resultado sair.",
        timeLimit: "Aguardar resultado da IA",
      },
      warm: {
        priority: "high",
        title: "🌡️ Fotos enviadas mas não viu o resultado",
        instruction: "O lead enviou as fotos mas não voltou para ver o resultado 3D. Notifique-o que o resultado está pronto.",
        whatsappTemplate: `${leadName}, seu diagnóstico capilar 3D ficou PRONTO! 🎉 Você pode ver agora como vai ficar após o procedimento. Acesse: [link] 🔥`,
        timeLimit: "Agir em até 2 horas",
      },
      cold: {
        priority: "medium",
        title: "🧊 Lead não voltou para ver o resultado",
        instruction: "O resultado 3D está pronto mas o lead não acessou. Reforce a curiosidade.",
        whatsappTemplate: `${leadName}, seu resultado está te esperando! 👀 Muita gente fica surpreso com o antes/depois. Acesse agora e veja: [link] ⚡`,
        timeLimit: "Agir hoje",
      },
      frozen: {
        priority: "low",
        title: "💀 Lead não acessou o resultado",
        instruction: "Lead inativo após envio de fotos. Última tentativa com urgência.",
        whatsappTemplate: `${leadName}, seu diagnóstico capilar expira em breve! ⏰ Acesse agora para ver seu resultado 3D gratuito: [link]`,
        timeLimit: "Última tentativa",
      },
    },
    ai_done: {
      hot: {
        priority: "critical",
        title: "🔥 Resultado 3D visto — FECHE O AGENDAMENTO AGORA",
        instruction: "O lead viu o resultado 3D e está no pico do interesse. Esse é o momento de maior conversão. Se não agendou em 10 minutos, contate imediatamente.",
        whatsappTemplate: `${leadName}, que resultado incrível, né? 😍 Temos horários disponíveis ESSA SEMANA para você começar. Qual dia funciona melhor para você? 📅`,
        timeLimit: "Agir em até 10 minutos",
      },
      warm: {
        priority: "high",
        title: "🌡️ Viu o resultado mas não agendou",
        instruction: "O lead viu o resultado 3D mas não avançou para o agendamento. Crie urgência com vagas limitadas.",
        whatsappTemplate: `${leadName}, vi que você viu seu resultado! 🔥 Temos apenas 3 vagas disponíveis essa semana. Quer garantir a sua antes de acabar? 📅`,
        timeLimit: "Agir em até 1 hora",
      },
      cold: {
        priority: "medium",
        title: "🧊 Lead esfriou após ver o resultado",
        instruction: "O lead viu o resultado mas não agendou. Ofereça uma vantagem exclusiva para converter agora.",
        whatsappTemplate: `${leadName}, você viu seu diagnóstico! Temos uma condição especial para quem agenda essa semana. Posso te contar mais? 🎁`,
        timeLimit: "Agir hoje",
      },
      frozen: {
        priority: "low",
        title: "💀 Lead não converteu após o resultado",
        instruction: "Lead inativo após ver o resultado 3D. Tente com depoimento de resultado similar.",
        whatsappTemplate: `${leadName}, olha o resultado de um cliente com perfil parecido com o seu! [foto] Quer agendar sua avaliação gratuita? 💪`,
        timeLimit: "Última tentativa",
      },
    },
    scheduled: {
      hot: {
        priority: "high",
        title: "✅ Agendamento criado — confirme em até 2 horas",
        instruction: "O lead agendou! Confirme o agendamento rapidamente para reduzir o no-show. Envie confirmação com endereço e orientações.",
        whatsappTemplate: `${leadName}, seu agendamento foi confirmado! 🎉\n\n📅 Data: [data]\n⏰ Horário: [hora]\n📍 Endereço: [endereço]\n\nQualquer dúvida, estou aqui! Até lá! 😊`,
        timeLimit: "Confirmar em até 2 horas",
      },
      warm: {
        priority: "medium",
        title: "📅 Agendamento pendente de confirmação",
        instruction: "O agendamento ainda não foi confirmado. Confirme para reduzir o risco de no-show.",
        whatsappTemplate: `${leadName}, confirmando seu agendamento! 📅 Estamos te esperando em [data] às [hora]. Qualquer imprevisto, me avisa com antecedência, ok? 😊`,
        timeLimit: "Confirmar hoje",
      },
      cold: {
        priority: "medium",
        title: "⚠️ Agendamento sem confirmação há mais de 2h",
        instruction: "O agendamento não foi confirmado. Risco de no-show aumentando. Confirme agora e envie lembrete.",
        whatsappTemplate: `${leadName}, tudo certo para [data] às [hora]? 😊 Só confirmando para garantir sua vaga! Nos vemos em breve! 💆‍♂️`,
        timeLimit: "Confirmar urgente",
      },
      frozen: {
        priority: "high",
        title: "🚨 Agendamento sem confirmação há +24h",
        instruction: "Alto risco de no-show. Ligue para o lead agora para confirmar presença.",
        whatsappTemplate: `${leadName}, seu agendamento é [data] às [hora]. Você ainda vai comparecer? Me confirma para eu reservar sua vaga! 🙏`,
        timeLimit: "Ligar agora",
      },
    },
    confirmed: {
      hot: {
        priority: "medium",
        title: "✅ Consulta confirmada — envie lembrete 24h antes",
        instruction: "Agendamento confirmado. Programe um lembrete para 24h antes da consulta.",
        whatsappTemplate: `${leadName}, lembrando que amanhã é o seu dia! 🎉 Te esperamos às [hora] em [endereço]. Qualquer dúvida, estou aqui! 😊`,
        timeLimit: "Lembrete 24h antes",
      },
      warm: {
        priority: "medium",
        title: "📅 Consulta confirmada — envie lembrete",
        instruction: "Envie lembrete com instruções de preparo para a consulta.",
        whatsappTemplate: `${leadName}, sua consulta é [data] às [hora]! 💆‍♂️ Chegue 10 minutos antes. Te esperamos! 😊`,
        timeLimit: "Enviar lembrete",
      },
      cold: {
        priority: "high",
        title: "⚠️ Consulta confirmada mas sem lembrete enviado",
        instruction: "A consulta está próxima e nenhum lembrete foi enviado. Risco de no-show. Envie agora.",
        whatsappTemplate: `${leadName}, não esquece! Sua consulta é [data] às [hora]. Te esperamos! 🙏`,
        timeLimit: "Enviar lembrete urgente",
      },
      frozen: {
        priority: "critical",
        title: "🚨 Consulta em breve — confirme presença",
        instruction: "A consulta está muito próxima. Ligue para confirmar presença e evitar no-show.",
        whatsappTemplate: `${leadName}, sua consulta é hoje às [hora]! Você está vindo? Me confirma! 🙏`,
        timeLimit: "Ligar agora",
      },
    },
  };

  // Buscar ação específica para a etapa e temperatura
  const stepActions = actions[funnelStep];
  if (stepActions && stepActions[temperature]) {
    return stepActions[temperature];
  }

  // Ação padrão se não houver específica
  const defaultActions: Record<LeadTemperature, PlaybookAction> = {
    hot: {
      priority: "high",
      title: `🔥 Lead quente em ${FUNNEL_STEP_LABELS[funnelStep]}`,
      instruction: "Lead ativo recentemente. Acompanhe o progresso e esteja disponível para ajudar.",
      timeLimit: "Monitorar",
    },
    warm: {
      priority: "medium",
      title: `🌡️ Lead morno em ${FUNNEL_STEP_LABELS[funnelStep]}`,
      instruction: "Lead com atividade recente mas sem avanço. Considere um contato de apoio.",
      whatsappTemplate: `${leadName}, posso te ajudar com alguma dúvida? 😊`,
      timeLimit: "Agir em até 1 hora",
    },
    cold: {
      priority: "medium",
      title: `🧊 Lead frio em ${FUNNEL_STEP_LABELS[funnelStep]}`,
      instruction: "Lead inativo. Use mensagem de reengajamento personalizada.",
      whatsappTemplate: `${leadName}, ainda posso te ajudar? 😊 Temos horários disponíveis essa semana!`,
      timeLimit: "Agir hoje",
    },
    frozen: {
      priority: "low",
      title: `💀 Lead perdido em ${FUNNEL_STEP_LABELS[funnelStep]}`,
      instruction: "Lead inativo há muito tempo. Tente última abordagem ou arquive.",
      whatsappTemplate: `${leadName}, última tentativa de contato. Posso te ajudar com algo? 🙏`,
      timeLimit: "Última tentativa",
    },
  };

  return defaultActions[temperature];
}

// Cores de prioridade para o badge
export const PRIORITY_CONFIG = {
  critical: { label: "CRÍTICO", color: "text-red-400", bgColor: "bg-red-500/20", borderColor: "border-red-500/40" },
  high: { label: "ALTO", color: "text-orange-400", bgColor: "bg-orange-500/20", borderColor: "border-orange-500/40" },
  medium: { label: "MÉDIO", color: "text-yellow-400", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/40" },
  low: { label: "BAIXO", color: "text-slate-400", bgColor: "bg-slate-500/20", borderColor: "border-slate-500/40" },
};
