import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { FUNNEL_STEP_LABELS, FUNNEL_STEP_ORDER, type FunnelStep } from "@/lib/leadTemperature";
import {
  TrendingUp, Users, Calendar, Target, AlertTriangle,
  BarChart3, ArrowRight, Clock, CheckCircle2,
} from "lucide-react";

function StatCard({
  icon, label, value, sub, color = "text-white",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-2">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-xs uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

const PERIOD_OPTIONS = [
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
];

export default function Analytics() {
  const [period, setPeriod] = useState(30);

  const startDate = Date.now() - period * 24 * 60 * 60 * 1000;
  const endDate = Date.now();

  const { data: analytics, isLoading } = trpc.journey.funnelAnalytics.useQuery(
    { startDate, endDate },
    { refetchInterval: 60_000 }
  );

  // Montar o funil de conversão com os dados reais
  const funnelSteps: FunnelStep[] = [
    "form_done", "chat_done", "photos_done", "ai_done", "scheduled", "confirmed", "completed",
  ];

  const stepData = funnelSteps.map((step) => {
    const found = analytics?.byStep.find((s: { step: string; count: number }) => s.step === step);
    return { step, count: found?.count ?? 0 };
  });

  const maxCount = Math.max(...stepData.map((s) => s.count), 1);

  // Cores do funil (degradê de quente para frio)
  const funnelColors = [
    "bg-orange-500", "bg-amber-500", "bg-yellow-500",
    "bg-lime-500", "bg-emerald-500", "bg-teal-500", "bg-cyan-500",
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics do Funil</h1>
            <p className="text-slate-400 text-sm mt-1">
              Dados de conversão, abandono e performance da clínica
            </p>
          </div>
          {/* Seletor de período */}
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                onClick={() => setPeriod(opt.days)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  period === opt.days
                    ? "bg-amber-500 text-black"
                    : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400" />
          </div>
        ) : (
          <>
            {/* KPIs principais */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-4 h-4" />}
                label="Total de Leads"
                value={analytics?.totalLeads ?? 0}
                sub={`últimos ${period} dias`}
                color="text-white"
              />
              <StatCard
                icon={<Target className="w-4 h-4" />}
                label="Taxa de Conversão"
                value={`${analytics?.conversionRate ?? 0}%`}
                sub="leads → agendamentos"
                color={
                  (analytics?.conversionRate ?? 0) >= 20
                    ? "text-emerald-400"
                    : (analytics?.conversionRate ?? 0) >= 10
                    ? "text-yellow-400"
                    : "text-red-400"
                }
              />
              <StatCard
                icon={<Calendar className="w-4 h-4" />}
                label="Agendamentos"
                value={analytics?.appointments.total ?? 0}
                sub={`${analytics?.appointments.confirmed ?? 0} confirmados`}
                color="text-blue-400"
              />
              <StatCard
                icon={<AlertTriangle className="w-4 h-4" />}
                label="Leads Abandonados"
                value={analytics?.abandonedCount ?? 0}
                sub="precisam de recuperação"
                color="text-orange-400"
              />
            </div>

            {/* Funil de conversão visual */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Funil de Conversão por Etapa</h2>
              </div>
              <p className="text-xs text-slate-500">
                Quantos leads chegaram em cada etapa — identifique onde o funil quebra
              </p>

              <div className="space-y-3">
                {stepData.map((item, idx) => {
                  const pct = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
                  const prevCount = idx > 0 ? (stepData[idx - 1]?.count ?? 0) : item.count;
                  const dropRate = prevCount > 0 && idx > 0
                    ? Math.round(((prevCount - item.count) / prevCount) * 100)
                    : 0;

                  return (
                    <div key={item.step} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 w-32 truncate">
                            {FUNNEL_STEP_LABELS[item.step] ?? item.step}
                          </span>
                          {idx > 0 && dropRate > 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              dropRate > 50 ? "bg-red-500/20 text-red-400" :
                              dropRate > 25 ? "bg-orange-500/20 text-orange-400" :
                              "bg-yellow-500/20 text-yellow-400"
                            }`}>
                              -{dropRate}% abandono
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-white">{item.count}</span>
                      </div>
                      <div className="h-6 bg-slate-800 rounded-lg overflow-hidden">
                        <div
                          className={`h-full ${funnelColors[idx]} rounded-lg transition-all duration-700 flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        >
                          {pct > 15 && (
                            <span className="text-xs font-bold text-white">{pct}%</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Agendamentos por status */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base font-bold text-white">Agendamentos</h2>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Criados", value: analytics?.appointments.total ?? 0, color: "bg-blue-500" },
                    { label: "Confirmados", value: analytics?.appointments.confirmed ?? 0, color: "bg-emerald-500" },
                    { label: "Realizados", value: analytics?.appointments.completed ?? 0, color: "bg-teal-500" },
                    { label: "Cancelados", value: analytics?.appointments.cancelled ?? 0, color: "bg-red-500" },
                    { label: "No-show", value: analytics?.appointments.noShow ?? 0, color: "bg-orange-500" },
                  ].map((item) => {
                    const total = analytics?.appointments.total ?? 1;
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="text-sm text-slate-400 w-24">{item.label}</span>
                        <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-white w-8 text-right">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Taxa de comparecimento */}
                {(analytics?.appointments.total ?? 0) > 0 && (
                  <div className="pt-3 border-t border-slate-700/50">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Taxa de comparecimento</span>
                      <span className="font-bold text-emerald-400">
                        {Math.round(
                          ((analytics?.appointments.completed ?? 0) /
                            Math.max(analytics?.appointments.confirmed ?? 1, 1)) * 100
                        )}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Origem dos leads (UTM) */}
              <div className="rounded-2xl border border-slate-700/50 bg-slate-800/20 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-white">Origem dos Leads</h2>
                </div>
                {(!analytics?.bySource || analytics.bySource.length === 0) ? (
                  <p className="text-slate-500 text-sm text-center py-4">
                    Nenhum dado de UTM disponível ainda
                  </p>
                ) : (
                  <div className="space-y-3">
                    {analytics.bySource.slice(0, 8).map((item: { source: string; count: number }) => {
                      const total = analytics.totalLeads || 1;
                      const pct = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.source} className="flex items-center gap-3">
                          <span className="text-sm text-slate-400 w-24 truncate capitalize">
                            {item.source === "null" || !item.source ? "Direto" : item.source}
                          </span>
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-bold text-white w-8 text-right">{item.count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Insights automáticos */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold text-white">Insights Automáticos</h2>
              </div>
              <div className="space-y-3">
                {/* Insight de conversão */}
                {(analytics?.conversionRate ?? 0) < 10 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-red-300">Taxa de conversão baixa ({analytics?.conversionRate ?? 0}%)</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        A média do setor é 15-25%. Revise o copywriting do chat e a qualidade das fotos para melhorar o resultado da IA.
                      </p>
                    </div>
                  </div>
                )}

                {/* Insight de abandono */}
                {(analytics?.abandonedCount ?? 0) > 5 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                    <Clock className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-orange-300">
                        {analytics?.abandonedCount} leads precisam de recuperação
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Acesse a página de Recuperação e contate esses leads agora — cada hora que passa reduz a chance de conversão em 20%.
                      </p>
                    </div>
                  </div>
                )}

                {/* Insight positivo */}
                {(analytics?.conversionRate ?? 0) >= 20 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-300">Excelente taxa de conversão!</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Sua clínica está acima da média do setor. Continue com a mesma abordagem e considere aumentar o investimento em tráfego.
                      </p>
                    </div>
                  </div>
                )}

                {/* Insight padrão */}
                {(analytics?.totalLeads ?? 0) === 0 && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-700/30 border border-slate-600/30">
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-slate-300">Nenhum lead no período selecionado</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Compartilhe o link da sua clínica nos anúncios para começar a captar leads.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
