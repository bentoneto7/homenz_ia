import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, TrendingUp, Calendar, Star, Clock, BarChart3,
  UserPlus, Mail, ChevronRight, Copy, ExternalLink,
  Zap, Target, Award, ArrowUp, ArrowDown, Minus,
  LogOut, Settings, Bell, Home, Activity,
} from "lucide-react";

// ── Mock data (substituir por tRPC quando backend estiver pronto) ────────────
const MOCK_STATS = {
  totalLeads: 147,
  leadsThisMonth: 34,
  leadsGrowth: 18,
  avgLeadScore: 72,
  scoreGrowth: 5,
  scheduledThisMonth: 22,
  schedulingRate: 65,
  schedulingGrowth: 8,
  revenueEstimate: 33000,
  revenueGrowth: 12,
};

const MOCK_LEAD_QUALITY = [
  { label: "Score 80-100 (Quente 🔥)", count: 12, pct: 35, color: "bg-emerald-500" },
  { label: "Score 50-79 (Morno 🌡️)", count: 15, pct: 44, color: "bg-amber-400" },
  { label: "Score 0-49 (Frio ❄️)", count: 7, pct: 21, color: "bg-slate-300" },
];

const MOCK_SELLERS = [
  { id: 1, name: "Carlos Mendes", avatar: "CM", leadsAssigned: 18, leadsContacted: 16, scheduled: 11, conversionRate: 61, avgResponseMin: 8, score: 94, trend: "up" },
  { id: 2, name: "Ana Lima", avatar: "AL", leadsAssigned: 14, leadsContacted: 12, scheduled: 8, conversionRate: 57, avgResponseMin: 12, score: 82, trend: "up" },
  { id: 3, name: "Rafael Costa", avatar: "RC", leadsAssigned: 12, leadsContacted: 9, scheduled: 5, conversionRate: 42, avgResponseMin: 28, score: 61, trend: "down" },
];

const MOCK_LEADS = [
  { id: 1, name: "João Ferreira", score: 88, step: "Agendado", stepColor: "text-emerald-600 bg-emerald-50", time: "há 2h", seller: "Carlos Mendes", phone: "(34) 99812-3456" },
  { id: 2, name: "Pedro Alves", score: 74, step: "Chat concluído", stepColor: "text-blue-600 bg-blue-50", time: "há 4h", seller: "Ana Lima", phone: "(34) 99823-4567" },
  { id: 3, name: "Marcos Souza", score: 91, step: "Aguardando resposta", stepColor: "text-amber-600 bg-amber-50", time: "há 6h", seller: "Carlos Mendes", phone: "(34) 99834-5678" },
  { id: 4, name: "Lucas Rocha", score: 55, step: "Fotos enviadas", stepColor: "text-purple-600 bg-purple-50", time: "há 8h", seller: "Rafael Costa", phone: "(34) 99845-6789" },
  { id: 5, name: "Bruno Martins", score: 38, step: "Lead frio ❄️", stepColor: "text-slate-600 bg-slate-50", time: "há 1d", seller: "Rafael Costa", phone: "(34) 99856-7890" },
];

const MOCK_FUNNEL = [
  { step: "Leads recebidos", count: 34, pct: 100, color: "bg-blue-500" },
  { step: "Chat iniciado", count: 28, pct: 82, color: "bg-indigo-500" },
  { step: "Chat concluído", count: 22, pct: 65, color: "bg-violet-500" },
  { step: "Fotos enviadas", count: 18, pct: 53, color: "bg-purple-500" },
  { step: "IA processada", count: 16, pct: 47, color: "bg-fuchsia-500" },
  { step: "Agendado", count: 11, pct: 32, color: "bg-emerald-500" },
];

// ── Componentes ──────────────────────────────────────────────────────────────

