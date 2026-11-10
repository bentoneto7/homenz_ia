import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Target, Calendar, Phone, MessageSquare,
  Loader2, Clock, TrendingUp, CheckCircle2, AlertTriangle,
  Flame, Thermometer, Snowflake, Copy, Check, Sparkles,
} from "lucide-react";
import { getActionTemperature, applyInactivityDecay, type ActionTemperature } from "@/lib/leadTemperature";
import {
  resolveLeadFeedback, milestoneIndexForStage, TIMELINE_MILESTONES,
  type FeedbackLead, type MessageVars,
} from "@/lib/leadFeedback";

// Ícone por nível de temperatura (substitui os emojis 🔥🌡🧊)
const HEAT_ICON: Record<ActionTemperature, typeof Flame> = {
  hot: Flame,
  warm: Thermometer,
  cold: Snowflake,
};
import { toast } from "sonner";

// ── Temperatura por AÇÃO (decisão Bento 17/06) ───────────────────────────────
// A temperatura é a PROFUNDIDADE da interação no funil, não o tempo:
//   🔥 QUENTE = agendou a consulta
//   🌡 MORNO  = passou da etapa de foto (enviou foto / viu IA) mas não agendou
//   🧊 FRIO   = abandonou antes das fotos
// Sem "Inativo". O tempo só ESFRIA um lead sem atendimento (applyInactivityDecay).
// A régua canônica fica em @/lib/leadTemperature (getActionTemperature).

type HeatLevel = ActionTemperature;

interface HeatInfo {
  level: HeatLevel;
  label: string;
  // "calor" exibido na barra: derivado do nível (quente cheio, frio quase vazio)
  heatPercent: number;
  timeDisplay: string;
  urgencyMessage: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  avatarBg: string;
  avatarText: string;
}

// Lead mínimo que a régua de ação precisa
type HeatLead = {
  funnel_step?: string | null;
  appointment_at?: string | null;
  photo_url?: string | null;
  attendance_status?: string | null;
  created_at?: string | null;
  last_activity_at?: string | null;
};

function getHeatInfo(lead: HeatLead): HeatInfo {
  // Desfecho de atendimento (resolved/closed_*): não disputa mais atenção → frio.
  // Mesma regra do backend (sellerDashboard).
  const closed = !!lead.attendance_status && !["open", "in_progress"].includes(lead.attendance_status);
  const base = closed ? "cold" : getActionTemperature(lead);
  const level = closed ? "cold" : applyInactivityDecay(base, {
    lastActivityAt: lead.last_activity_at,
    createdAt: lead.created_at,
    attendanceStatus: lead.attendance_status,
  });

  // Tempo desde a última atividade — exibido como referência, não define o nível
  const ref = Math.max(
    lead.created_at ? new Date(lead.created_at).getTime() : 0,
    lead.last_activity_at ? new Date(lead.last_activity_at).getTime() : 0,
  );
  const minutesElapsed = ref > 0 ? (Date.now() - ref) / 60000 : 0;
  let timeDisplay: string;
  if (minutesElapsed < 1) {
    timeDisplay = "agora mesmo";
  } else if (minutesElapsed < 60) {
    timeDisplay = `${Math.floor(minutesElapsed)}min atrás`;
  } else if (minutesElapsed < 1440) {
    const h = Math.floor(minutesElapsed / 60);
    const m = Math.floor(minutesElapsed % 60);
    timeDisplay = m > 0 ? `${h}h ${m}min atrás` : `${h}h atrás`;
  } else {
    const d = Math.floor(minutesElapsed / 1440);
    timeDisplay = `${d}d atrás`;
  }

  const config: Record<HeatLevel, Pick<HeatInfo, "label" | "heatPercent" | "urgencyMessage" | "borderColor" | "bgColor" | "textColor" | "avatarBg" | "avatarText">> = {
    hot: {
      label: "Quente",
      heatPercent: 100,
      urgencyMessage: "Agendou — confirme e prepare a consulta",
      borderColor: "border-orange-500/40",
      bgColor: "bg-orange-500/8",
      textColor: "text-orange-400",
      avatarBg: "bg-orange-500/20",
      avatarText: "text-orange-300",
    },
    warm: {
      label: "Morno",
      heatPercent: 60,
      urgencyMessage: "Avançou até a foto — incentive a agendar",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      textColor: "text-amber-400",
      avatarBg: "bg-amber-500/20",
      avatarText: "text-amber-300",
    },
    cold: {
      label: "Frio",
      heatPercent: 22,
      urgencyMessage: "Abandonou cedo — reengaje pelo WhatsApp",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/5",
      textColor: "text-blue-400",
      avatarBg: "bg-blue-500/20",
      avatarText: "text-blue-300",
    },
  };

  return { level, timeDisplay, ...config[level] };
}

