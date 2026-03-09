import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, TrendingUp, Calendar, Star, Clock, BarChart3,
  Zap, Home, Settings, LogOut, Award, Target,
  ArrowUp, ArrowDown, Minus, Globe, Building2,
  ChevronRight, Filter, Download,
} from "lucide-react";

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK_NETWORK_STATS = {
  totalFranchises: 23,
  activeFranchises: 21,
  totalLeadsThisMonth: 847,
  leadsGrowth: 22,
  avgNetworkScore: 69,
  scoreGrowth: 4,
  totalScheduled: 412,
  schedulingRate: 49,
  totalRevenue: 618000,
  revenueGrowth: 18,
};

const MOCK_FRANCHISES = [
  { id: 1, name: "Homenz Uberaba", city: "Uberaba/MG", franchisee: "Carlos Andrade", leadsMonth: 87, score: 91, scheduled: 54, conversionRate: 62, avgResponseMin: 7, sellers: 4, grade: "S", trend: "up" },
  { id: 2, name: "Homenz Uberlândia", city: "Uberlândia/MG", franchisee: "Fernanda Lima", leadsMonth: 74, score: 85, scheduled: 44, conversionRate: 59, avgResponseMin: 11, sellers: 3, grade: "A", trend: "up" },
  { id: 3, name: "Homenz Belo Horizonte", city: "BH/MG", franchisee: "Ricardo Souza", leadsMonth: 68, score: 78, scheduled: 38, conversionRate: 56, avgResponseMin: 14, sellers: 5, grade: "B", trend: "up" },
  { id: 4, name: "Homenz Goiânia", city: "Goiânia/GO", franchisee: "Ana Martins", leadsMonth: 61, score: 72, scheduled: 31, conversionRate: 51, avgResponseMin: 18, sellers: 2, grade: "B", trend: "down" },
  { id: 5, name: "Homenz Brasília", city: "Brasília/DF", franchisee: "Paulo Costa", leadsMonth: 55, score: 65, scheduled: 25, conversionRate: 45, avgResponseMin: 22, sellers: 3, grade: "C", trend: "down" },
  { id: 6, name: "Homenz Ribeirão Preto", city: "Ribeirão Preto/SP", franchisee: "Luiz Ferreira", leadsMonth: 49, score: 58, scheduled: 20, conversionRate: 41, avgResponseMin: 31, sellers: 2, grade: "C", trend: "up" },
  { id: 7, name: "Homenz Campo Grande", city: "Campo Grande/MS", franchisee: "Mariana Rocha", leadsMonth: 42, score: 48, scheduled: 15, conversionRate: 36, avgResponseMin: 45, sellers: 1, grade: "D", trend: "down" },
];

const MOCK_TRAFFIC_QUALITY = [
  { label: "Score 80-100 (Quente 🔥)", pct: 31, count: 262 },
  { label: "Score 50-79 (Morno 🌡️)", pct: 47, count: 398 },
  { label: "Score 0-49 (Frio ❄️)", pct: 22, count: 187 },
];

const MOCK_TOP_SELLERS = [
  { name: "Carlos Mendes", franchise: "Homenz Uberaba", score: 94, scheduled: 31, responseMin: 8 },
  { name: "Ana Lima", franchise: "Homenz Uberaba", score: 89, scheduled: 27, responseMin: 10 },
  { name: "Fernanda Rocha", franchise: "Homenz Uberlândia", score: 85, scheduled: 24, responseMin: 12 },
  { name: "Rafael Souza", franchise: "Homenz BH", score: 81, scheduled: 22, responseMin: 15 },
  { name: "Juliana Costa", franchise: "Homenz Goiânia", score: 76, scheduled: 19, responseMin: 17 },
];

