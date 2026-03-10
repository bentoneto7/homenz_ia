import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Target, Calendar, Phone, MessageSquare,
  Loader2, Clock, TrendingUp, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ── Métricas padrão de mercado (Inside Sales / SDR) ──────────────────────────
// Referência: HubSpot Sales Report, Salesforce State of Sales, LeadSimple benchmarks
// 🔥 QUENTE:  0 – 30 min  → Lead acabou de chegar, probabilidade de conversão >60%
// 🌡 MORNO:  30 min – 4h  → Janela de oportunidade, conversão cai ~40% a cada hora
// 🧊 FRIO:   4h – 24h     → Lead esfriou, precisa de follow-up ativo
// 💀 MORTO:  > 24h        → Probabilidade de conversão <5%, requer reengajamento

const HEAT_THRESHOLDS = {
  HOT_MAX_MINUTES: 30,       // até 30min = quente
  WARM_MAX_MINUTES: 240,     // até 4h = morno
  COLD_MAX_MINUTES: 1440,    // até 24h = frio
  // acima de 24h = morto
};

type HeatLevel = "hot" | "warm" | "cold" | "dead";

interface HeatInfo {
  level: HeatLevel;
  label: string;
  emoji: string;
  minutesElapsed: number;
  percentCooled: number; // 0-100, quanto do "calor" foi perdido
  timeDisplay: string;
  urgencyMessage: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  avatarBg: string;
  avatarText: string;
}

function getHeatInfo(createdAt: string, lastActivityAt: string): HeatInfo {
  // Usa o mais recente entre criação e última atividade
  const referenceTime = Math.max(
    new Date(createdAt).getTime(),
    new Date(lastActivityAt).getTime()
  );
  const minutesElapsed = (Date.now() - referenceTime) / 60000;

  let level: HeatLevel;
  let percentCooled: number;
  let urgencyMessage: string;

  if (minutesElapsed <= HEAT_THRESHOLDS.HOT_MAX_MINUTES) {
    level = "hot";
    percentCooled = (minutesElapsed / HEAT_THRESHOLDS.HOT_MAX_MINUTES) * 40; // 0-40%
    urgencyMessage = minutesElapsed < 5
      ? "⚡ Acabou de chegar! Aborde agora"
      : minutesElapsed < 15
      ? "🔥 Ainda muito quente — aborde já!"
      : "🔥 Quente — aborde antes dos 30min";
  } else if (minutesElapsed <= HEAT_THRESHOLDS.WARM_MAX_MINUTES) {
    level = "warm";
    const warmProgress = (minutesElapsed - 30) / (240 - 30);
    percentCooled = 40 + warmProgress * 40; // 40-80%
    urgencyMessage = minutesElapsed < 60
      ? "🌡 Esfriando — faça contato logo"
      : minutesElapsed < 120
      ? "🌡 Morno — cada hora reduz 40% a chance"
      : "⚠️ Quase frio — último momento para abordagem eficaz";
  } else if (minutesElapsed <= HEAT_THRESHOLDS.COLD_MAX_MINUTES) {
    level = "cold";
    const coldProgress = (minutesElapsed - 240) / (1440 - 240);
    percentCooled = 80 + coldProgress * 15; // 80-95%
    urgencyMessage = "🧊 Lead frio — use follow-up personalizado";
  } else {
    level = "dead";
    percentCooled = 100;
    urgencyMessage = "💀 Lead inativo há mais de 24h — reengajamento necessário";
  }

  // Formatar tempo decorrido
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

  const styleMap: Record<HeatLevel, Pick<HeatInfo, "label" | "emoji" | "borderColor" | "bgColor" | "textColor" | "avatarBg" | "avatarText">> = {
    hot: {
      label: "Quente",
      emoji: "🔥",
      borderColor: "border-orange-500/40",
      bgColor: "bg-orange-500/8",
      textColor: "text-orange-400",
      avatarBg: "bg-orange-500/20",
      avatarText: "text-orange-300",
    },
    warm: {
      label: "Morno",
      emoji: "🌡",
      borderColor: "border-amber-500/30",
      bgColor: "bg-amber-500/5",
      textColor: "text-amber-400",
      avatarBg: "bg-amber-500/20",
      avatarText: "text-amber-300",
    },
    cold: {
      label: "Frio",
      emoji: "🧊",
      borderColor: "border-blue-500/30",
      bgColor: "bg-blue-500/5",
      textColor: "text-blue-400",
      avatarBg: "bg-blue-500/20",
      avatarText: "text-blue-300",
    },
    dead: {
      label: "Inativo",
      emoji: "💀",
      borderColor: "border-[#E2E8F0]",
      bgColor: "bg-[#F8FAFC]",
      textColor: "text-[#A0AABB]",
      avatarBg: "bg-[#EBF4FF]",
      avatarText: "text-[#A0AABB]",
    },
  };

  return {
    level,
    minutesElapsed,
    percentCooled,
    timeDisplay,
    urgencyMessage,
    ...styleMap[level],
  };
}

