import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Building2, Users, Target, Calendar,
  Award, Copy, Plus, Loader2, CheckCircle, XCircle, Crown,
} from "lucide-react";
import { toast } from "sonner";

function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:shadow-md transition-all shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-[#0A2540]">{value}</p>
      <p className="text-sm text-[#5A667A] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#00C1B8] font-medium mt-1">{sub}</p>}
    </div>
  );
}

export default function NetworkDashboardSupabase() {
  const [, navigate] = useLocation();
  const { user, isOwner, loading: authLoading } = useHomenzAuth();
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const statsQuery = trpc.homenz.networkStats.useQuery(undefined, {
    enabled: isOwner,
    refetchInterval: 30000,
  });

  const createInviteMutation = trpc.homenz.createFranchiseeInvite.useMutation({
    onSuccess: (data) => {
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      toast.success("Link copiado: " + data.inviteUrl);
      setShowInviteModal(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auth guard is handled by ProtectedRoute in App.tsx — no navigate() in render
  if (!authLoading && (!user || !isOwner)) return null;

  if (authLoading || statsQuery.isLoading) {
    return (
      <HomenzLayout title="Rede Homenz">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#00C1B8] animate-spin" />
        </div>
      </HomenzLayout>
    );
  }

  // Fallback com dados mock se Supabase não tiver dados ainda
  const stats = statsQuery.data ?? {
    summary: { totalLeads: 0, totalScheduled: 0, totalSellers: 0, totalFranchises: 0, avgScore: 0, conversionRate: 0 },
    franchises: [],
    topSellers: [],
  };

  const { summary, franchises, topSellers } = stats;

  const handleCopyInvite = (franchiseId: string) => {
    createInviteMutation.mutate({ franchiseId, expiresInDays: 7 });
  };

  return (
    <HomenzLayout title="Rede Homenz — Visão Geral">
      <div className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A2540]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Rede Homenz</h2>
            <p className="text-[#5A667A] text-sm mt-1">
              {summary.totalFranchises} franquias · {summary.totalSellers} vendedores ativos
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/15 text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ao vivo
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de Leads" value={summary.totalLeads} sub="Toda a rede" icon={<Target className="w-5 h-5 text-[#0A2540]" />} color="bg-blue-500/20" />
          <StatCard label="Agendamentos" value={summary.totalScheduled} sub={`${summary.conversionRate}% conversão`} icon={<Calendar className="w-5 h-5 text-[#0A2540]" />} color="bg-emerald-500/20" />
          <StatCard label="Score Médio" value={summary.avgScore} sub="0–100 pts" icon={<Award className="w-5 h-5 text-[#0A2540]" />} color="bg-amber-500/20" />
          <StatCard label="Vendedores" value={summary.totalSellers} sub={`${summary.totalFranchises} franquias`} icon={<Users className="w-5 h-5 text-[#0A2540]" />} color="bg-violet-500/20" />
        </div>

        {/* Ranking de franquias */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-bold text-[#0A2540]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Ranking de Franquias</h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-[#00C1B8] text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-[#009E96] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Convidar Franqueado
            </button>
          </div>

          {franchises.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
              <Building2 className="w-12 h-12 text-[#C0CADB] mx-auto mb-3" />
              <p className="text-[#5A667A] font-medium">Nenhuma franquia cadastrada</p>
              <p className="text-[#A0AABB] text-sm mt-1">Execute a migração SQL no Supabase para ver os dados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...franchises]
                .sort((a, b) => b.avgScore - a.avgScore)
                .map((f, i) => (
                  <div key={f.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:shadow-md transition-all shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                        i === 0 ? "bg-amber-100 text-amber-600" :
                        i === 1 ? "bg-slate-100 text-slate-500" :
                        i === 2 ? "bg-orange-100 text-orange-600" :
                        "bg-[#F0F4F8] text-[#A0AABB]"
                      }`}>{i + 1}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-[#0A2540] font-bold">{f.name}</p>
                          <span className="text-[#A0AABB] text-xs">{f.city}, {f.state}</span>
                          {/* Badge de plano */}
                          {(f as any).plan && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              (f as any).plan === 'network' ? 'bg-violet-100 text-violet-700' :
                              (f as any).plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {(f as any).plan === 'network' && <Crown className="w-3 h-3" />}
                              {String((f as any).plan).toUpperCase()}
                            </span>
                          )}
                          {/* Badge de status */}
                          {(f as any).active === false ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Inativa
                            </span>
                          ) : (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Ativa
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#5A667A] flex-wrap">
                          <span>{f.totalLeads} leads</span>
                          <span>{f.scheduledLeads} agendados</span>
                          <span>{f.sellersCount} vendedores</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-2xl font-black text-[#00C1B8]">{f.avgScore}</p>
                          <p className="text-[#A0AABB] text-xs">score</p>
                        </div>
                        <div className="hidden sm:flex gap-1">
                          <span className="text-xs text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded-full">{f.hotLeads}🔥</span>
                          <span className="text-xs text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">{f.warmLeads}🌡️</span>
                          <span className="text-xs text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-full">{f.coldLeads}❄️</span>
                        </div>
                        <button
                          onClick={() => handleCopyInvite(f.id)}
                          disabled={createInviteMutation.isPending}
                          className="w-8 h-8 rounded-lg bg-[#F0F4F8] flex items-center justify-center text-[#A0AABB] hover:text-[#00C1B8] hover:bg-teal-50 transition-all"
                          title="Gerar link de convite"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] rounded-full"
                        style={{ width: `${Math.min(100, f.avgScore)}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Top vendedores */}
        <div>
          <h3 className="text-lg font-bold text-[#0A2540] mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>Top Vendedores da Rede</h3>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="text-left text-[#5A667A] text-xs font-semibold uppercase tracking-wider px-5 py-3">#</th>
                  <th className="text-left text-[#5A667A] text-xs font-semibold uppercase tracking-wider px-5 py-3">Vendedor</th>
                  <th className="text-left text-[#5A667A] text-xs font-semibold uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Franquia</th>
                  <th className="text-center text-[#5A667A] text-xs font-semibold uppercase tracking-wider px-5 py-3">Leads</th>
                  <th className="text-center text-[#5A667A] text-xs font-semibold uppercase tracking-wider px-5 py-3 hidden md:table-cell">Agendados</th>
                  <th className="text-center text-[#5A667A] text-xs font-semibold uppercase tracking-wider px-5 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-[#A0AABB] text-sm">
                      Execute a migração SQL no Supabase para ver os dados
                    </td>
                  </tr>
                ) : (
                  topSellers.map((s, i) => (
                    <tr key={s.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-5 py-4">
                        <span className={`font-black text-sm ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-500" : "text-[#C0CADB]"}`}>{i + 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#004A9D] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {String(s.sellerName).split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                            </span>
                          </div>
                          <span className="text-[#0A2540] font-medium text-sm">{s.sellerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-[#5A667A] text-sm">{s.franchiseName}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-[#0A2540] font-semibold text-sm">{s.leads_assigned}</span>
                      </td>
                      <td className="px-5 py-4 text-center hidden md:table-cell">
                        <span className="text-emerald-400 font-semibold text-sm">{s.leads_scheduled}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-teal-50 text-[#007A75] text-sm font-black px-2.5 py-1 rounded-full">
                          {s.score}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de convite */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-xl font-bold text-[#0A2540] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Convidar Franqueado</h3>
              <p className="text-[#5A667A] text-sm mb-6">Selecione a franquia para gerar o link de convite</p>
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {franchises.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFranchise(f.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedFranchise === f.id ? "border-[#00C1B8] bg-teal-50" : "border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-[#5A667A] flex-shrink-0" />
                    <div>
                      <p className="text-[#0A2540] font-medium text-sm">{f.name}</p>
                      <p className="text-[#A0AABB] text-xs">{f.city}, {f.state}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium">
                  Cancelar
                </button>
                <button
                  onClick={() => selectedFranchise && handleCopyInvite(selectedFranchise)}
                  disabled={!selectedFranchise || createInviteMutation.isPending}
                  className="flex-1 py-3 rounded-full bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#009E96] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {createInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                  Gerar e Copiar Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </HomenzLayout>
  );
}
