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
  Zap, Home, BarChart3, LogOut, TrendingUp,
  ArrowUp, Flame, Thermometer, Snowflake,
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_MY_STATS = {
  leadsAssigned: 12,
  leadsContacted: 9,
  scheduled: 6,
  conversionRate: 50,
  avgResponseMin: 11,
  performanceScore: 78,
  rank: 2,
  totalSellers: 3,
};

const MOCK_MY_LEADS = [
  {
    id: 1, name: "João Ferreira", phone: "(34) 99812-3456", score: 88,
    temperature: "hot", step: "scheduled", stepLabel: "Agendado ✅",
    stepColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    lastActivity: "há 2h", notes: "Consulta confirmada para sexta-feira",
    funnelPct: 100,
    timeline: [
      { label: "Lead criado", done: true, time: "09:00" },
      { label: "Chat concluído", done: true, time: "09:15" },
      { label: "Fotos enviadas", done: true, time: "09:30" },
      { label: "IA processada", done: true, time: "09:45" },
      { label: "Agendado", done: true, time: "10:00" },
      { label: "Consulta realizada", done: false, time: "" },
    ],
  },
  {
    id: 2, name: "Pedro Alves", phone: "(34) 99823-4567", score: 74,
    temperature: "warm", step: "chat_done", stepLabel: "Chat concluído",
    stepColor: "text-blue-700 bg-blue-50 border-blue-200",
    lastActivity: "há 4h", notes: "Aguardando envio das fotos",
    funnelPct: 60,
    timeline: [
      { label: "Lead criado", done: true, time: "11:00" },
      { label: "Chat concluído", done: true, time: "11:20" },
      { label: "Fotos enviadas", done: false, time: "" },
      { label: "IA processada", done: false, time: "" },
      { label: "Agendado", done: false, time: "" },
      { label: "Consulta realizada", done: false, time: "" },
    ],
  },
  {
    id: 3, name: "Marcos Souza", phone: "(34) 99834-5678", score: 91,
    temperature: "hot", step: "waiting", stepLabel: "Aguardando resposta ⚡",
    stepColor: "text-amber-700 bg-amber-50 border-amber-200",
    lastActivity: "há 6h", notes: "Lead quente! Não respondeu ainda — ligar agora",
    funnelPct: 80,
    timeline: [
      { label: "Lead criado", done: true, time: "08:00" },
      { label: "Chat concluído", done: true, time: "08:25" },
      { label: "Fotos enviadas", done: true, time: "08:40" },
      { label: "IA processada", done: true, time: "08:55" },
      { label: "Agendado", done: false, time: "" },
      { label: "Consulta realizada", done: false, time: "" },
    ],
  },
  {
    id: 4, name: "Lucas Rocha", phone: "(34) 99845-6789", score: 55,
    temperature: "warm", step: "photos_done", stepLabel: "Fotos enviadas",
    stepColor: "text-purple-700 bg-purple-50 border-purple-200",
    lastActivity: "há 8h", notes: "",
    funnelPct: 70,
    timeline: [
      { label: "Lead criado", done: true, time: "14:00" },
      { label: "Chat concluído", done: true, time: "14:30" },
      { label: "Fotos enviadas", done: true, time: "14:50" },
      { label: "IA processada", done: false, time: "" },
      { label: "Agendado", done: false, time: "" },
      { label: "Consulta realizada", done: false, time: "" },
    ],
  },
  {
    id: 5, name: "Bruno Martins", phone: "(34) 99856-7890", score: 38,
    temperature: "cold", step: "cold", stepLabel: "Lead frio ❄️",
    stepColor: "text-slate-600 bg-slate-50 border-slate-200",
    lastActivity: "há 1d", notes: "Sem interação há mais de 24h",
    funnelPct: 20,
    timeline: [
      { label: "Lead criado", done: true, time: "ontem" },
      { label: "Chat concluído", done: false, time: "" },
      { label: "Fotos enviadas", done: false, time: "" },
      { label: "IA processada", done: false, time: "" },
      { label: "Agendado", done: false, time: "" },
      { label: "Consulta realizada", done: false, time: "" },
    ],
  },
];

