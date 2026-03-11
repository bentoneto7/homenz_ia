import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getLeadTemperature,
  getPlaybookAction,
  formatTimeSinceLive,
  formatTimeSince,
  TEMPERATURE_CONFIG,
  FUNNEL_STEP_LABELS,
  FUNNEL_STEP_ORDER,
  PRIORITY_CONFIG,
  type FunnelStep,
} from "@/lib/leadTemperature";
import {
  MessageCircle, Phone, CheckCircle2, XCircle, Clock,
  ChevronLeft, Copy, Flame, Thermometer, Snowflake, Skull,
  User, Camera, Brain, Calendar, Star, AlertTriangle,
  ArrowRight, Activity,
} from "lucide-react";

// Ícone por tipo de evento
function EventIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    lead_created: <User className="w-4 h-4 text-emerald-400" />,
    chat_started: <MessageCircle className="w-4 h-4 text-blue-400" />,
    chat_completed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    chat_abandoned: <XCircle className="w-4 h-4 text-red-400" />,
    photos_started: <Camera className="w-4 h-4 text-purple-400" />,
    photos_completed: <Camera className="w-4 h-4 text-emerald-400" />,
    photos_abandoned: <XCircle className="w-4 h-4 text-red-400" />,
    ai_processing_started: <Brain className="w-4 h-4 text-yellow-400 animate-pulse" />,
    ai_result_ready: <Brain className="w-4 h-4 text-emerald-400" />,
    schedule_opened: <Calendar className="w-4 h-4 text-blue-400" />,
    appointment_created: <Calendar className="w-4 h-4 text-emerald-400" />,
    appointment_confirmed: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    appointment_cancelled: <XCircle className="w-4 h-4 text-red-400" />,
    appointment_completed: <Star className="w-4 h-4 text-yellow-400" />,
    appointment_no_show: <AlertTriangle className="w-4 h-4 text-orange-400" />,
    followup_sent: <MessageCircle className="w-4 h-4 text-blue-400" />,
    whatsapp_contacted: <MessageCircle className="w-4 h-4 text-green-400" />,
    nps_sent: <Star className="w-4 h-4 text-yellow-400" />,
    nps_responded: <Star className="w-4 h-4 text-emerald-400" />,
    status_changed: <Activity className="w-4 h-4 text-slate-400" />,
  };
  return <>{icons[type] ?? <Clock className="w-4 h-4 text-slate-400" />}</>;
}

// Timer em tempo real
function LiveTimer({ since }: { since: Date | string }) {
  const [display, setDisplay] = useState(formatTimeSinceLive(since));
  useEffect(() => {
    const interval = setInterval(() => setDisplay(formatTimeSinceLive(since)), 1000);
    return () => clearInterval(interval);
  }, [since]);
  return <span className="font-mono text-lg font-bold">{display}</span>;
}