// ── Componentes ──────────────────────────────────────────────────────────────
function GradeBadge({ grade }: { grade: string }) {
  const map: Record<string, string> = {
    S: "bg-violet-100 text-violet-700",
    A: "bg-emerald-100 text-emerald-700",
    B: "bg-blue-100 text-blue-700",
    C: "bg-amber-100 text-amber-700",
    D: "bg-orange-100 text-orange-700",
    F: "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${map[grade] ?? "bg-slate-100 text-slate-600"}`}>
      {grade}
    </span>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />;
  if (trend === "down") return <ArrowDown className="w-3.5 h-3.5 text-red-500" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
}

function MetricCard({ title, value, sub, icon, growth, color }: {
  title: string; value: string | number; sub?: string;
  icon: React.ReactNode; growth?: number; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
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

// ── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  const [, navigate] = useLocation();
  const { logout } = useAuth();

  const items = [
    { id: "overview", label: "Visão da Rede", icon: <Globe className="w-4 h-4" />, path: "/rede" },
    { id: "franchises", label: "Franquias", icon: <Building2 className="w-4 h-4" />, path: "/rede/franquias" },
    { id: "sellers", label: "Top Vendedores", icon: <Award className="w-4 h-4" />, path: "/rede/vendedores" },
    { id: "leads", label: "Leads da Rede", icon: <Users className="w-4 h-4" />, path: "/rede/leads" },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="w-4 h-4" />, path: "/rede/analytics" },
    { id: "settings", label: "Configurações", icon: <Settings className="w-4 h-4" />, path: "/rede/configuracoes" },
  ];

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-screen sticky top-0">
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
        <div className="mt-2 text-xs text-slate-400 font-medium">Painel Administrativo</div>
        <div className="mt-1 text-[10px] text-violet-500 font-bold bg-violet-50 px-2 py-0.5 rounded-full inline-block">ADMIN DA REDE</div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active === item.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
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
export default function NetworkAdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"ranking" | "sellers" | "traffic">("ranking");
  const [sortBy, setSortBy] = useState<"score" | "leads" | "scheduled">("score");

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black mb-3 text-slate-900">Admin da Rede</h1>
          <p className="text-slate-500 mb-6">Acesso restrito ao administrador da rede Homenz.</p>
          <a href={getLoginUrl()}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full rounded-xl">Entrar</Button>
          </a>
        </div>
      </div>
    );
  }

  const sortedFranchises = [...MOCK_FRANCHISES].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "leads") return b.leadsMonth - a.leadsMonth;
    return b.scheduled - a.scheduled;
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar active="overview" />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-lg font-black text-slate-900">
              Visão Geral da Rede Homenz
            </h1>
            <p className="text-xs text-slate-400">
              {MOCK_NETWORK_STATS.activeFranchises} unidades ativas · {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toast.info("Exportação em desenvolvimento")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar relatório
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* KPIs da rede */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <MetricCard
              title="Franquias ativas"
              value={MOCK_NETWORK_STATS.activeFranchises}
              sub={`de ${MOCK_NETWORK_STATS.totalFranchises} total`}
              icon={<Building2 className="w-5 h-5 text-blue-600" />}
              color="bg-blue-50"
            />
            <MetricCard
              title="Leads este mês"
              value={MOCK_NETWORK_STATS.totalLeadsThisMonth.toLocaleString("pt-BR")}
              sub="em toda a rede"
              icon={<Users className="w-5 h-5 text-violet-600" />}
              growth={MOCK_NETWORK_STATS.leadsGrowth}
              color="bg-violet-50"
            />
            <MetricCard
              title="Score médio da rede"
              value={`${MOCK_NETWORK_STATS.avgNetworkScore}/100`}
              sub="qualidade dos leads"
              icon={<Target className="w-5 h-5 text-amber-600" />}
              growth={MOCK_NETWORK_STATS.scoreGrowth}
              color="bg-amber-50"
            />
            <MetricCard
              title="Agendamentos"
              value={MOCK_NETWORK_STATS.totalScheduled.toLocaleString("pt-BR")}
              sub={`${MOCK_NETWORK_STATS.schedulingRate}% de conversão`}
              icon={<Calendar className="w-5 h-5 text-emerald-600" />}
              color="bg-emerald-50"
            />
            <MetricCard
              title="Faturamento estimado"
              value={`R$ ${(MOCK_NETWORK_STATS.totalRevenue / 1000).toFixed(0)}k`}
              sub="baseado em agendamentos"
              icon={<TrendingUp className="w-5 h-5 text-rose-600" />}
              growth={MOCK_NETWORK_STATS.revenueGrowth}
              color="bg-rose-50"
            />
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <div className="flex items-center gap-1">
                {(["ranking", "sellers", "traffic"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                  >
                    {tab === "ranking" ? "Ranking de Franquias" : tab === "sellers" ? "Top Vendedores da Rede" : "Qualidade do Tráfego"}
                  </button>
                ))}
              </div>
              {activeTab === "ranking" && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400 mr-1">Ordenar por:</span>
                  {(["score", "leads", "scheduled"] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setSortBy(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sortBy === s ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                    >
                      {s === "score" ? "Score" : s === "leads" ? "Leads" : "Agendados"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {activeTab === "ranking" && (
              <div className="divide-y divide-slate-50">
                {sortedFranchises.map((f, i) => (
                  <div key={f.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors ${i === 0 ? "bg-amber-50/30" : ""}`}>
                    <div className={`text-xl font-black w-8 flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-slate-200"}`}>
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900 text-sm">{f.name}</span>
                        <GradeBadge grade={f.grade} />
                        <TrendIcon trend={f.trend} />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">{f.city}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{f.franchisee}</span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-500">{f.sellers} vendedores</span>
                      </div>
                    </div>
                    <div className="hidden lg:grid grid-cols-4 gap-6 text-center">
                      <div>
                        <div className="text-sm font-black text-slate-900">{f.leadsMonth}</div>
                        <div className="text-[10px] text-slate-400">leads/mês</div>
                      </div>
                      <div>
                        <div className={`text-sm font-black ${f.score >= 80 ? "text-emerald-600" : f.score >= 60 ? "text-amber-600" : "text-red-500"}`}>{f.score}</div>
                        <div className="text-[10px] text-slate-400">score</div>
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">{f.scheduled}</div>
                        <div className="text-[10px] text-slate-400">agendados</div>
                      </div>
                      <div>
                        <div className={`text-sm font-black ${f.avgResponseMin <= 10 ? "text-emerald-600" : f.avgResponseMin <= 20 ? "text-amber-600" : "text-red-500"}`}>{f.avgResponseMin}min</div>
                        <div className="text-[10px] text-slate-400">resp. média</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {activeTab === "sellers" && (
              <div className="p-6 space-y-3">
                {MOCK_TOP_SELLERS.map((s, i) => (
                  <div key={s.name} className={`flex items-center gap-4 p-4 rounded-2xl ${i === 0 ? "bg-amber-50 border border-amber-200" : "bg-slate-50"}`}>
                    <div className={`text-xl font-black w-8 ${i === 0 ? "text-amber-500" : "text-slate-300"}`}>#{i + 1}</div>
                    <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-xs font-black text-blue-700">
                      {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-xs text-slate-400">{s.franchise}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-black text-slate-900">{s.scheduled}</div>
                      <div className="text-[10px] text-slate-400">agendados</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-sm font-black ${s.responseMin <= 10 ? "text-emerald-600" : s.responseMin <= 20 ? "text-amber-600" : "text-red-500"}`}>{s.responseMin}min</div>
                      <div className="text-[10px] text-slate-400">resp. média</div>
                    </div>
                    <div className={`text-xl font-black ${s.score >= 80 ? "text-emerald-600" : "text-amber-600"}`}>{s.score}</div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "traffic" && (
              <div className="p-6">
                <div className="grid lg:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-black text-slate-900 mb-5">Distribuição de Qualidade de Leads</h4>
                    <div className="space-y-4">
                      {MOCK_TRAFFIC_QUALITY.map(q => (
                        <div key={q.label}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">{q.label}</span>
                            <span className="text-sm font-black text-slate-900">{q.count.toLocaleString("pt-BR")} leads</span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${q.pct >= 30 && q.label.includes("Quente") ? "bg-emerald-500" : q.label.includes("Morno") ? "bg-amber-400" : "bg-slate-300"}`}
                              style={{ width: `${q.pct}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{q.pct}% do total de leads</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 mb-5">Score Médio por Franquia (Top 5)</h4>
                    <div className="space-y-3">
                      {MOCK_FRANCHISES.slice(0, 5).map(f => (
                        <div key={f.id} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-slate-600 truncate">{f.name.replace("Homenz ", "")}</div>
                          <div className="flex-1 h-6 bg-slate-50 rounded-lg overflow-hidden">
                            <div
                              className={`h-full rounded-lg flex items-center justify-end pr-2 ${f.score >= 80 ? "bg-emerald-500" : f.score >= 60 ? "bg-blue-500" : "bg-amber-400"}`}
                              style={{ width: `${f.score}%` }}
                            >
                              <span className="text-[10px] font-bold text-white">{f.score}</span>
                            </div>
                          </div>
                          <GradeBadge grade={f.grade} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
