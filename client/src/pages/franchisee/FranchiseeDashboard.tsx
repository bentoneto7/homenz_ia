import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Target, Calendar, Users, Award, TrendingUp,
  Flame, Thermometer, Snowflake, Copy, Plus,
  Loader2, UserPlus, Phone, MessageSquare,
  ChevronRight, BarChart3,
} from "lucide-react";
import { toast } from "sonner";

// ── Componentes ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/8 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="text-sm text-white/50 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#14b8a6] font-medium mt-1">{sub}</p>}
    </div>
  );
}

function TemperatureIcon({ temp }: { temp: string }) {
  if (temp === "hot") return <Flame className="w-3.5 h-3.5 text-orange-400" />;
  if (temp === "warm") return <Thermometer className="w-3.5 h-3.5 text-amber-400" />;
  return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400 bg-emerald-500/15" :
    score >= 50 ? "text-amber-400 bg-amber-500/15" :
    "text-blue-400 bg-blue-500/15";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}</span>
  );
}

// ── Painel principal ─────────────────────────────────────────────────────────

export default function FranchiseeDashboard() {
  const [, navigate] = useLocation();
  const { user, isFranchisee, isOwner, loading: authLoading } = useHomenzAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [activeTab, setActiveTab] = useState<"leads" | "sellers" | "funnel">("leads");

  const statsQuery = trpc.homenz.franchiseeStats.useQuery(undefined, {
    enabled: isFranchisee || isOwner,
    refetchInterval: 30000,
  });

  const createInviteMutation = trpc.homenz.createSellerInvite.useMutation({
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      toast.success("Link de convite copiado!");
      setShowInviteModal(false);
      setInviteEmail("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!authLoading && !user) {
    navigate("/login");
    return null;
  }

  if (!authLoading && user && user.role === "seller") {
    navigate("/vendedor");
    return null;
  }

  if (authLoading || statsQuery.isLoading) {
    return (
      <HomenzLayout title="Dashboard Franqueado">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#14b8a6] animate-spin" />
        </div>
      </HomenzLayout>
    );
  }

  const data = statsQuery.data;
  if (!data) {
    return (
      <HomenzLayout title="Dashboard Franqueado">
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <p className="text-white/40">Nenhum dado disponível</p>
          <p className="text-white/20 text-sm">Execute a migração SQL no Supabase</p>
        </div>
      </HomenzLayout>
    );
  }

  const { franchise, leads, sellers, stats, funnel } = data;

  return (
    <HomenzLayout title={franchise?.name ?? "Dashboard Franqueado"}>
      <div className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-white">{franchise?.name ?? "Minha Franquia"}</h2>
            <p className="text-white/50 text-sm mt-1">
              {franchise?.city}, {franchise?.state} · {sellers.length} vendedores
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-[#14b8a6]/20 text-[#14b8a6] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#14b8a6]/30 transition-colors border border-[#14b8a6]/30"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Vendedor
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de Leads" value={stats.totalLeads} sub="Este mês" icon={<Target className="w-5 h-5 text-white" />} color="bg-blue-500/20" />
          <StatCard label="Agendamentos" value={stats.scheduledLeads} sub={`${stats.conversionRate}% conversão`} icon={<Calendar className="w-5 h-5 text-white" />} color="bg-emerald-500/20" />
          <StatCard label="Score Médio" value={stats.avgScore} sub="0–100 pts" icon={<Award className="w-5 h-5 text-white" />} color="bg-amber-500/20" />
          <StatCard label="Leads Quentes" value={stats.hotLeads} sub={`${stats.warmLeads} mornos, ${stats.coldLeads} frios`} icon={<Flame className="w-5 h-5 text-white" />} color="bg-orange-500/20" />
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-xl w-fit">
            {(["leads", "sellers", "funnel"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab === "leads" ? "Leads Recentes" : tab === "sellers" ? "Vendedores" : "Funil"}
              </button>
            ))}
          </div>

          {/* Tab: Leads */}
          {activeTab === "leads" && (
            <div className="space-y-2">
              {leads.length === 0 ? (
                <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
                  <Target className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Nenhum lead ainda</p>
                </div>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} className="bg-white/5 border border-white/8 rounded-2xl p-4 hover:bg-white/8 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8a6]/30 to-[#3b82f6]/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {lead.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-white font-semibold text-sm">{lead.name}</p>
                          <ScoreBadge score={lead.lead_score} />
                          <TemperatureIcon temp={lead.temperature} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/40 flex-wrap">
                          <span>{lead.phone}</span>
                          {lead.age && <span>· {lead.age} anos</span>}
                          {lead.hair_problem && <span>· {lead.hair_problem}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-white/30 bg-white/5 px-2 py-1 rounded-lg capitalize">
                          {lead.funnel_step?.replace(/_/g, " ")}
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/20" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Vendedores */}
          {activeTab === "sellers" && (
            <div className="space-y-3">
              {sellers.length === 0 ? (
                <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
                  <Users className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 mb-3">Nenhum vendedor cadastrado</p>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 bg-[#14b8a6]/20 text-[#14b8a6] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#14b8a6]/30 transition-colors border border-[#14b8a6]/30 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Convidar primeiro vendedor
                  </button>
                </div>
              ) : (
                sellers.map((seller, i) => {
                  const m = seller.metrics;
                  return (
                    <div key={seller.id} className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/8 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm ${
                            i === 0 ? "bg-amber-500/20 text-amber-400" :
                            i === 1 ? "bg-slate-400/20 text-slate-300" :
                            "bg-white/10 text-white/50"
                          }`}>{i + 1}</div>
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {seller.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{seller.name}</p>
                            <p className="text-white/40 text-xs">{seller.leadsAssigned} leads atribuídos</p>
                          </div>
                        </div>

                        {m && (
                          <div className="hidden sm:flex items-center gap-6 text-center">
                            <div>
                              <p className="text-white font-black text-sm">{m.leads_scheduled}</p>
                              <p className="text-white/30 text-xs">agendados</p>
                            </div>
                            <div>
                              <p className="text-emerald-400 font-black text-sm">{m.conversion_rate}%</p>
                              <p className="text-white/30 text-xs">conversão</p>
                            </div>
                            <div>
                              <p className="text-amber-400 font-black text-sm">{m.avg_response_minutes}min</p>
                              <p className="text-white/30 text-xs">resposta</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {m && (
                            <div className="bg-[#14b8a6]/15 text-[#14b8a6] text-sm font-black px-3 py-1 rounded-full">
                              {m.score}
                            </div>
                          )}
                          <a
                            href={`https://wa.me/${seller.phone?.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Barra de performance */}
                      {m && (
                        <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-full"
                            style={{ width: `${Math.min(100, m.score)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab: Funil */}
          {activeTab === "funnel" && (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-6">
              <h4 className="text-white font-bold mb-6">Funil de Conversão</h4>
              <div className="space-y-3">
                {funnel.map((step, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white/70 text-sm">{step.step}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{step.count}</span>
                        <span className="text-white/40 text-xs">({step.pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${step.pct}%`,
                          background: `hsl(${200 - i * 20}, 80%, 60%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal de convite */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0d1425] border border-white/10 rounded-3xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-2">Convidar Vendedor</h3>
              <p className="text-white/50 text-sm mb-6">
                Gere um link de convite para adicionar um vendedor à sua equipe
              </p>
              <div className="mb-4">
                <label className="text-white/60 text-sm font-medium block mb-1.5">
                  Email do vendedor (opcional)
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="vendedor@email.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#14b8a6]/60 transition-all"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowInviteModal(false); setInviteEmail(""); }}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => createInviteMutation.mutate({ email: inviteEmail || undefined, expiresInDays: 7 })}
                  disabled={createInviteMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {createInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Gerar Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HomenzLayout>
  );
}