// Temperatura animada
function TemperatureBadge({ temp }: { temp: ReturnType<typeof getLeadTemperature> }) {
  const cfg = TEMPERATURE_CONFIG[temp];
  const TemperatureIcon = temp === "hot" ? Flame : temp === "warm" ? Thermometer : temp === "cold" ? Snowflake : Skull;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${cfg.bgColor} ${cfg.borderColor}`}>
      <TemperatureIcon className={`w-4 h-4 ${cfg.color} ${temp === "hot" ? "animate-pulse" : ""}`} />
      <span className={`text-sm font-bold ${cfg.color}`}>{cfg.emoji} {cfg.label}</span>
    </div>
  );
}

// Barra de progresso do funil
function FunnelProgress({ currentStep }: { currentStep: string }) {
  const idx = FUNNEL_STEP_ORDER.indexOf(currentStep as FunnelStep);
  const progress = idx >= 0 ? Math.round(((idx + 1) / FUNNEL_STEP_ORDER.length) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Progresso no Funil</span>
        <span className="font-bold text-[#0A2540]">{progress}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span>Entrada</span>
        <span>Agendado</span>
        <span>Concluído</span>
      </div>
    </div>
  );
}

export default function LeadJourney() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const leadId = Number(id);

  const { data: lead, isLoading: loadingLead } = trpc.leads.getById.useQuery(
    { id: leadId },
    { refetchInterval: 30_000 }
  );

  const { data: timeline, refetch: refetchTimeline } = trpc.journey.getTimeline.useQuery(
    { leadId },
    { enabled: !!leadId, refetchInterval: 15_000 }
  );

  const { data: followups } = trpc.followups.listByLead.useQuery(
    { leadId },
    { enabled: !!leadId }
  );

  const addEventMutation = trpc.journey.addEvent.useMutation({
    onSuccess: () => { refetchTimeline(); toast.success("Evento registrado!"); },
    onError: (e) => toast.error(e.message),
  });

  const scheduleFollowupMutation = trpc.followups.schedule.useMutation({
    onSuccess: (d) => toast.success(`${d.stepsScheduled} follow-ups agendados!`),
    onError: (e) => toast.error(e.message),
  });

  const cancelFollowupsMutation = trpc.followups.cancelPending.useMutation({
    onSuccess: () => toast.success("Follow-ups cancelados"),
    onError: (e) => toast.error(e.message),
  });

  if (loadingLead) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lead) {
    return (
      <DashboardLayout>
        <div className="text-center py-16 text-slate-400">Lead não encontrado</div>
      </DashboardLayout>
    );
  }

  const temperature = getLeadTemperature(lead.lastActivityAt);
  const tempCfg = TEMPERATURE_CONFIG[temperature];
  const funnelStep = (lead.funnelStep ?? "landing") as FunnelStep;
  const playbook = getPlaybookAction(funnelStep, temperature, lead.name, lead.phone);
  const priorityCfg = PRIORITY_CONFIG[playbook.priority];
  const phone = lead.phone.replace(/\D/g, "");
  const whatsappUrl = playbook.whatsappTemplate
    ? `https://wa.me/55${phone}?text=${encodeURIComponent(playbook.whatsappTemplate)}`
    : `https://wa.me/55${phone}`;

  const handleWhatsAppContact = () => {
    window.open(whatsappUrl, "_blank");
    addEventMutation.mutate({
      leadId,
      eventType: "whatsapp_contacted",
      description: "Contato via WhatsApp pelo painel",
    });
  };

  const copyWhatsApp = () => {
    if (playbook.whatsappTemplate) {
      navigator.clipboard.writeText(playbook.whatsappTemplate);
      toast.success("Mensagem copiada!");
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/painel/leads")} className="text-slate-400 hover:text-[#0A2540]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Leads
          </Button>
          <span className="text-slate-600">/</span>
          <span className="text-slate-300 font-medium">Jornada de {lead.name}</span>
        </div>

        {/* Card principal: temperatura + timer */}
        <div className={`rounded-2xl border p-6 ${tempCfg.bgColor} ${tempCfg.borderColor}`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-[#0A2540]">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[#0A2540]">{lead.name}</h1>
                  <p className="text-slate-400 text-sm">{lead.phone} · {lead.email ?? "sem e-mail"}</p>
                </div>
              </div>
              <TemperatureBadge temp={temperature} />
            </div>

            {/* Timer desde a entrada */}
            <div className="text-right space-y-1">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Tempo no funil</p>
              <LiveTimer since={lead.createdAt} />
              <p className="text-xs text-slate-500">Última atividade: {formatTimeSince(lead.lastActivityAt)}</p>
            </div>
          </div>

          {/* Progresso */}
          <div className="mt-5">
            <FunnelProgress currentStep={funnelStep} />
          </div>

          {/* Etapa atual */}
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="outline" className="text-amber-400 border-amber-400/40 bg-amber-400/10">
              {FUNNEL_STEP_LABELS[funnelStep] ?? funnelStep}
            </Badge>
            {lead.leadScore && (
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 bg-emerald-400/10">
                Score: {lead.leadScore}/100
              </Badge>
            )}
            {lead.utmSource && (
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                {lead.utmSource}
              </Badge>
            )}
          </div>
        </div>

        {/* PLAYBOOK DE AÇÃO */}
        <div className={`rounded-2xl border p-5 ${priorityCfg.bgColor} ${priorityCfg.borderColor}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Badge className={`text-xs font-bold ${priorityCfg.color} ${priorityCfg.bgColor} border ${priorityCfg.borderColor}`}>
                  {priorityCfg.label}
                </Badge>
                <span className="text-xs text-slate-400 uppercase tracking-wider">{playbook.timeLimit}</span>
              </div>
              <h2 className="text-base font-bold text-[#0A2540]">{playbook.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{playbook.instruction}</p>
            </div>
          </div>

          {/* Mensagem WhatsApp pré-redigida */}
          {playbook.whatsappTemplate && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Mensagem sugerida</p>
              <div className="bg-slate-900/60 rounded-xl p-3 text-sm text-slate-300 leading-relaxed border border-slate-700/50 whitespace-pre-wrap">
                {playbook.whatsappTemplate}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleWhatsAppContact}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-[#0A2540] font-bold"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Abrir WhatsApp
                </Button>
                <Button variant="outline" onClick={copyWhatsApp} className="border-slate-600 text-slate-300">
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Ações rápidas */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`tel:${lead.phone}`, "_self")}
              className="border-slate-600 text-slate-300 hover:text-[#0A2540]"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5" /> Ligar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scheduleFollowupMutation.mutate({ leadId })}
              disabled={scheduleFollowupMutation.isPending}
              className="border-slate-600 text-slate-300 hover:text-[#0A2540]"
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" /> Agendar Follow-up
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelFollowupsMutation.mutate({ leadId })}
              disabled={cancelFollowupsMutation.isPending}
              className="border-slate-600 text-slate-300 hover:text-[#0A2540]"
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" /> Cancelar Follow-ups
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* TIMELINE DE EVENTOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Timeline da Jornada
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addEventMutation.mutate({ leadId, eventType: "whatsapp_contacted", description: "Contato manual registrado" })}
                className="text-xs text-slate-400 hover:text-[#0A2540]"
              >
                + Registrar contato
              </Button>
            </div>

            <div className="space-y-0">
              {(!timeline || timeline.length === 0) ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhum evento registrado ainda
                </div>
              ) : (
                timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    {/* Linha vertical */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <EventIcon type={event.eventType} />
                      </div>
                      {idx < timeline.length - 1 && (
                        <div className="w-px flex-1 bg-slate-800 my-1" />
                      )}
                    </div>
                    {/* Conteúdo */}
                    <div className="pb-4 flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-200 leading-tight">
                          {event.description ?? event.eventType.replace(/_/g, " ")}
                        </p>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {formatTimeSince(event.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {event.triggeredBy === "system" ? "Sistema" : event.triggeredBy === "lead" ? "Lead" : "Clínica"}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* FOLLOW-UPS AGENDADOS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Sequência de Follow-up
            </h3>

            {(!followups || followups.length === 0) ? (
              <div className="rounded-xl border border-slate-700/50 p-6 text-center space-y-3">
                <p className="text-slate-500 text-sm">Nenhum follow-up agendado</p>
                <Button
                  size="sm"
                  onClick={() => scheduleFollowupMutation.mutate({ leadId })}
                  disabled={scheduleFollowupMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  Iniciar Sequência
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {followups.map((fu) => {
                  const stepLabels = ["Imediato", "24 horas", "72 horas", "7 dias"];
                  const statusColors = {
                    pending: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
                    sent: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
                    delivered: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
                    failed: "text-red-400 border-red-400/30 bg-red-400/10",
                    cancelled: "text-slate-500 border-slate-600 bg-slate-800/50",
                  };
                  return (
                    <div key={fu.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-700/50 bg-slate-800/30">
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {fu.sequenceStep + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200">
                          {stepLabels[fu.sequenceStep] ?? `Passo ${fu.sequenceStep + 1}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(fu.scheduledAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${statusColors[fu.status as keyof typeof statusColors] ?? ""}`}
                      >
                        {fu.status === "pending" ? "Pendente" :
                         fu.status === "sent" ? "Enviado" :
                         fu.status === "delivered" ? "Entregue" :
                         fu.status === "failed" ? "Falhou" : "Cancelado"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Dados do lead */}
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Dados do Lead
              </h3>
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4 space-y-2 text-sm">
                {lead.gender && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Gênero</span>
                    <span className="text-slate-300 capitalize">Masculino</span>
                  </div>
                )}
                {lead.age && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Idade</span>
                    <span className="text-slate-300">{lead.age} anos</span>
                  </div>
                )}
                {lead.hairLossType && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tipo de queda</span>
                    <span className="text-slate-300 capitalize">{lead.hairLossType}</span>
                  </div>
                )}
                {lead.hairLossTime && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Há quanto tempo</span>
                    <span className="text-slate-300">{lead.hairLossTime}</span>
                  </div>
                )}
                {lead.utmSource && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Origem</span>
                    <span className="text-slate-300">{lead.utmSource} / {lead.utmMedium ?? "—"}</span>
                  </div>
                )}
                {lead.utmCampaign && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Campanha</span>
                    <span className="text-slate-300 truncate max-w-32">{lead.utmCampaign}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
