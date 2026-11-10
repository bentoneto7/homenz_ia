import {
  Target,
  MessageSquare,
  CheckCircle2,
  Camera,
  Sparkles,
  CalendarCheck,
  TrendingUp,
  Eye,
  Trophy,
  Crown,
  BarChart3,
  Globe,
} from "lucide-react";

// ── Tipos do que o backend (franchiseeStats.analytics) entrega ────────────────
export type FranchiseeAnalytics = {
  leadsRecebidos: number;
  chatsIniciados: number;
  chatsConcluidos: number;
  fotosEnviadas: number;
  iaProcessadas: number;
  agendamentos: number;
  conversionRate: number;
  totalViews: number;
  champion: { id: string; name: string; assigned: number; scheduled: number; won: number; conversion: number } | null;
  sellerPerformance: { id: string; name: string; assigned: number; scheduled: number; won: number; conversion: number }[];
  pages: { slug: string; title: string; views: number; leads: number; scheduled: number; conversion: number }[];
  topPage: { slug: string; title: string; views: number; leads: number; scheduled: number; conversion: number } | null;
};

export type FunnelStep = { step: string; key: string; count: number; pct: number };

// ── Card de métrica ───────────────────────────────────────────────────────────
function Metric({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tint: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${tint}`}>{icon}</div>
      <p className="text-2xl font-black text-[#0A2540] leading-none">{value}</p>
      <p className="text-xs text-[#5A667A] mt-1">{label}</p>
      {sub && <p className="text-[11px] text-[#00C1B8] font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function FranchiseeAnalyticsTab({
  analytics,
  funnel,
}: {
  analytics: FranchiseeAnalytics;
  funnel: FunnelStep[];
}) {
  const a = analytics;
  const ranked = a.sellerPerformance.filter((s) => s.assigned > 0);

  return (
    <div className="space-y-6">
      {/* ── Métricas-chave ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric
          icon={<Target className="w-5 h-5 text-[#004A9D]" />}
          label="Leads recebidos"
          value={a.leadsRecebidos}
          tint="bg-blue-500/15"
        />
        <Metric
          icon={<MessageSquare className="w-5 h-5 text-violet-600" />}
          label="Chats iniciados"
          value={a.chatsIniciados}
          sub={a.leadsRecebidos > 0 ? `${Math.round((a.chatsIniciados / a.leadsRecebidos) * 100)}% dos leads` : undefined}
          tint="bg-violet-500/15"
        />
        <Metric
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          label="Chats concluídos"
          value={a.chatsConcluidos}
          tint="bg-emerald-500/15"
        />
        <Metric
          icon={<Camera className="w-5 h-5 text-amber-600" />}
          label="Fotos enviadas"
          value={a.fotosEnviadas}
          tint="bg-amber-500/15"
        />
        <Metric
          icon={<Sparkles className="w-5 h-5 text-[#00C1B8]" />}
          label="Fotos processadas (IA)"
          value={a.iaProcessadas}
          tint="bg-teal-500/15"
        />
        <Metric
          icon={<CalendarCheck className="w-5 h-5 text-emerald-600" />}
          label="Agendamentos"
          value={a.agendamentos}
          tint="bg-emerald-500/15"
        />
        <Metric
          icon={<TrendingUp className="w-5 h-5 text-[#004A9D]" />}
          label="Conversão (lead → agenda)"
          value={`${a.conversionRate}%`}
          tint="bg-blue-500/15"
        />
        <Metric
          icon={<Eye className="w-5 h-5 text-[#5A667A]" />}
          label="Visualizações de página"
          value={a.totalViews}
          tint="bg-[#EEF2F6]"
        />
      </div>

      {/* ── Vendedor campeão + página campeã ───────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Vendedor campeão */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700">Vendedor campeão</p>
          </div>
          {a.champion ? (
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                {initials(a.champion.name)}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-[#0A2540] truncate">{a.champion.name}</p>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="font-bold text-emerald-600">{a.champion.scheduled} agendados</span>
                  <span className="text-[#94A3B8]">·</span>
                  <span className="font-bold text-[#004A9D]">{a.champion.conversion}% conversão</span>
                </div>
                <p className="text-xs text-[#5A667A] mt-0.5">{a.champion.assigned} leads atribuídos</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8]">Sem leads atribuídos ainda.</p>
          )}
        </div>

        {/* Página com maior conversão */}
        <div className="rounded-2xl p-5 bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-[#004A9D]" />
            <p className="text-xs font-bold uppercase tracking-wider text-[#004A9D]">Página com maior conversão</p>
          </div>
          {a.topPage ? (
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                <p className="text-base font-black text-[#0A2540] truncate">{a.topPage.title}</p>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm">
                <span className="font-bold text-[#0A2540]">{a.topPage.leads} leads</span>
                <span className="text-[#94A3B8]">·</span>
                <span className="font-bold text-[#004A9D]">{a.topPage.conversion}% das visitas</span>
              </div>
              <p className="text-xs text-[#5A667A] mt-0.5">{a.topPage.views} visualizações</p>
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8]">Nenhuma página de captação ativa.</p>
          )}
        </div>
      </div>

      {/* ── Conversão por vendedor ─────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-[#00C1B8]" />
          <h4 className="text-[#0A2540] font-bold text-sm">Conversão por vendedor</h4>
        </div>
        {ranked.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">Nenhum vendedor com leads atribuídos ainda.</p>
        ) : (
          <div className="space-y-3">
            {ranked.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-[#EEF2F6] text-[#5A667A]"
                }`}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-[#0A2540] truncate">{s.name}</span>
                    <span className="text-xs text-[#5A667A] flex-shrink-0">
                      <span className="font-bold text-emerald-600">{s.scheduled}</span>/{s.assigned} · <span className="font-bold text-[#004A9D]">{s.conversion}%</span>
                    </span>
                  </div>
                  <div className="h-2 bg-[#EEF2F6] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#004A9D] to-[#00C1B8] transition-all"
                      style={{ width: `${Math.min(100, s.conversion)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Funil de conversão ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
        <h4 className="text-[#0A2540] font-bold text-sm mb-4">Funil de conversão</h4>
        <div className="space-y-3">
          {funnel.map((step, i) => {
            const t = funnel.length > 1 ? i / (funnel.length - 1) : 0;
            const barColor = `rgb(0, ${Math.round(74 + t * 119)}, ${Math.round(157 + t * 27)})`;
            return (
              <div key={step.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[#374151] text-sm font-medium">{step.step}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#0A2540] font-bold text-sm">{step.count}</span>
                    <span className="text-[#5A667A] text-xs">({step.pct}%)</span>
                  </div>
                </div>
                <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${step.pct}%`, background: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Desempenho por página de captação ──────────────────────────────── */}
      {a.pages.length > 0 && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-[#00C1B8]" />
            <h4 className="text-[#0A2540] font-bold text-sm">Páginas de captação</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#94A3B8] border-b border-[#EEF2F6]">
                  <th className="pb-2 font-semibold">Página</th>
                  <th className="pb-2 font-semibold text-right">Visitas</th>
                  <th className="pb-2 font-semibold text-right">Leads</th>
                  <th className="pb-2 font-semibold text-right">Agendados</th>
                  <th className="pb-2 font-semibold text-right">Conversão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F4F8]">
                {a.pages.map((p) => (
                  <tr key={p.slug}>
                    <td className="py-2.5 pr-2 text-[#0A2540] font-medium truncate max-w-[200px]">{p.title}</td>
                    <td className="py-2.5 text-right text-[#5A667A]">{p.views}</td>
                    <td className="py-2.5 text-right text-[#0A2540] font-semibold">{p.leads}</td>
                    <td className="py-2.5 text-right text-emerald-600 font-semibold">{p.scheduled}</td>
                    <td className="py-2.5 text-right">
                      <span className={`font-bold ${p.conversion >= 5 ? "text-emerald-600" : p.conversion >= 2 ? "text-amber-600" : "text-[#5A667A]"}`}>
                        {p.conversion}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