// ── Componente de barra de temperatura ───────────────────────────────────────
function HeatBar({ heatPercent, level }: { heatPercent: number; level: HeatLevel }) {
  const gradientMap: Record<HeatLevel, string> = {
    hot: "from-red-500 via-orange-400 to-amber-300",
    warm: "from-amber-500 via-yellow-400 to-lime-300",
    cold: "from-blue-500 via-cyan-400 to-teal-300",
  };
  return (
    <div className="h-1 bg-white rounded-full overflow-hidden mt-3">
      <div
        className={`h-full bg-gradient-to-r ${gradientMap[level]} rounded-full transition-all duration-1000`}
        style={{ width: `${Math.max(2, heatPercent)}%` }}
      />
    </div>
  );
}

// ── Badge de temperatura com animação ────────────────────────────────────────
function HeatBadge({ level, label }: { level: HeatLevel; label: string }) {
  const colorMap: Record<HeatLevel, string> = {
    hot: "text-orange-500 bg-orange-500/15 border-orange-500/30",
    warm: "text-amber-500 bg-amber-500/15 border-amber-500/30",
    cold: "text-blue-500 bg-blue-500/15 border-blue-500/30",
  };
  const Icon = HEAT_ICON[level];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${colorMap[level]} ${level === "hot" ? "animate-pulse" : ""}`}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ── Badge de score ────────────────────────────────────────────────────────────
function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
    score >= 50 ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
    "text-blue-400 bg-blue-500/15 border-blue-500/30";
  return (
    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${color}`}>{score} pts</span>
  );
}

// ── Status de atendimento (comercial) — o vendedor vê e edita ──────────────────
// Estados em pt-BR. "open" é automático (lead novo não abordado); o vendedor muda
// para "in_progress" (em atendimento) e desfechos. Separado da temperatura (tempo).
const ATTENDANCE_LABELS: Record<string, string> = {
  open: "Em aberto",
  in_progress: "Em atendimento",
  resolved: "Atendimento concluído",
  closed_sale: "Fechou venda",
  closed_no_sale: "Não fechou",
  contact_later: "Contato futuro",
};

type LeadStatusInput = { attendance_status?: string | null; appointment_at?: string | null; funnel_step?: string };

// Status principal exibido na lista. Prioriza o desfecho do atendimento; se ainda
// em aberto/atendimento mas já agendou, mostra "Cliente agendou".
function getLeadStatus(lead: LeadStatusInput): { label: string; cls: string } {
  const a = lead.attendance_status ?? "open";
  if (a === "closed_sale") return { label: "Fechou venda", cls: "text-emerald-700 bg-emerald-100" };
  if (a === "resolved") return { label: "Atendimento concluído", cls: "text-emerald-700 bg-emerald-100" };
  if (a === "closed_no_sale") return { label: "Não fechou", cls: "text-red-600 bg-red-50" };
  if (a === "contact_later") return { label: "Contato futuro", cls: "text-amber-700 bg-amber-50" };
  if (lead.appointment_at || lead.funnel_step === "scheduled") return { label: "Cliente agendou", cls: "text-emerald-700 bg-emerald-100" };
  if (a === "in_progress") return { label: "Em atendimento", cls: "text-[#004A9D] bg-[#EBF4FF]" };
  return { label: "Em aberto", cls: "text-[#5A667A] bg-[#EEF2F6]" };
}