// ── Componente de barra de temperatura ───────────────────────────────────────
function HeatBar({ percentCooled, level }: { percentCooled: number; level: HeatLevel }) {
  const heatPercent = 100 - percentCooled;
  const gradientMap: Record<HeatLevel, string> = {
    hot: "from-red-500 via-orange-400 to-amber-300",
    warm: "from-amber-500 via-yellow-400 to-lime-300",
    cold: "from-blue-500 via-cyan-400 to-teal-300",
    dead: "from-white/20 to-white/10",
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
function HeatBadge({ level, label, emoji }: { level: HeatLevel; label: string; emoji: string }) {
  const colorMap: Record<HeatLevel, string> = {
    hot: "text-orange-400 bg-orange-500/15 border-orange-500/30",
    warm: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    cold: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    dead: "text-[#A0AABB] bg-white border-[#E2E8F0]",
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${colorMap[level]} ${level === "hot" ? "animate-pulse" : ""}`}>
      <span>{emoji}</span>
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

// ── Badge de etapa do funil ───────────────────────────────────────────────────
function FunnelStepBadge({ step }: { step: string }) {
  const labels: Record<string, string> = {
    new: "Novo",
    chat_started: "Chat iniciado",
    chat_done: "Chat concluído",
    photos_started: "Fotos enviadas",
    photos_done: "Fotos analisadas",
    ai_processing: "IA processando",
    ai_done: "IA concluída",
    schedule_started: "Agendando",
    scheduled: "Agendado ✓",
    no_show: "Não compareceu",
    lost: "Perdido",
  };
  const label = labels[step] ?? step.replace(/_/g, " ");
  const isScheduled = step === "scheduled";
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
      isScheduled ? "text-emerald-400 bg-emerald-500/15" : "text-[#5A667A] bg-white"
    }`}>
      {label}
    </span>
  );
}

// ── Componente de card de lead ────────────────────────────────────────────────
function LeadCard({
  lead,
  isSelected,
  onSelect,
  onContact,
}: {
  lead: any;
  isSelected: boolean;
  onSelect: () => void;
  onContact: (type: "whatsapp" | "call") => void;
}) {
  // Tick a cada 30s para atualizar o indicador de temperatura em tempo real
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const heat = getHeatInfo(lead.created_at ?? lead.last_activity_at, lead.last_activity_at);

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
            <HeatBadge level={heat.level} label={heat.label} emoji={heat.emoji} />
          </div>

          {/* Dados do lead */}
          <div className="flex items-center gap-2 text-xs text-[#5A667A] flex-wrap mb-2">
            {lead.age && <span>{lead.age} anos</span>}
            {lead.hair_problem && <span>· {lead.hair_problem}</span>}
          </div>

          {/* Etapa do funil */}
          <FunnelStepBadge step={lead.funnel_step} />

          {/* Contador de tempo + mensagem de urgência */}
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className={`w-3 h-3 ${heat.textColor} flex-shrink-0`} />
            <span className={`text-xs font-medium ${heat.textColor}`}>{heat.timeDisplay}</span>
            <span className="text-[#C0CADB] text-xs">·</span>
            <span className="text-xs text-[#5A667A] truncate">{heat.urgencyMessage}</span>
          </div>

          {/* Barra de temperatura */}
          <HeatBar percentCooled={heat.percentCooled} level={heat.level} />
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
        <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-3">
          {/* Alerta de urgência destacado */}
          {(heat.level === "hot" || heat.level === "warm") && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${heat.bgColor} border ${heat.borderColor}`}>
              <AlertTriangle className={`w-4 h-4 ${heat.textColor} flex-shrink-0`} />
              <p className={`text-xs font-semibold ${heat.textColor}`}>{heat.urgencyMessage}</p>
            </div>
          )}

          {/* Legenda das métricas de temperatura */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3">
            <p className="text-[#A0AABB] text-xs font-semibold mb-2 uppercase tracking-wide">Régua de temperatura (padrão de mercado)</p>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <span>🔥</span>
                <span className="text-orange-400 font-medium">Quente</span>
                <span className="text-[#A0AABB]">0–30min · conv. &gt;60%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🌡</span>
                <span className="text-amber-400 font-medium">Morno</span>
                <span className="text-[#A0AABB]">30min–4h · conv. 20–40%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🧊</span>
                <span className="text-blue-400 font-medium">Frio</span>
                <span className="text-[#A0AABB]">4h–24h · conv. 5–15%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>💀</span>
                <span className="text-[#A0AABB] font-medium">Inativo</span>
                <span className="text-[#C0CADB]">&gt;24h · conv. &lt;5%</span>
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
        </div>
      )}
    </div>
  );
}

// ── Painel principal ──────────────────────────────────────────────────────────
export default function SellerDashboardSupabase() {
  const [, navigate] = useLocation();
  const { user, isSeller, loading: authLoading } = useHomenzAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | "hot" | "warm" | "cold">("all");
  const [selectedLead, setSelectedLead] = useState<string | null>(null);

  const dashQuery = trpc.homenz.sellerDashboard.useQuery(undefined, {
    enabled: isSeller,
    refetchInterval: 30000,
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

  const filteredLeads = activeFilter === "all" ? leads.all :
    activeFilter === "hot" ? leads.hot :
    activeFilter === "warm" ? leads.warm :
    leads.cold;

  return (
    <HomenzLayout title="Meus Leads">
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
            <p className="text-2xl font-black text-orange-400">{stats.hotLeads}</p>
            <p className="text-xs text-orange-400/60 mt-0.5">Quentes 🔥</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{stats.scheduledLeads}</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">Agendados ✓</p>
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
                  className="h-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-full transition-all"
                  style={{ width: `${metrics.score}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Lista de leads */}
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "hot", "warm", "cold"] as const).map((f) => {
              const labels = {
                all: `Todos (${stats.totalLeads})`,
                hot: `🔥 Quentes (${stats.hotLeads})`,
                warm: `🌡 Mornos (${stats.warmLeads})`,
                cold: `🧊 Frios (${stats.coldLeads})`,
              };
              const colors = {
                all: activeFilter === "all" ? "bg-[#EBF4FF] text-[#0A2540]" : "text-[#5A667A]",
                hot: activeFilter === "hot" ? "bg-orange-500/20 text-orange-400" : "text-[#5A667A]",
                warm: activeFilter === "warm" ? "bg-amber-500/20 text-amber-400" : "text-[#5A667A]",
                cold: activeFilter === "cold" ? "bg-blue-500/20 text-blue-400" : "text-[#5A667A]",
              };
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all hover:bg-white ${colors[f]}`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </HomenzLayout>
  );
}