// ── Componentes ──────────────────────────────────────────────────────────────
function TempIcon({ temp }: { temp: string }) {
  if (temp === "hot") return <Flame className="w-4 h-4 text-red-500" />;
  if (temp === "warm") return <Thermometer className="w-4 h-4 text-amber-500" />;
  return <Snowflake className="w-4 h-4 text-blue-400" />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

function LeadTimeline({ steps }: { steps: { label: string; done: boolean; time: string }[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${step.done ? "bg-blue-600 text-white shadow-sm shadow-blue-200" : "bg-slate-100 text-slate-400"}`}>
              {step.done ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <div className="text-[9px] text-slate-400 mt-1 text-center w-14 leading-tight">{step.label}</div>
            {step.time && <div className="text-[9px] text-blue-500 font-medium">{step.time}</div>}
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-6 mb-5 flex-shrink-0 ${step.done && steps[i + 1].done ? "bg-blue-600" : "bg-slate-200"}`} />
          )}
        </div>
      ))}
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

  const filteredLeads = filter === "all" ? MOCK_MY_LEADS : MOCK_MY_LEADS.filter(l => l.temperature === filter);
  const activeLead = selectedLead !== null ? MOCK_MY_LEADS.find(l => l.id === selectedLead) : null;

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
          {/* Score pessoal */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-400">Seu score hoje</div>
              <div className="text-xl font-black text-blue-600">{MOCK_MY_STATS.performanceScore}<span className="text-sm text-slate-400">/100</span></div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Ranking</div>
              <div className="text-xl font-black text-amber-500">#{MOCK_MY_STATS.rank}<span className="text-sm text-slate-400">/{MOCK_MY_STATS.totalSellers}</span></div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Mini KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Leads atribuídos", value: MOCK_MY_STATS.leadsAssigned, icon: <Users className="w-4 h-4 text-blue-600" />, color: "bg-blue-50" },
              { label: "Leads abordados", value: MOCK_MY_STATS.leadsContacted, icon: <MessageCircle className="w-4 h-4 text-violet-600" />, color: "bg-violet-50" },
              { label: "Agendados", value: MOCK_MY_STATS.scheduled, icon: <Calendar className="w-4 h-4 text-emerald-600" />, color: "bg-emerald-50" },
              { label: "Tempo médio resposta", value: `${MOCK_MY_STATS.avgResponseMin}min`, icon: <Clock className="w-4 h-4 text-amber-600" />, color: "bg-amber-50" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${kpi.color}`}>{kpi.icon}</div>
                <div className="text-xl font-black text-slate-900">{kpi.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Performance bar gamificada */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-black text-slate-900">Sua performance hoje</span>
              </div>
              <span className="text-sm font-black text-blue-600">{MOCK_MY_STATS.performanceScore}/100 pts</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                style={{ width: `${MOCK_MY_STATS.performanceScore}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-slate-400">0 — Iniciante</span>
              <span className="text-[10px] text-amber-500 font-semibold">🏆 Top vendedor a {100 - MOCK_MY_STATS.performanceScore} pts</span>
              <span className="text-[10px] text-slate-400">100 — Campeão</span>
            </div>
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

            <div className="divide-y divide-slate-50">
              {filteredLeads.map(lead => (
                <div key={lead.id}>
                  <button
                    onClick={() => setSelectedLead(selectedLead === lead.id ? null : lead.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600 flex-shrink-0">
                      {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <TempIcon temp={lead.temperature} />
                        <span className="text-sm font-bold text-slate-900">{lead.name}</span>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${lead.stepColor}`}>{lead.stepLabel}</span>
                        <span className="text-[10px] text-slate-400">{lead.lastActivity}</span>
                      </div>
                      {lead.notes && (
                        <div className="text-[10px] text-slate-500 mt-1 italic">"{lead.notes}"</div>
                      )}
                    </div>

                    {/* Progress mini */}
                    <div className="hidden sm:flex flex-col items-end gap-1">
                      <div className="text-[10px] text-slate-400">{lead.funnelPct}% do funil</div>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${lead.funnelPct}%` }} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={`tel:${lead.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 flex items-center justify-center transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      </a>
                      <a
                        href={`https://wa.me/55${lead.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="w-8 h-8 rounded-lg bg-green-50 hover:bg-green-100 flex items-center justify-center transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                      </a>
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedLead === lead.id ? "rotate-90" : ""}`} />
                    </div>
                  </button>

                  {/* Timeline expandida */}
                  {selectedLead === lead.id && (
                    <div className="px-5 pb-5 bg-slate-50/50 border-t border-slate-100">
                      <div className="pt-4">
                        <div className="text-xs font-semibold text-slate-500 mb-4">Jornada do lead</div>
                        <div className="overflow-x-auto pb-2">
                          <LeadTimeline steps={lead.timeline} />
                        </div>
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs"
                            onClick={() => toast.success("Contato registrado!")}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            Registrar contato
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl text-xs"
                            onClick={() => toast.success("Agendamento aberto!")}
                          >
                            <Calendar className="w-3.5 h-3.5 mr-1" />
                            Agendar consulta
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
