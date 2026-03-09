import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, Calendar, Star, Clock, Target, Award,
  ChevronRight, Phone, MessageCircle, CheckCircle,
  Zap, BarChart3, LogOut, TrendingUp,
  Flame, Thermometer, Snowflake, RefreshCw,
  UserCheck, AlertCircle, Plus,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
function TempIcon({ temp }: { temp: string }) {
  if (temp === "hot") return <Flame className="w-4 h-4 text-red-500" />;
  if (temp === "warm") return <Thermometer className="w-4 h-4 text-amber-500" />;
  return <Snowflake className="w-4 h-4 text-blue-400" />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

// Mapeamento de eventType para label e cor
const EVENT_META: Record<string, { label: string; color: string; icon: string }> = {
  lead_created:          { label: "Lead criado", color: "bg-blue-500", icon: "👤" },
  chat_started:          { label: "Chat iniciado", color: "bg-violet-500", icon: "💬" },
  chat_completed:        { label: "Chat concluído", color: "bg-violet-600", icon: "✅" },
  chat_abandoned:        { label: "Chat abandonado", color: "bg-slate-400", icon: "⏸️" },
  photos_started:        { label: "Fotos iniciadas", color: "bg-amber-400", icon: "📷" },
  photos_completed:      { label: "Fotos enviadas", color: "bg-amber-500", icon: "📸" },
  photos_abandoned:      { label: "Fotos abandonadas", color: "bg-slate-400", icon: "⏸️" },
  ai_processing_started: { label: "IA processando", color: "bg-cyan-500", icon: "🤖" },
  ai_result_ready:       { label: "Diagnóstico pronto", color: "bg-cyan-600", icon: "🧬" },
  schedule_opened:       { label: "Agenda aberta", color: "bg-teal-500", icon: "📅" },
  appointment_created:   { label: "Agendamento criado", color: "bg-emerald-500", icon: "📆" },
  appointment_confirmed: { label: "Consulta confirmada", color: "bg-emerald-600", icon: "✅" },
  appointment_cancelled: { label: "Agendamento cancelado", color: "bg-red-400", icon: "❌" },
  appointment_completed: { label: "Consulta realizada", color: "bg-emerald-700", icon: "🏆" },
  appointment_no_show:   { label: "Não compareceu", color: "bg-red-500", icon: "🚫" },
  followup_sent:         { label: "Follow-up enviado", color: "bg-blue-400", icon: "📩" },
  whatsapp_contacted:    { label: "Contato WhatsApp", color: "bg-green-500", icon: "📱" },
  nps_sent:              { label: "NPS enviado", color: "bg-indigo-400", icon: "⭐" },
  nps_responded:         { label: "NPS respondido", color: "bg-indigo-600", icon: "⭐" },
  status_changed:        { label: "Status alterado", color: "bg-slate-500", icon: "🔄" },
};

function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD}d`;
}

// ── Timeline real do lead ─────────────────────────────────────────────────────
function LeadTimelinePanel({ leadId, clinicId }: { leadId: number; clinicId: number }) {
  const utils = trpc.useUtils();
  const { data: events, isLoading } = trpc.journey.getTimeline.useQuery(
    { leadId },
    { refetchInterval: 10000 } // atualiza a cada 10s
  );

  const addEvent = trpc.journey.addEvent.useMutation({
    onSuccess: () => {
      utils.journey.getTimeline.invalidate({ leadId });
      toast.success("Evento registrado na timeline!");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAction = (eventType: "whatsapp_contacted" | "followup_sent" | "appointment_created" | "appointment_confirmed", label: string) => {
    addEvent.mutate({
      leadId,
      eventType,
      description: `${label} registrado pelo vendedor`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Carregando timeline...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline vertical */}
      <div className="relative">
        {(!events || events.length === 0) ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            Nenhum evento registrado ainda.
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((ev, i) => {
              const meta = EVENT_META[ev.eventType] ?? { label: ev.eventType, color: "bg-slate-400", icon: "📌" };
              return (
                <div key={ev.id} className="flex items-start gap-3">
                  {/* Dot + line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full ${meta.color} flex items-center justify-center text-white text-xs shadow-sm`}>
                      {meta.icon}
                    </div>
                    {i < events.length - 1 && <div className="w-0.5 h-4 bg-slate-200 mt-1" />}
                  </div>
                  {/* Content */}
                  <div className="flex-1 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{meta.label}</span>
                      <span className="text-[10px] text-slate-400">{formatRelativeTime(ev.createdAt)}</span>
                      {ev.triggeredBy === "clinic" && (
                        <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">vendedor</span>
                      )}
                    </div>
                    {ev.description && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{ev.description}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botões de ação que registram eventos */}
      <div className="pt-3 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 font-semibold">Registrar ação</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs h-8"
            disabled={addEvent.isPending}
            onClick={() => handleAction("whatsapp_contacted", "Contato WhatsApp")}
          >
            <MessageCircle className="w-3.5 h-3.5 mr-1" />
            WhatsApp
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-8"
            disabled={addEvent.isPending}
            onClick={() => handleAction("followup_sent", "Follow-up")}
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Follow-up
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs h-8"
            disabled={addEvent.isPending}
            onClick={() => handleAction("appointment_created", "Agendamento")}
          >
            <Calendar className="w-3.5 h-3.5 mr-1" />
            Agendar
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs h-8"
            disabled={addEvent.isPending}
            onClick={() => handleAction("appointment_confirmed", "Confirmação de consulta")}
          >
            <CheckCircle className="w-3.5 h-3.5 mr-1" />
            Confirmar consulta
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar() {
  const [, navigate] = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="w-56 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-sm font-black text-slate-900">HOMENZ</span>
            <span className="text-sm font-black text-blue-600"> IA</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-slate-400 font-medium">Painel do Vendedor</div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        {[
          { label: "Meus Leads", icon: <Users className="w-4 h-4" />, path: "/vendedor", active: true },
          { label: "Agendamentos", icon: <Calendar className="w-4 h-4" />, path: "/vendedor/agendamentos", active: false },
          { label: "Meu Desempenho", icon: <BarChart3 className="w-4 h-4" />, path: "/vendedor/desempenho", active: false },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${item.active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function SellerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [selectedLead, setSelectedLead] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  // Buscar leads reais da clínica
  const { data: leadsRaw, isLoading: leadsLoading } = trpc.leads.list.useQuery(
    { limit: 50, offset: 0 },
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-3 text-slate-900">Painel do Vendedor</h1>
          <p className="text-slate-500 mb-6">Faça login para ver seus leads.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl">Entrar</Button>
          </a>
        </div>
      </div>
    );
  }

  // Processar leads com temperatura baseada no score
  const allLeads = (leadsRaw ?? []).map((lead) => {
    const score = lead.leadScore ?? 0;
    const temperature = score >= 75 ? "hot" : score >= 50 ? "warm" : "cold";
    return { ...lead, temperature };
  });

  const filteredLeads = filter === "all" ? allLeads : allLeads.filter((l) => l.temperature === filter);

  // Stats calculados dos leads reais
  const stats = {
    total: allLeads.length,
    hot: allLeads.filter((l) => l.temperature === "hot").length,
    scheduled: allLeads.filter((l) => l.funnelStep === "scheduled" || l.funnelStep === "confirmed").length,
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-black text-slate-900">
              Seus leads, {user?.name?.split(" ")[0] ?? "Vendedor"}! 🎯
            </h1>
            <p className="text-xs text-slate-400">Foque nos leads quentes primeiro</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Leads quentes</div>
              <div className="text-xl font-black text-red-500">{stats.hot} 🔥</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Agendados</div>
              <div className="text-xl font-black text-emerald-600">{stats.scheduled}</div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total de leads", value: stats.total, icon: <Users className="w-4 h-4 text-blue-600" />, color: "bg-blue-50" },
              { label: "Leads quentes", value: stats.hot, icon: <Flame className="w-4 h-4 text-red-500" />, color: "bg-red-50" },
              { label: "Agendados", value: stats.scheduled, icon: <Calendar className="w-4 h-4 text-emerald-600" />, color: "bg-emerald-50" },
              { label: "Mornos", value: allLeads.filter(l => l.temperature === "warm").length, icon: <Thermometer className="w-4 h-4 text-amber-600" />, color: "bg-amber-50" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>{kpi.icon}</div>
                <div className="text-xl font-black text-slate-900">{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Lista de leads */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-900">Meus Leads</h3>
              <div className="flex items-center gap-1">
                {(["all", "hot", "warm", "cold"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${filter === f ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {f === "all" ? "Todos" : f === "hot" ? "🔥 Quentes" : f === "warm" ? "🌡️ Mornos" : "❄️ Frios"}
                  </button>
                ))}
              </div>
            </div>

            {leadsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Carregando leads...
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Nenhum lead {filter !== "all" ? `${filter === "hot" ? "quente" : filter === "warm" ? "morno" : "frio"}` : ""} ainda.</p>
                <p className="text-sm mt-1">Os leads aparecerão aqui conforme chegarem pelo funil.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {filteredLeads.map(lead => (
                  <div key={lead.id}>
                    <button
                      onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors text-left"
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                        {(lead.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TempIcon temp={lead.temperature} />
                          <span className="text-sm font-bold text-slate-900">{lead.name ?? "Lead anônimo"}</span>
                          <ScoreBadge score={lead.leadScore ?? 0} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                            {lead.funnelStep?.replace(/_/g, " ") ?? "novo"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {lead.lastActivityAt ? formatRelativeTime(lead.lastActivityAt) : "sem atividade"}
                          </span>
                        </div>
                      </div>

                      {/* Score bar */}
                      <div className="hidden sm:flex flex-col items-end gap-1">
                        <div className="text-[10px] text-slate-400">Score {lead.leadScore ?? 0}/100</div>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${(lead.leadScore ?? 0) >= 75 ? "bg-red-500" : (lead.leadScore ?? 0) >= 50 ? "bg-amber-500" : "bg-blue-400"}`}
                            style={{ width: `${lead.leadScore ?? 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Actions rápidas */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          </a>
                        )}
                        {lead.phone && (
                          <a
                            href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                          </a>
                        )}
                        <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedLead === lead.id ? "rotate-90" : ""}`} />
                      </div>
                    </button>

                    {/* Timeline expandida — real do banco */}
                    {selectedLead === lead.id && (
                      <div className="px-5 pb-5 bg-slate-50/50 border-t border-slate-100">
                        <div className="pt-4">
                          <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <span className="text-xs font-semibold text-slate-700">Jornada do lead — atualizada em tempo real</span>
                            <span className="text-[9px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">ao vivo</span>
                          </div>
                          <LeadTimelinePanel leadId={lead.id} clinicId={0} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
