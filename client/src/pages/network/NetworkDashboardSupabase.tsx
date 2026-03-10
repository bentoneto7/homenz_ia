import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Building2, Users, Target, Calendar,
  Award, Copy, Plus, Loader2,
} from "lucide-react";
import { toast } from "sonner";

function StatCard({
  label, value, sub, icon, color,
}: {
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
          <Loader2 className="w-8 h-8 text-[#14b8a6] animate-spin" />
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
            <h2 className="text-2xl font-black text-white">Rede Homenz</h2>
            <p className="text-white/50 text-sm mt-1">
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
          <StatCard label="Total de Leads" value={summary.totalLeads} sub="Toda a rede" icon={<Target className="w-5 h-5 text-white" />} color="bg-blue-500/20" />
          <StatCard label="Agendamentos" value={summary.totalScheduled} sub={`${summary.conversionRate}% conversão`} icon={<Calendar className="w-5 h-5 text-white" />} color="bg-emerald-500/20" />
          <StatCard label="Score Médio" value={summary.avgScore} sub="0–100 pts" icon={<Award className="w-5 h-5 text-white" />} color="bg-amber-500/20" />
          <StatCard label="Vendedores" value={summary.totalSellers} sub={`${summary.totalFranchises} franquias`} icon={<Users className="w-5 h-5 text-white" />} color="bg-violet-500/20" />
        </div>

        {/* Ranking de franquias */}
        <div>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-lg font-bold text-white">Ranking de Franquias</h3>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2 bg-[#14b8a6]/20 text-[#14b8a6] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#14b8a6]/30 transition-colors border border-[#14b8a6]/30"
            >
              <Plus className="w-4 h-4" />
              Convidar Franqueado
            </button>
          </div>

          {franchises.length === 0 ? (
            <div className="bg-white/5 border border-white/8 rounded-2xl p-8 text-center">
              <Building2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 font-medium">Nenhuma franquia cadastrada</p>
              <p className="text-white/20 text-sm mt-1">Execute a migração SQL no Supabase para ver os dados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...franchises]
                .sort((a, b) => b.avgScore - a.avgScore)
                .map((f, i) => (
                  <div key={f.id} className="bg-white/5 border border-white/8 rounded-2xl p-5 hover:bg-white/8 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                        i === 0 ? "bg-amber-500/20 text-amber-400" :
                        i === 1 ? "bg-slate-400/20 text-slate-300" :
                        i === 2 ? "bg-orange-700/20 text-orange-400" :
                        "bg-white/5 text-white/40"
                      }`}>{i + 1}</div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-white font-bold">{f.name}</p>
                          <span className="text-white/30 text-xs">{f.city}, {f.state}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-white/50 flex-wrap">
                          <span>{f.totalLeads} leads</span>
                          <span>{f.scheduledLeads} agendados</span>
                          <span>{f.sellersCount} vendedores</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-2xl font-black text-[#14b8a6]">{f.avgScore}</p>
                          <p className="text-white/30 text-xs">score</p>
                        </div>
                        <div className="hidden sm:flex gap-1">
                          <span className="text-xs text-orange-400 bg-orange-500/15 px-1.5 py-0.5 rounded-full">{f.hotLeads}🔥</span>
                          <span className="text-xs text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full">{f.warmLeads}🌡️</span>
                          <span className="text-xs text-blue-400 bg-blue-500/15 px-1.5 py-0.5 rounded-full">{f.coldLeads}❄️</span>
                        </div>
                        <button
                          onClick={() => handleCopyInvite(f.id)}
                          disabled={createInviteMutation.isPending}
                          className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-[#14b8a6] hover:bg-[#14b8a6]/10 transition-all"
                          title="Gerar link de convite"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
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
          <h3 className="text-lg font-bold text-white mb-4">Top Vendedores da Rede</h3>
          <div className="bg-white/5 border border-white/8 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-white/40 text-xs font-semibold uppercase tracking-wider px-5 py-3">#</th>
                  <th className="text-left text-white/40 text-xs font-semibold uppercase tracking-wider px-5 py-3">Vendedor</th>
                  <th className="text-left text-white/40 text-xs font-semibold uppercase tracking-wider px-5 py-3 hidden sm:table-cell">Franquia</th>
                  <th className="text-center text-white/40 text-xs font-semibold uppercase tracking-wider px-5 py-3">Leads</th>
                  <th className="text-center text-white/40 text-xs font-semibold uppercase tracking-wider px-5 py-3 hidden md:table-cell">Agendados</th>
                  <th className="text-center text-white/40 text-xs font-semibold uppercase tracking-wider px-5 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {topSellers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-white/30 text-sm">
                      Execute a migração SQL no Supabase para ver os dados
                    </td>
                  </tr>
                ) : (
                  topSellers.map((s, i) => (
                    <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/3 transition-colors">
                      <td className="px-5 py-4">
                        <span className={`font-black text-sm ${i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-white/30"}`}>{i + 1}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-bold">
                              {String(s.sellerName).split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                            </span>
                          </div>
                          <span className="text-white font-medium text-sm">{s.sellerName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span className="text-white/50 text-sm">{s.franchiseName}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-white font-semibold text-sm">{s.leads_assigned}</span>
                      </td>
                      <td className="px-5 py-4 text-center hidden md:table-cell">
                        <span className="text-emerald-400 font-semibold text-sm">{s.leads_scheduled}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5 bg-[#14b8a6]/15 text-[#14b8a6] text-sm font-black px-2.5 py-1 rounded-full">
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
            <div className="bg-[#0d1425] border border-white/10 rounded-3xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-2">Convidar Franqueado</h3>
              <p className="text-white/50 text-sm mb-6">Selecione a franquia para gerar o link de convite</p>
              <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
                {franchises.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFranchise(f.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      selectedFranchise === f.id ? "border-[#14b8a6]/50 bg-[#14b8a6]/10" : "border-white/10 bg-white/3 hover:bg-white/8"
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-white/50 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium text-sm">{f.name}</p>
                      <p className="text-white/40 text-xs">{f.city}, {f.state}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowInviteModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-medium">
                  Cancelar
                </button>
                <button
                  onClick={() => selectedFranchise && handleCopyInvite(selectedFranchise)}
                  disabled={!selectedFranchise || createInviteMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
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
