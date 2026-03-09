import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getLeadTemperature, getPlaybookAction, formatTimeSince, formatTimeSinceLive,
  TEMPERATURE_CONFIG, FUNNEL_STEP_LABELS, PRIORITY_CONFIG,
  type FunnelStep,
} from "@/lib/leadTemperature";
import {
  MessageCircle, Phone, Flame, Thermometer, Snowflake, Skull,
  RefreshCw, ArrowRight, Eye, Filter,
} from "lucide-react";

// Timer em tempo real por card
function LiveTimer({ since }: { since: Date | string }) {
  const [display, setDisplay] = useState(formatTimeSinceLive(since));
  useEffect(() => {
    const interval = setInterval(() => setDisplay(formatTimeSinceLive(since)), 1000);
    return () => clearInterval(interval);
  }, [since]);
  return <span className="font-mono text-xs font-bold">{display}</span>;
}

function TempIcon({ temp }: { temp: ReturnType<typeof getLeadTemperature> }) {
  const cfg = TEMPERATURE_CONFIG[temp];
  const Icon = temp === "hot" ? Flame : temp === "warm" ? Thermometer : temp === "cold" ? Snowflake : Skull;
  return <Icon className={`w-4 h-4 ${cfg.color} ${temp === "hot" ? "animate-pulse" : ""}`} />;
}

const FILTER_OPTIONS = [
  { value: "all", label: "Todos", hours: 0.5 },
  { value: "hot", label: "🔥 Quentes", hours: 0.5 },
  { value: "warm", label: "🌡️ Mornos", hours: 2 },
  { value: "cold", label: "🧊 Frios", hours: 24 },
  { value: "frozen", label: "💀 Perdidos", hours: 999 },
];

export default function Recovery() {
  const [, navigate] = useLocation();
  const [filter, setFilter] = useState("all");
  const [hoursInactive, setHoursInactive] = useState(0.5);

  const { data: leads, isLoading, refetch } = trpc.journey.getRecoveryLeads.useQuery(
    { hoursInactive, limit: 100 },
    { refetchInterval: 30_000 }
  );

  const scheduleFollowupMutation = trpc.followups.schedule.useMutation({
    onSuccess: (d) => toast.success(`${d.stepsScheduled} follow-ups agendados!`),
    onError: (e) => toast.error(e.message),
  });

  const filteredLeads = (leads ?? []).filter((lead) => {
    if (filter === "all") return true;
    return getLeadTemperature(lead.lastActivityAt) === filter;
  });

  // Contagem por temperatura
  const counts = (leads ?? []).reduce((acc, lead) => {
    const temp = getLeadTemperature(lead.lastActivityAt);
    acc[temp] = (acc[temp] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Recuperação de Leads</h1>
            <p className="text-slate-400 text-sm mt-1">
              Leads que pararam no funil — aja rápido antes de perder a venda
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-slate-600 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>

        {/* Resumo de temperatura */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["hot", "warm", "cold", "frozen"] as const).map((temp) => {
            const cfg = TEMPERATURE_CONFIG[temp];
            const count = counts[temp] ?? 0;
            return (
              <button
                key={temp}
                onClick={() => setFilter(filter === temp ? "all" : temp)}
                className={`rounded-xl border p-4 text-left transition-all ${
                  filter === temp ? `${cfg.bgColor} ${cfg.borderColor}` : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <TempIcon temp={temp} />
                  <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                </div>
                <p className="text-2xl font-bold text-white">{count}</p>
                <p className="text-xs text-slate-500 mt-0.5">{cfg.urgency}</p>
              </button>
            );
          })}
        </div>

        {/* Filtro de horas */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs text-slate-500">Inativos há mais de:</span>
          {[
            { label: "30 min", value: 0.5 },
            { label: "1 hora", value: 1 },
            { label: "2 horas", value: 2 },
            { label: "6 horas", value: 6 },
            { label: "24 horas", value: 24 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setHoursInactive(opt.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                hoursInactive === opt.value
                  ? "bg-amber-500 text-black"
                  : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Lista de leads */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-12 text-center">
            <p className="text-slate-400 text-lg font-medium">Nenhum lead para recuperar</p>
            <p className="text-slate-600 text-sm mt-1">Todos os leads estão avançando no funil 🎉</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLeads.map((lead) => {
              const temp = getLeadTemperature(lead.lastActivityAt);
              const tempCfg = TEMPERATURE_CONFIG[temp];
              const funnelStep = (lead.funnelStep ?? "landing") as FunnelStep;
              const playbook = getPlaybookAction(funnelStep, temp, lead.name, lead.phone);
              const priorityCfg = PRIORITY_CONFIG[playbook.priority];
              const phone = lead.phone.replace(/\D/g, "");
              const whatsappUrl = playbook.whatsappTemplate
                ? `https://wa.me/55${phone}?text=${encodeURIComponent(playbook.whatsappTemplate)}`
                : `https://wa.me/55${phone}`;

              return (
                <div
                  key={lead.id}
                  className={`rounded-xl border p-4 transition-all ${tempCfg.bgColor} ${tempCfg.borderColor}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Info do lead */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <TempIcon temp={temp} />
                          <span className={`text-sm font-bold ${tempCfg.color}`}>{tempCfg.emoji} {tempCfg.label}</span>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${priorityCfg.color} ${priorityCfg.bgColor} border ${priorityCfg.borderColor}`}
                        >
                          {priorityCfg.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                          {FUNNEL_STEP_LABELS[funnelStep] ?? funnelStep}
                        </Badge>
                        {lead.leadScore && (
                          <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
                            Score {lead.leadScore}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{lead.name}</p>
                          <p className="text-xs text-slate-400">{lead.phone}</p>
                        </div>
                      </div>

                      {/* Playbook */}
                      <div className="bg-slate-900/40 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-bold text-white">{playbook.title}</p>
                        <p className="text-xs text-slate-400 leading-relaxed">{playbook.instruction}</p>
                        <p className="text-xs text-amber-400 font-medium">⏱ {playbook.timeLimit}</p>
                      </div>
                    </div>

                    {/* Timer + Ações */}
                    <div className="flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-slate-500">No funil há</p>
                        <LiveTimer since={lead.createdAt} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Última atividade</p>
                        <p className="text-xs text-slate-300">{formatTimeSince(lead.lastActivityAt)}</p>
                      </div>

                      <div className="flex sm:flex-col gap-2">
                        <Button
                          size="sm"
                          onClick={() => window.open(whatsappUrl, "_blank")}
                          className="bg-green-600 hover:bg-green-500 text-white font-bold text-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5 mr-1" />
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`tel:${lead.phone}`, "_self")}
                          className="border-slate-600 text-slate-300 hover:text-white text-xs"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1" />
                          Ligar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/painel/leads/${lead.id}/jornada`)}
                          className="border-slate-600 text-slate-300 hover:text-white text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Jornada
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => scheduleFollowupMutation.mutate({ leadId: lead.id })}
                          disabled={scheduleFollowupMutation.isPending}
                          className="border-slate-600 text-slate-300 hover:text-white text-xs"
                        >
                          <ArrowRight className="w-3.5 h-3.5 mr-1" />
                          Follow-up
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