function LeadStatusBadge({ lead }: { lead: LeadStatusInput }) {
  const s = getLeadStatus(lead);
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Contexto da unidade (pra preencher as mensagens do Guia) ──────────────────
type FranchiseContext = { name: string; city: string; address: string | null } | null;

// ── Feedback progressivo do lead (timeline + disclaimer + mensagem sugerida) ──
// Cliente marcou ESTE lugar no card (entre o cabeçalho e a régua de temperatura).
// Templates curados do Guia de feedback IA (lib/leadFeedback). Determinístico.
function LeadFeedbackPanel({
  lead,
  franchise,
  sellerName,
}: {
  lead: FeedbackLead & { name?: string };
  franchise: FranchiseContext;
  sellerName?: string;
}) {
  const [copied, setCopied] = useState(false);

  // {{unidade}} = nome da franquia sem o prefixo "Homenz " (o template já escreve "Homenz {{unidade}}"),
  // com fallback pra cidade do lead. {{data}}/{{horario}} saem do agendamento real.
  const unidade =
    (franchise?.name?.replace(/^homenz\s+/i, "").trim() || franchise?.city || lead.city || "").trim() || null;
  const appt = lead.appointment_at ? new Date(lead.appointment_at) : null;
  const vars: MessageVars = {
    nome: (lead.name ?? "").split(" ")[0] || lead.name || null,
    unidade,
    cidade: franchise?.city || lead.city || null,
    vendedor_nome: sellerName ?? null,
    data: appt ? appt.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }) : null,
    horario: appt ? appt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : null,
    endereco: franchise?.address ?? null,
  };

  const fb = resolveLeadFeedback(lead, vars);
  const reached = milestoneIndexForStage(fb.stage);

  const copyMessage = async () => {
    const text = fb.filledMessage;
    // Fallback p/ contextos sem clipboard async (sem HTTPS, permissão negada, etc.)
    const legacyCopy = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch { ok = false; }
      document.body.removeChild(ta);
      return ok;
    };
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (!legacyCopy()) {
        throw new Error("copy command failed");
      }
      setCopied(true);
      toast.success("Mensagem copiada!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      if (legacyCopy()) {
        setCopied(true);
        toast.success("Mensagem copiada!");
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error("Não consegui copiar. Selecione e copie manualmente.");
      }
    }
  };

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
      {/* Timeline de marcos do funil */}
      <div className="px-3.5 pt-3 pb-2.5 border-b border-[#EEF2F6]">
        <p className="text-[#A0AABB] text-[11px] font-semibold mb-2.5 uppercase tracking-wide">Jornada do lead</p>
        <div className="flex items-center">
          {TIMELINE_MILESTONES.map((m, i) => {
            const done = i <= reached;
            const current = i === reached;
            return (
              <div key={m.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      done ? "bg-[#004A9D] text-white" : "bg-[#EEF2F6] text-[#C0CADB]"
                    } ${current ? "ring-2 ring-[#004A9D]/25" : ""}`}
                  >
                    {done ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                  </div>
                  <span className={`text-[9px] leading-none font-semibold text-center ${current ? "text-[#004A9D]" : done ? "text-[#5A667A]" : "text-[#C0CADB]"}`}>
                    {m.label}
                  </span>
                </div>
                {i < TIMELINE_MILESTONES.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-3.5 rounded-full ${i < reached ? "bg-[#004A9D]" : "bg-[#EEF2F6]"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer / recomendação da etapa (do Guia) */}
      <div className="px-3.5 py-3 border-b border-[#EEF2F6]">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[#00C1B8] flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[13px] leading-snug text-[#0A2540] font-medium">{fb.recommendation}</p>
            <p className="text-[11px] text-[#5A667A] mt-1">
              <span className="font-semibold text-[#004A9D]">Próxima ação:</span> {fb.nextAction}
            </p>
          </div>
        </div>
      </div>

      {/* Mensagem sugerida pela IA + copiar */}
      <div className="px-3.5 py-3 bg-[#F8FAFC]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[#A0AABB] text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[#00C1B8]" /> Mensagem sugerida pela IA
          </p>
          <button
            onClick={copyMessage}
            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors ${
              copied ? "bg-emerald-500/15 text-emerald-600" : "bg-[#004A9D] text-white hover:bg-[#003A7D]"
            }`}
          >
            {copied ? <><Check className="w-3.5 h-3.5" /> Copiado</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-[#0A2540] whitespace-pre-line bg-white border border-[#E2E8F0] rounded-lg p-3">
          {fb.filledMessage}
        </p>
      </div>
    </div>
  );
}

// ── Componente de card de lead ────────────────────────────────────────────────
function LeadCard({
  lead,
  isSelected,
  onSelect,
  onContact,
  franchise,
  sellerName,
}: {
  lead: any;
  isSelected: boolean;
  onSelect: () => void;
  onContact: (type: "whatsapp" | "call") => void;
  franchise: FranchiseContext;
  sellerName?: string;
}) {
  // Tick a cada 30s para atualizar o indicador de temperatura em tempo real
  const [tick, setTick] = useState(0);

  // Encerramento de atendimento (status + observações)
  const utils = trpc.useUtils();
  const [closingStatus, setClosingStatus] = useState<string>(lead.attendance_status ?? "open");
  const [closingNotes, setClosingNotes] = useState<string>(lead.closing_notes ?? "");
  const updateClosing = trpc.homenz.updateLeadClosing.useMutation({
    onSuccess: () => {
      toast.success("Atendimento atualizado!");
      utils.homenz.sellerDashboard.invalidate();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar"),
  });

  // Resultado da IA (antes/depois) do lead — carrega só quando o card abre
  const aiResultQuery = trpc.distribution.getAiResult.useQuery(
    { leadId: lead.id },
    { enabled: isSelected },
  );
  const ai = aiResultQuery.data;
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const heat = getHeatInfo(lead);

  return (
    <div
      className={`border rounded-2xl p-5 transition-all cursor-pointer ${heat.bgColor} ${
        isSelected ? `${heat.borderColor} ring-1 ring-inset ring-white/10` : `${heat.borderColor} hover:brightness-110`
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-4">
        {/* Avatar com cor de temperatura */}
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${heat.avatarBg} ${heat.avatarText}`}>
          {lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
        </div>

        <div className="flex-1 min-w-0">
          {/* Nome + badges */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <p className="text-[#0A2540] font-bold">{lead.name}</p>
            <ScoreBadge score={lead.lead_score} />
            <HeatBadge level={heat.level} label={heat.label} />
          </div>

          {/* Dados do lead */}
          <div className="flex items-center gap-2 text-xs text-[#5A667A] flex-wrap mb-2">
            {lead.age && <span>{lead.age} anos</span>}
            {lead.hair_problem && <span>· {lead.hair_problem}</span>}
          </div>

          {/* Status de atendimento (comercial) */}
          <LeadStatusBadge lead={lead} />

          {/* Agendamento real (tabela appointments) — o vendedor precisa ver a agenda */}
          {lead.appointment_at && (
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-[#004A9D]">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="capitalize">
                Avaliação: {new Date(lead.appointment_at).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                {" às "}
                {new Date(lead.appointment_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}

          {/* Contador de tempo + mensagem de urgência */}
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className={`w-3 h-3 ${heat.textColor} flex-shrink-0`} />
            <span className={`text-xs font-medium ${heat.textColor}`}>{heat.timeDisplay}</span>
            <span className="text-[#C0CADB] text-xs">·</span>
            <span className="text-xs text-[#5A667A] truncate">{heat.urgencyMessage}</span>
          </div>

          {/* Barra de temperatura */}
          <HeatBar heatPercent={heat.heatPercent} level={heat.level} />
        </div>

        {/* Botões de contato */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => { e.stopPropagation(); onContact("whatsapp"); }}
            className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
          <a
            href={`tel:${lead.phone}`}
            onClick={(e) => { e.stopPropagation(); onContact("call"); }}
            className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            <Phone className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Detalhes expandidos */}
      {isSelected && (
        // stopPropagation: cliques no conteúdo (select de status, textarea, botões) não devem
        // borbulhar para o onClick do card raiz, que colapsaria o card ("encolhe o modal")
        <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Feedback progressivo (timeline + recomendação + mensagem) — lugar marcado pelo cliente */}
          <LeadFeedbackPanel lead={lead} franchise={franchise} sellerName={sellerName} />

          {/* Alerta de urgência destacado */}
          {(heat.level === "hot" || heat.level === "warm") && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${heat.bgColor} border ${heat.borderColor}`}>
              <AlertTriangle className={`w-4 h-4 ${heat.textColor} flex-shrink-0`} />
              <p className={`text-xs font-semibold ${heat.textColor}`}>{heat.urgencyMessage}</p>
            </div>
          )}

          {/* Legenda da temperatura — por AÇÃO (profundidade no funil), não por tempo */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
            <p className="text-[#A0AABB] text-xs font-semibold mb-2 uppercase tracking-wide">Régua de temperatura (por ação)</p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                <span className="text-orange-500 font-medium">Quente</span>
                <span className="text-[#A0AABB]">· agendou a consulta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span className="text-amber-500 font-medium">Morno</span>
                <span className="text-[#A0AABB]">· chegou na foto/IA, não agendou</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Snowflake className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span className="text-blue-500 font-medium">Frio</span>
                <span className="text-[#A0AABB]">· abandonou antes das fotos</span>
              </div>
            </div>
          </div>

          {/* Dados de contato */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[#5A667A] text-xs mb-0.5">Telefone</p>
              <p className="text-[#0A2540] font-medium">{lead.phone}</p>
            </div>
            {lead.email && (
              <div>
                <p className="text-[#5A667A] text-xs mb-0.5">Email</p>
                <p className="text-[#0A2540] font-medium truncate">{lead.email}</p>
              </div>
            )}
            {lead.hair_loss_type && (
              <div>
                <p className="text-[#5A667A] text-xs mb-0.5">Tipo de queda</p>
                <p className="text-[#0A2540] font-medium">{lead.hair_loss_type}</p>
              </div>
            )}
            {lead.utm_source && (
              <div>
                <p className="text-[#5A667A] text-xs mb-0.5">Origem</p>
                <p className="text-[#0A2540] font-medium">{lead.utm_source} / {lead.utm_medium}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-[#5A667A] text-xs mb-0.5">Chegou em</p>
              <p className="text-[#0A2540] font-medium">
                {new Date(lead.created_at ?? lead.last_activity_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>

          {/* Respostas do diagnóstico (quiz) */}
          {lead.chat_answers && Object.keys(lead.chat_answers).length > 0 && (
            <div>
              <p className="text-[#5A667A] text-xs mb-1.5 font-semibold uppercase tracking-wide">Respostas do diagnóstico</p>
              <div className="space-y-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
                {Object.entries(lead.chat_answers).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-[#5A667A] capitalize min-w-[110px]">{k.replace(/_/g, " ")}:</span>
                    <span className="text-[#0A2540] font-medium">
                      {typeof v === "object" ? JSON.stringify(v) : String(v ?? "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Foto enviada pelo lead */}
          {lead.photo_url && (
            <div>
              <p className="text-[#5A667A] text-xs mb-1.5 font-semibold uppercase tracking-wide">Foto enviada</p>
              <a href={lead.photo_url} target="_blank" rel="noopener noreferrer">
                <img
                  src={lead.photo_url}
                  alt="Foto enviada pelo lead"
                  className="w-32 h-32 object-cover rounded-xl border border-[#E2E8F0] hover:opacity-90 transition-opacity"
                />
              </a>
            </div>
          )}

          {/* Antes / Depois gerado por IA */}
          {ai?.after_image_url && (
            <div>
              <p className="text-[#5A667A] text-xs mb-1.5 font-semibold uppercase tracking-wide">Antes / Depois (IA)</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0]">
                  <img src={ai.before_image_url} alt="Antes" className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 rounded">Antes</div>
                </div>
                <div className="relative rounded-xl overflow-hidden border border-[#00C1B8]">
                  <img src={ai.after_image_url} alt="Depois" className="w-full aspect-square object-cover" />
                  <div className="absolute bottom-1 right-1 text-white text-[10px] px-1.5 rounded" style={{ background: "#00C1B8" }}>Depois</div>
                </div>
              </div>
              {ai.analysis_text && (
                <p className="text-[#5A667A] text-xs mt-2 leading-relaxed whitespace-pre-line">{ai.analysis_text}</p>
              )}
            </div>
          )}

          {/* Agendar avaliação — vendedor solicita, clínica confirma */}
          <div>
            <p className="text-[#5A667A] text-xs mb-1.5 font-semibold uppercase tracking-wide">Agendamento</p>
            <SchedulePicker leadId={lead.id} />
          </div>

          {/* Encerramento de atendimento */}
          <div>
            <p className="text-[#5A667A] text-xs mb-1.5 font-semibold uppercase tracking-wide">Status do atendimento</p>
            <div className="space-y-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
              <select
                value={closingStatus}
                onChange={(e) => setClosingStatus(e.target.value)}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0A2540]"
              >
                {Object.entries(ATTENDANCE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <textarea
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Observações do atendimento..."
                rows={2}
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0A2540] resize-none focus:outline-none focus:border-[#00C1B8]"
              />
              <button
                onClick={() =>
                  updateClosing.mutate({
                    leadId: lead.id,
                    attendanceStatus: closingStatus as "open" | "in_progress" | "resolved" | "closed_sale" | "closed_no_sale" | "contact_later",
                    closingNotes: closingNotes.trim() || undefined,
                  })
                }
                disabled={updateClosing.isPending}
                className="w-full py-2 rounded-lg bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#00a89f] transition-colors disabled:opacity-40"
              >
                {updateClosing.isPending ? "Salvando..." : "Salvar status"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Vendedor solicita agendamento: escolhe dia + horário livre da clínica ─────
// Cai como 'pending'; a clínica (franqueado) confirma no painel de Agendamentos.
function SchedulePicker({ leadId }: { leadId: string }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  // Offset do fuso do navegador (BRT = -180) para casar com o backend.
  const tzMin = -new Date().getTimezoneOffset();
  const offStr = `${tzMin <= 0 ? "-" : "+"}${String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, "0")}:${String(Math.abs(tzMin) % 60).padStart(2, "0")}`;

  // Próximos 8 dias úteis (pula domingo).
  const days: { value: string; label: string; weekday: string }[] = [];
  for (let i = 1; days.length < 8 && i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() === 0) continue;
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ value, label: String(d.getDate()).padStart(2, "0"), weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "") });
  }

  const slotsQuery = trpc.homenz.getAvailableSlots.useQuery(
    { date: date ?? "", tzOffsetMinutes: tzMin },
    { enabled: open && !!date },
  );

  const request = trpc.homenz.requestAppointment.useMutation({
    onSuccess: () => {
      toast.success("Agendamento solicitado! A clínica vai confirmar.");
      utils.homenz.sellerDashboard.invalidate();
      setOpen(false); setDate(null); setSlot(null);
    },
    onError: (err) => toast.error(err.message || "Erro ao solicitar agendamento"),
  });

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#004A9D]/30 text-[#004A9D] font-bold text-sm hover:bg-[#004A9D]/5 transition-colors">
        <Calendar className="w-4 h-4" /> Agendar avaliação
      </button>
    );
  }

  return (
    <div className="space-y-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
      <div className="flex items-center justify-between">
        <p className="text-[#5A667A] text-xs font-semibold uppercase tracking-wide">Escolha dia e horário</p>
        <button onClick={() => { setOpen(false); setSlot(null); }} className="text-xs text-[#94A3B8] hover:text-[#5A667A]">cancelar</button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const sel = d.value === date;
          return (
            <button key={d.value} onClick={() => { setDate(d.value); setSlot(null); }}
              className={`flex flex-col items-center rounded-lg px-2.5 py-1.5 flex-shrink-0 border transition-colors ${sel ? "bg-[#004A9D] text-white border-[#004A9D]" : "bg-white text-[#0A2540] border-[#E2E8F0] hover:border-[#004A9D]/40"}`}>
              <span className="text-[10px] uppercase font-semibold">{d.weekday}</span>
              <span className="text-sm font-bold leading-none">{d.label}</span>
            </button>
          );
        })}
      </div>
      {date && (slotsQuery.isLoading ? (
        <p className="text-xs text-[#94A3B8] flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando horários...</p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {(slotsQuery.data?.slots ?? []).map((s) => {
            const sel = s.datetime === slot;
            return (
              <button key={s.datetime} disabled={!s.available} onClick={() => setSlot(s.datetime)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors ${!s.available ? "bg-[#F1F5F9] text-[#CBD5E1] border-transparent cursor-not-allowed line-through" : sel ? "bg-[#00C1B8] text-white border-[#00C1B8]" : "bg-white text-[#0A2540] border-[#E2E8F0] hover:border-[#00C1B8]/50"}`}>
                {s.time}
              </button>
            );
          })}
          {(slotsQuery.data?.slots ?? []).length === 0 && <p className="col-span-4 text-xs text-[#94A3B8]">Sem horários nesse dia.</p>}
        </div>
      ))}
      <button disabled={!slot || request.isPending}
        onClick={() => slot && request.mutate({ leadId, datetime: slot + offStr })}
        className="w-full py-2 rounded-lg bg-[#004A9D] text-white font-bold text-sm hover:bg-[#003A7D] transition-colors disabled:opacity-40">
        {request.isPending ? "Enviando..." : "Solicitar agendamento"}
      </button>
    </div>
  );
}

// ── Kanban do Desempenho — leads agrupados por etapa do atendimento ───────────
function KanbanBoard({ leads, onMove }: { leads: any[]; onMove: (leadId: string, status: string) => void }) {
  const groupOf = (l: any) => {
    const a = l.attendance_status;
    if (a === "resolved" || a === "closed_sale" || a === "closed_no_sale") return "done";
    if (l.appointment_at || l.funnel_step === "scheduled") return "scheduled";
    if (a === "in_progress") return "in_progress";
    return "open";
  };
  // status = valor gravado ao soltar um card na coluna. "Agendados" é derivado de
  // agendamento real (data/hora), por isso não recebe drop.
  const cols: { key: string; label: string; status: string | null }[] = [
    { key: "open", label: "Em aberto", status: "open" },
    { key: "in_progress", label: "Em atendimento", status: "in_progress" },
    { key: "scheduled", label: "Agendados", status: null },
    { key: "done", label: "Concluídos", status: "resolved" },
  ];
  const [dragOver, setDragOver] = useState<string | null>(null);
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-black text-[#0A2540] mb-1">Desempenho</h2>
      <p className="text-[#5A667A] text-sm mb-6">Arraste os cards entre as colunas para mudar o status do lead</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {cols.map((col) => {
          const items = leads.filter((l) => groupOf(l) === col.key);
          const canDrop = col.status !== null;
          return (
            <div
              key={col.key}
              onDragOver={canDrop ? (e) => { e.preventDefault(); setDragOver(col.key); } : undefined}
              onDragLeave={canDrop ? () => setDragOver((d) => (d === col.key ? null : d)) : undefined}
              onDrop={canDrop ? (e) => {
                e.preventDefault(); setDragOver(null);
                const id = e.dataTransfer.getData("text/plain");
                const from = e.dataTransfer.getData("group");
                // Quem já agendou tem consulta marcada — só pode avançar para Concluídos, não regredir
                if (from === "scheduled" && col.status !== "resolved") {
                  toast.info("Esse lead já agendou. Só dá pra mover para Concluídos.");
                  return;
                }
                if (id) onMove(id, col.status as string);
              } : undefined}
              className={`rounded-2xl p-3 border transition-colors ${dragOver === col.key ? "bg-[#EBF4FF] border-[#004A9D]/40" : "bg-[#F8FAFC] border-[#E2E8F0]"}`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-sm font-bold text-[#0A2540]">{col.label}</span>
                <span className="text-xs font-bold text-[#5A667A] bg-white rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">{items.length}</span>
              </div>
              <div className="space-y-2 min-h-[40px]">
                {items.map((l) => (
                  <div
                    key={l.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", l.id); e.dataTransfer.setData("group", groupOf(l)); }}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-[#004A9D]/30 transition-colors"
                  >
                    <p className="font-semibold text-sm text-[#0A2540] truncate">{l.name}</p>
                    <p className="text-xs text-[#5A667A] mt-0.5 truncate">{l.hair_problem ?? "Sem detalhe"}</p>
                    {l.appointment_at && (
                      <p className="text-xs text-[#004A9D] font-semibold mt-1">
                        {new Date(l.appointment_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} às {new Date(l.appointment_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                ))}
                {items.length === 0 && <p className="text-xs text-[#C0CADB] px-1 py-3 text-center">{canDrop ? "Solte aqui" : "Vazio"}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────
export default function SellerDashboard() {
  const [location, navigate] = useLocation();
  const { user, isSeller, loading: authLoading } = useHomenzAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "open" | "in_progress" | "scheduled" | "done">("all");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const dashQuery = trpc.homenz.sellerDashboard.useQuery(undefined, {
    enabled: isSeller,
    refetchInterval: 5000,
    // Atualiza em tempo real mesmo com a aba em segundo plano (o vendedor costuma
    // deixar o painel aberto numa aba enquanto trabalha o lead em outra).
    refetchIntervalInBackground: true,
  });

  // Arrastar um card entre colunas do Kanban = mudar o status de atendimento do lead
  const moveStatus = trpc.homenz.updateLeadClosing.useMutation({
    onSuccess: () => dashQuery.refetch(),
    onError: (e) => toast.error(e.message || "Erro ao mover o lead"),
  });

  const addEventMutation = trpc.homenz.addLeadEvent.useMutation({
    onSuccess: () => {
      dashQuery.refetch();
      toast.success("Contato registrado!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleContact = useCallback((leadId: string, franchiseId: string, type: "whatsapp" | "call") => {
    addEventMutation.mutate({
      leadId,
      franchiseId,
      eventType: type === "whatsapp" ? "whatsapp_sent" : "call_made",
      description: `Contato via ${type === "whatsapp" ? "WhatsApp" : "ligação"} registrado`,
    });
  }, [addEventMutation]);

  // Auth guard is handled by ProtectedRoute in App.tsx — no navigate() in render
  if (!authLoading && (!user || user.role !== "seller")) {
    return null;
  }

  if (authLoading || dashQuery.isLoading) {
    return (
      <HomenzLayout title="Meus Leads">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#00C1B8] animate-spin" />
        </div>
      </HomenzLayout>
    );
  }

  const data = dashQuery.data;
  if (!data) {
    return (
      <HomenzLayout title="Meus Leads">
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <p className="text-[#5A667A]">Nenhum lead atribuído ainda</p>
          <p className="text-[#C0CADB] text-sm">Aguarde a atribuição pelo franqueado</p>
        </div>
      </HomenzLayout>
    );
  }

  const { leads, metrics, stats } = data;
  // Contexto da unidade pra preencher as mensagens sugeridas do card (#12)
  const franchiseCtx = (data as { franchise?: FranchiseContext }).franchise ?? null;
  const sellerName = (data as { sellerName?: string }).sellerName ?? user?.name;

  // Aba ativa — a nav (HomenzLayout) aponta para /vendedor, /vendedor/agendamentos, /vendedor/desempenho
  const view = location.startsWith("/vendedor/desempenho") ? "kanban"
    : location.startsWith("/vendedor/agendamentos") ? "agenda" : "leads";
  if (view === "kanban") {
    return <HomenzLayout title="Desempenho"><KanbanBoard leads={leads.all} onMove={(id, status) => moveStatus.mutate({ leadId: id, attendanceStatus: status as "open" | "in_progress" | "resolved" | "closed_sale" | "closed_no_sale" | "contact_later" })} /></HomenzLayout>;
  }

  // Filtros por STATUS de atendimento (o vendedor separa gerais / em atendimento / agendados)
  const statusOf = (l: LeadStatusInput): "open" | "in_progress" | "scheduled" | "done" => {
    const a = l.attendance_status;
    if (a === "resolved" || a === "closed_sale" || a === "closed_no_sale") return "done";
    if (l.appointment_at || l.funnel_step === "scheduled") return "scheduled";
    if (a === "in_progress") return "in_progress";
    return "open";
  };
  const statusCounts = {
    all: leads.all.length,
    open: leads.all.filter((l) => statusOf(l) === "open").length,
    in_progress: leads.all.filter((l) => statusOf(l) === "in_progress").length,
    scheduled: leads.all.filter((l) => statusOf(l) === "scheduled").length,
    done: leads.all.filter((l) => statusOf(l) === "done").length,
  };
  // Na aba "Agendamentos" mostramos só quem agendou; em "Meus Leads", todos.
  const baseLeads = view === "agenda" ? leads.all.filter((l) => statusOf(l) === "scheduled") : leads.all;
  const filteredLeads = activeFilter === "all" ? baseLeads : baseLeads.filter((l) => statusOf(l) === activeFilter);

  return (
    <HomenzLayout title={view === "agenda" ? "Agendamentos" : "Meus Leads"}>
      <div className="p-6 space-y-8 max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-[#0A2540]">Olá, {user?.name.split(" ")[0]}!</h2>
          <p className="text-[#5A667A] text-sm mt-1">
            {stats.totalLeads} leads atribuídos · {stats.scheduledLeads} agendados
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[#0A2540]">{stats.totalLeads}</p>
            <p className="text-xs text-[#5A667A] mt-0.5">Total de Leads</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-500">{stats.hotLeads}</p>
            <p className="text-xs text-orange-500/70 mt-0.5 flex items-center justify-center gap-1"><Flame className="w-3 h-3" /> Quentes</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-500">{stats.scheduledLeads}</p>
            <p className="text-xs text-emerald-500/70 mt-0.5 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> Agendados</p>
          </div>
          <div className="bg-teal-50 border border-[#00C1B8] rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[#00C1B8]">{metrics?.score ?? 0}</p>
            <p className="text-xs text-[#00C1B8]/60 mt-0.5">Meu Score</p>
          </div>
        </div>

        {/* Métricas do mês */}
        {metrics && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <h3 className="text-[#0A2540] font-bold mb-4 text-sm">Desempenho do Mês</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#00C1B8]" />
                  <span className="text-[#5A667A] text-xs">Conversão</span>
                </div>
                <p className="text-xl font-black text-[#0A2540]">{metrics.conversion_rate}%</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[#5A667A] text-xs">Tempo resposta</span>
                </div>
                <p className="text-xl font-black text-[#0A2540]">{metrics.avg_response_minutes}min</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[#5A667A] text-xs">Contactados</span>
                </div>
                <p className="text-xl font-black text-[#0A2540]">{metrics.leads_contacted}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[#5A667A] text-xs">Confirmados</span>
                </div>
                <p className="text-xl font-black text-[#0A2540]">{metrics.leads_confirmed}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[#5A667A] text-xs">Score geral</span>
                <span className="text-[#00C1B8] font-black text-sm">{metrics.score}/100</span>
              </div>
              <div className="h-2 bg-white rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00C1B8] rounded-full transition-all"
                  style={{ width: `${metrics.score}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lista de leads */}
        <div>
          {view !== "agenda" && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "open", "in_progress", "scheduled", "done"] as const).map((f) => {
              const labels = {
                all: `Todos (${statusCounts.all})`,
                open: `Em aberto (${statusCounts.open})`,
                in_progress: `Em atendimento (${statusCounts.in_progress})`,
                scheduled: `Agendados (${statusCounts.scheduled})`,
                done: `Concluídos (${statusCounts.done})`,
              };
              const active = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all hover:bg-white ${active ? "bg-[#EBF4FF] text-[#0A2540]" : "text-[#5A667A]"}`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
          )}

          <div className="space-y-3">
            {filteredLeads.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
                <Target className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
                <p className="text-[#5A667A]">Nenhum lead nesta categoria</p>
              </div>
            ) : (
              filteredLeads.map((lead: any) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  isSelected={selectedLead === lead.id}
                  onSelect={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
                  onContact={(type) => handleContact(lead.id, lead.franchise_id, type)}
                  franchise={franchiseCtx}
                  sellerName={sellerName}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </HomenzLayout>
  );
}
