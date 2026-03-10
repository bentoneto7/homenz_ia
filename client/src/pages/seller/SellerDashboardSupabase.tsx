import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Target, Calendar, Flame, Thermometer,
  Snowflake, Phone, MessageSquare,
  Loader2, Clock, TrendingUp, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400 bg-emerald-500/15 border-emerald-500/30" :
    score >= 50 ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
    "text-blue-400 bg-blue-500/15 border-blue-500/30";
  return (
    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${color}`}>{score} pts</span>
  );
}

function TemperatureTag({ temp }: { temp: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
    hot: { icon: <Flame className="w-3 h-3" />, label: "Quente", color: "text-orange-400 bg-orange-500/15 border-orange-500/30" },
    warm: { icon: <Thermometer className="w-3 h-3" />, label: "Morno", color: "text-amber-400 bg-amber-500/15 border-amber-500/30" },
    cold: { icon: <Snowflake className="w-3 h-3" />, label: "Frio", color: "text-blue-400 bg-blue-500/15 border-blue-500/30" },
  };
  const t = map[temp] ?? map.cold;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${t.color}`}>
      {t.icon}{t.label}
    </span>
  );
}

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
      isScheduled ? "text-emerald-400 bg-emerald-500/15" : "text-white/40 bg-white/5"
    }`}>
      {label}
    </span>
  );
}

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
      toast.success("Evento registrado!");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!authLoading && !user) {
    navigate("/login");
    return null;
  }

  if (!authLoading && user && user.role !== "seller") {
    navigate(user.role === "owner" ? "/rede" : "/franqueado");
    return null;
  }

  if (authLoading || dashQuery.isLoading) {
    return (
      <HomenzLayout title="Meus Leads">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#14b8a6] animate-spin" />
        </div>
      </HomenzLayout>
    );
  }

  const data = dashQuery.data;
  if (!data) {
    return (
      <HomenzLayout title="Meus Leads">
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <p className="text-white/40">Nenhum lead atribuído ainda</p>
          <p className="text-white/20 text-sm">Aguarde a atribuição pelo franqueado</p>
        </div>
      </HomenzLayout>
    );
  }

  const { leads, metrics, stats } = data;

  const filteredLeads = activeFilter === "all" ? leads.all :
    activeFilter === "hot" ? leads.hot :
    activeFilter === "warm" ? leads.warm :
    leads.cold;

  const handleContact = (leadId: string, franchiseId: string, type: "whatsapp" | "call") => {
    addEventMutation.mutate({
      leadId,
      franchiseId,
      eventType: type === "whatsapp" ? "whatsapp_sent" : "call_made",
      description: `Contato via ${type === "whatsapp" ? "WhatsApp" : "ligação"} registrado`,
    });
  };

  return (
    <HomenzLayout title="Meus Leads">
      <div className="p-6 space-y-8 max-w-5xl mx-auto">

        {/* Header */}
        <div>
          <h2 className="text-2xl font-black text-white">Olá, {user?.name.split(" ")[0]}!</h2>
          <p className="text-white/50 text-sm mt-1">
            {stats.totalLeads} leads atribuídos · {stats.scheduledLeads} agendados
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/5 border border-white/8 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-white">{stats.totalLeads}</p>
            <p className="text-xs text-white/40 mt-0.5">Total de Leads</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-orange-400">{stats.hotLeads}</p>
            <p className="text-xs text-orange-400/60 mt-0.5">Quentes 🔥</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{stats.scheduledLeads}</p>
            <p className="text-xs text-emerald-400/60 mt-0.5">Agendados ✓</p>
          </div>
          <div className="bg-[#14b8a6]/10 border border-[#14b8a6]/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-[#14b8a6]">{metrics?.score ?? 0}</p>
            <p className="text-xs text-[#14b8a6]/60 mt-0.5">Meu Score</p>
          </div>
        </div>

        {/* Métricas do mês */}
        {metrics && (
          <div className="bg-white/5 border border-white/8 rounded-2xl p-5">
            <h3 className="text-white font-bold mb-4 text-sm">Desempenho do Mês</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#14b8a6]" />
                  <span className="text-white/40 text-xs">Conversão</span>
                </div>
                <p className="text-xl font-black text-white">{metrics.conversion_rate}%</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-white/40 text-xs">Tempo resposta</span>
                </div>
                <p className="text-xl font-black text-white">{metrics.avg_response_minutes}min</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Phone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-white/40 text-xs">Contactados</span>
                </div>
                <p className="text-xl font-black text-white">{metrics.leads_contacted}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white/40 text-xs">Confirmados</span>
                </div>
                <p className="text-xl font-black text-white">{metrics.leads_confirmed}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-white/40 text-xs">Score geral</span>
                <span className="text-[#14b8a6] font-black text-sm">{metrics.score}/100</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
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
                hot: `Quentes (${stats.hotLeads})`,
                warm: `Mornos (${stats.warmLeads})`,
                cold: `Frios (${stats.coldLeads})`,
              };
              const colors = {
                all: activeFilter === "all" ? "bg-white/10 text-white" : "text-white/40",
                hot: activeFilter === "hot" ? "bg-orange-500/20 text-orange-400" : "text-white/40",
                warm: activeFilter === "warm" ? "bg-amber-500/20 text-amber-400" : "text-white/40",
                cold: activeFilter === "cold" ? "bg-blue-500/20 text-blue-400" : "text-white/40",
              };
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/5 ${colors[f]}`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            {filteredLeads.length === 0 ? (
              <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
                <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40">Nenhum lead nesta categoria</p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className={`bg-white/5 border rounded-2xl p-5 transition-all cursor-pointer ${
                    selectedLead === lead.id
                      ? "border-[#14b8a6]/40 bg-[#14b8a6]/5"
                      : "border-white/8 hover:bg-white/8"
                  }`}
                  onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      lead.temperature === "hot" ? "bg-orange-500/20 text-orange-400" :
                      lead.temperature === "warm" ? "bg-amber-500/20 text-amber-400" :
                      "bg-blue-500/20 text-blue-400"
                    }`}>
                      {lead.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <p className="text-white font-bold">{lead.name}</p>
                        <ScoreBadge score={lead.lead_score} />
                        <TemperatureTag temp={lead.temperature} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap mb-2">
                        {lead.age && <span>{lead.age} anos</span>}
                        {lead.gender && <span>· {lead.gender}</span>}
                        {lead.hair_problem && <span>· {lead.hair_problem}</span>}
                      </div>
                      <FunnelStepBadge step={lead.funnel_step} />
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContact(lead.id, lead.franchise_id, "whatsapp");
                        }}
                        className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </a>
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContact(lead.id, lead.franchise_id, "call");
                        }}
                        className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </div>

                  {selectedLead === lead.id && (
                    <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-white/40 text-xs mb-0.5">Telefone</p>
                        <p className="text-white font-medium">{lead.phone}</p>
                      </div>
                      {lead.email && (
                        <div>
                          <p className="text-white/40 text-xs mb-0.5">Email</p>
                          <p className="text-white font-medium truncate">{lead.email}</p>
                        </div>
                      )}
                      {lead.hair_loss_type && (
                        <div>
                          <p className="text-white/40 text-xs mb-0.5">Tipo de queda</p>
                          <p className="text-white font-medium">{lead.hair_loss_type}</p>
                        </div>
                      )}
                      {lead.utm_source && (
                        <div>
                          <p className="text-white/40 text-xs mb-0.5">Origem</p>
                          <p className="text-white font-medium">{lead.utm_source} / {lead.utm_medium}</p>
                        </div>
                      )}
                      <div className="col-span-2">
                        <p className="text-white/40 text-xs mb-0.5">Última atividade</p>
                        <p className="text-white font-medium">
                          {new Date(lead.last_activity_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </HomenzLayout>
  );
}