function MetricCard({ title, value, sub, icon, growth, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; growth?: number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${growth > 0 ? "text-emerald-700 bg-emerald-50" : growth < 0 ? "text-red-600 bg-red-50" : "text-slate-500 bg-slate-50"}`}>
            {growth > 0 ? <ArrowUp className="w-3 h-3" /> : growth < 0 ? <ArrowDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-sm text-slate-500 mt-0.5">{title}</p>
      {sub && <p className="text-xs text-blue-600 font-medium mt-1">{sub}</p>}
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-100 text-emerald-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600";
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}</span>;
}

function InviteModal({ onClose, clinicSlug }: { onClose: () => void; clinicSlug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!name.trim() || !email.trim()) { toast.error("Preencha nome e e-mail"); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    toast.success(`Convite enviado para ${email}!`);
    setSending(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">Convidar Vendedor</h3>
            <p className="text-xs text-slate-500">O vendedor receberá acesso apenas aos leads da sua unidade</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Nome completo</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex: Carlos Mendes"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">E-mail</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="carlos@email.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancelar</Button>
          <Button
            className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleInvite} disabled={sending}
          >
            {sending ? "Enviando..." : "Enviar convite"}
          </Button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-4">
          Plano Unidade: até 5 vendedores · Plano Pro: ilimitado
        </p>
      </div>
    </div>
  );
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  const [, navigate] = useLocation();
  const { logout } = useAuth();

  const items = [
    { id: "dashboard", label: "Visão Geral", icon: <Home className="w-4 h-4" />, path: "/franqueado" },
    { id: "leads", label: "Leads", icon: <Users className="w-4 h-4" />, path: "/franqueado/leads" },
    { id: "vendedores", label: "Vendedores", icon: <Award className="w-4 h-4" />, path: "/franqueado/vendedores" },
    { id: "agendamentos", label: "Agendamentos", icon: <Calendar className="w-4 h-4" />, path: "/franqueado/agendamentos" },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" />, path: "/franqueado/analytics" },
    { id: "configuracoes", label: "Configurações", icon: <Settings className="w-4 h-4" />, path: "/franqueado/configuracoes" },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
      {/* Logo */}
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
        <div className="mt-2 text-xs text-slate-400 font-medium">Painel do Franqueado</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active === item.id
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
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
export default function FranchiseeDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [showInvite, setShowInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<"leads" | "vendedores" | "funil">("leads");

  const { data: clinic } = trpc.clinic.mine.useQuery(undefined, { enabled: isAuthenticated });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-3 text-slate-900">Painel do Franqueado</h1>
          <p className="text-slate-500 mb-6">Faça login para acessar sua unidade Homenz.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl">Entrar</Button>
          </a>
        </div>
      </div>
    );
  }

  const funnelLink = clinic ? `${window.location.origin}/c/${clinic.slug}` : "";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar active="dashboard" />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-black text-slate-900">
              Bom dia, {user?.name?.split(" ")[0] ?? "Franqueado"}! 👋
            </h1>
            <p className="text-xs text-slate-400">
              {clinic?.name ?? "Carregando..."} · {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {funnelLink && (
              <button
                onClick={() => { navigator.clipboard.writeText(funnelLink); toast.success("Link do funil copiado!"); }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Copiar link do funil
              </button>
            )}
            <button
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Convidar vendedor
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Leads este mês"
              value={MOCK_STATS.leadsThisMonth}
              sub={`${MOCK_STATS.totalLeads} no total`}
              icon={<Users className="w-5 h-5 text-blue-600" />}
              growth={MOCK_STATS.leadsGrowth}
              color="bg-blue-50"
            />
            <MetricCard
              title="Score médio dos leads"
              value={`${MOCK_STATS.avgLeadScore}/100`}
              sub="Qualidade do tráfego"
              icon={<Target className="w-5 h-5 text-violet-600" />}
              growth={MOCK_STATS.scoreGrowth}
              color="bg-violet-50"
            />
            <MetricCard
              title="Agendamentos"
              value={MOCK_STATS.scheduledThisMonth}
              sub={`${MOCK_STATS.schedulingRate}% de conversão`}
              icon={<Calendar className="w-5 h-5 text-emerald-600" />}
              growth={MOCK_STATS.schedulingGrowth}
              color="bg-emerald-50"
            />
            <MetricCard
              title="Faturamento estimado"
              value={`R$ ${MOCK_STATS.revenueEstimate.toLocaleString("pt-BR")}`}
              sub="Baseado em agendamentos"
              icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
              growth={MOCK_STATS.revenueGrowth}
              color="bg-amber-50"
            />
          </div>

          {/* Qualidade do tráfego */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-slate-900">Qualidade do Tráfego</h3>
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Score 0-100</span>
              </div>
              <div className="space-y-4">
                {MOCK_LEAD_QUALITY.map(q => (
                  <div key={q.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-600">{q.label}</span>
                      <span className="text-xs font-black text-slate-900">{q.count} leads</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${q.color} rounded-full transition-all`} style={{ width: `${q.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Score médio da unidade</span>
                <span className="text-lg font-black text-blue-600">{MOCK_STATS.avgLeadScore}/100</span>
              </div>
            </div>

            {/* Funil de conversão */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-slate-900">Funil de Conversão</h3>
                <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Este mês</span>
              </div>
              <div className="space-y-2.5">
                {MOCK_FUNNEL.map(f => (
                  <div key={f.step} className="flex items-center gap-3">
                    <div className="w-24 text-xs text-slate-500 text-right flex-shrink-0">{f.step}</div>
                    <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden relative">
                      <div className={`h-full ${f.color} rounded-lg transition-all flex items-center justify-end pr-2`} style={{ width: `${f.pct}%` }}>
                        <span className="text-[10px] font-bold text-white">{f.count}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-400 w-8">{f.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tempo de resposta */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-slate-900">Tempo de Resposta</h3>
                <Clock className="w-4 h-4 text-slate-400" />
              </div>
              <div className="space-y-4">
                {MOCK_SELLERS.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                      {i + 1}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-700">
                      {s.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{s.name}</div>
                      <div className={`text-[10px] font-medium ${s.avgResponseMin <= 10 ? "text-emerald-600" : s.avgResponseMin <= 20 ? "text-amber-600" : "text-red-500"}`}>
                        {s.avgResponseMin <= 10 ? "⚡" : s.avgResponseMin <= 20 ? "🕐" : "⚠️"} {s.avgResponseMin} min em média
                      </div>
                    </div>
                    <ScoreBadge score={s.score} />
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <p className="text-[10px] text-slate-400">⚡ &lt;10min · 🕐 10-20min · ⚠️ &gt;20min</p>
              </div>
            </div>
          </div>

          {/* Tabs: Leads recentes / Ranking vendedores */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1 p-4 border-b border-slate-100">
              {(["leads", "vendedores", "funil"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  {tab === "leads" ? "Leads Recentes" : tab === "vendedores" ? "Ranking de Vendedores" : "Interação no Funil"}
                </button>
              ))}
            </div>

            {activeTab === "leads" && (
              <div className="divide-y divide-slate-50">
                {MOCK_LEADS.map(lead => (
                  <div key={lead.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors cursor-pointer">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                      {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{lead.name}</span>
                        <ScoreBadge score={lead.score} />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${lead.stepColor}`}>{lead.step}</span>
                        <span className="text-[10px] text-slate-400">{lead.time}</span>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-slate-500">{lead.seller}</div>
                      <div className="text-xs text-slate-400">{lead.phone}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "vendedores" && (
              <div className="p-6">
                <div className="space-y-4">
                  {MOCK_SELLERS.map((seller, i) => (
                    <div key={seller.id} className={`relative rounded-2xl p-5 border ${i === 0 ? "border-amber-200 bg-amber-50/50" : "border-slate-100 bg-slate-50/30"}`}>
                      {i === 0 && (
                        <div className="absolute -top-2 left-4 px-2 py-0.5 rounded-full bg-amber-400 text-white text-[10px] font-black">
                          🏆 Top Vendedor
                        </div>
                      )}
                      <div className="flex items-center gap-4">
                        <div className="text-2xl font-black text-slate-200 w-8">#{i + 1}</div>
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-sm font-black text-blue-700">
                          {seller.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{seller.name}</span>
                            {seller.trend === "up" ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-red-500" />}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-slate-500">{seller.leadsContacted}/{seller.leadsAssigned} abordados</span>
                            <span className="text-xs text-slate-500">{seller.scheduled} agendados</span>
                            <span className="text-xs font-semibold text-blue-600">{seller.conversionRate}% conversão</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-black ${seller.score >= 80 ? "text-emerald-600" : seller.score >= 60 ? "text-amber-600" : "text-red-500"}`}>
                            {seller.score}
                          </div>
                          <div className="text-[10px] text-slate-400">pontos</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${seller.score >= 80 ? "bg-emerald-500" : seller.score >= 60 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${seller.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "funil" && (
              <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {MOCK_FUNNEL.map((f, i) => (
                    <div key={f.step} className="bg-slate-50 rounded-2xl p-4 text-center">
                      <div className={`w-12 h-12 rounded-xl ${f.color} flex items-center justify-center mx-auto mb-3`}>
                        <span className="text-white font-black text-lg">{f.count}</span>
                      </div>
                      <div className="text-xs font-semibold text-slate-700">{f.step}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{f.pct}% do total</div>
                      {i > 0 && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          {Math.round((f.count / MOCK_FUNNEL[i - 1].count) * 100)}% do passo anterior
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} clinicSlug={clinic?.slug ?? ""} />}
    </div>
  );
}
