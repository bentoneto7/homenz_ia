import { useState } from "react";
import {
  Calendar,
  Flame,
  Thermometer,
  Snowflake,
  Phone,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Activity,
  Minus,
} from "lucide-react";

export type SellerMetrics = {
  leads_assigned: number;
  leads_contacted: number;
  leads_scheduled: number;
  leads_confirmed: number;
  avg_response_minutes: number;
  conversion_rate: number;
  score: number;
  leads_followup_done?: number;
  leads_lost_no_contact?: number;
  leads_lost_no_followup?: number;
  followup_rate?: number;
  first_contact_rate?: number;
};

export type Seller = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  leadsAssigned: number;
  metrics: SellerMetrics | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSellerStatus(m: SellerMetrics | null): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  description: string;
} {
  if (!m)
    return {
      label: "Sem dados",
      color: "text-[#5A667A]",
      bg: "bg-white",
      border: "border-[#E2E8F0]",
      icon: <Minus className="w-3.5 h-3.5" />,
      description: "Nenhuma métrica registrada ainda",
    };

  const score = m.score;
  if (score >= 80)
    return {
      label: "Alta performance",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      description: "Abordagem rápida, boa conversão e follow-up consistente",
    };
  if (score >= 60)
    return {
      label: "Em desenvolvimento",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: <Activity className="w-3.5 h-3.5" />,
      description: "Bom ritmo, mas há espaço para melhorar follow-up",
    };
  return {
    label: "Precisa de atenção",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: "Tempo de resposta alto ou baixa taxa de follow-up",
  };
}

export function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function ResponseTimeBadge({ minutes }: { minutes: number }) {
  const isGood = minutes <= 10;
  const isOk = minutes <= 30;
  const color = isGood
    ? "text-emerald-400"
    : isOk
      ? "text-amber-400"
      : "text-red-400";
  const icon = isGood ? (
    <Zap className="w-3 h-3" />
  ) : isOk ? (
    <Clock className="w-3 h-3" />
  ) : (
    <AlertTriangle className="w-3 h-3" />
  );
  return (
    <span className={`flex items-center gap-1 font-black text-sm ${color}`}>
      {icon}
      {formatResponseTime(minutes)}
    </span>
  );
}

export function MiniBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1 bg-white/8 rounded-full overflow-hidden w-full">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function MetricPill({
  label,
  value,
  color = "text-[#0A2540]",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <span className={`font-black text-sm leading-none ${color}`}>
        {value}
      </span>
      <span className="text-[#A0AABB] text-[10px] leading-none text-center">
        {label}
      </span>
    </div>
  );
}

// ── Card de vendedor expandido ─────────────────────────────────────────────────

export function SellerCard({ seller, rank }: { seller: Seller; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const m = seller.metrics;
  const status = getSellerStatus(m);
  const initials = seller.name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("");

  const rankColors = [
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "bg-slate-400/20 text-slate-300 border-slate-400/30",
    "bg-orange-700/20 text-orange-500 border-orange-700/30",
  ];

  // Alertas automáticos
  const alerts: { text: string; type: "warn" | "danger" | "ok" }[] = [];
  if (m) {
    if (m.avg_response_minutes > 30)
      alerts.push({
        text: `Tempo de resposta alto: ${formatResponseTime(m.avg_response_minutes)}`,
        type: "danger",
      });
    if ((m.followup_rate ?? 100) < 70)
      alerts.push({
        text: `Follow-up abaixo de 70% (${m.followup_rate?.toFixed(0)}%)`,
        type: "warn",
      });
    if ((m.leads_lost_no_contact ?? 0) >= 3)
      alerts.push({
        text: `${m.leads_lost_no_contact} leads sem 1ª abordagem`,
        type: "danger",
      });
    if ((m.leads_lost_no_followup ?? 0) >= 3)
      alerts.push({
        text: `${m.leads_lost_no_followup} leads perdidos sem follow-up`,
        type: "warn",
      });
    if (m.conversion_rate >= 55 && m.avg_response_minutes <= 15)
      alerts.push({
        text: "Ótima combinação: resposta rápida + alta conversão",
        type: "ok",
      });
  }

  return (
    <div
      className={`bg-white border rounded-2xl overflow-hidden transition-all ${
        expanded
          ? "border-[#004A9D]/20"
          : "border-[#E2E8F0] hover:border-[#004A9D]/20"
      }`}
    >
      {/* Linha principal */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        {/* Rank */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm border ${
            rankColors[rank - 1] ??
            "bg-[#EBF4FF] text-[#5A667A] border-[#E2E8F0]"
          }`}
        >
          {rank}
        </div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>

        {/* Nome + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[#0A2540] font-semibold text-sm">
              {seller.name}
            </p>
            <span
              className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}
            >
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-[#5A667A] text-xs mt-0.5">
            {seller.leadsAssigned} leads atribuídos este mês
          </p>
        </div>

        {/* Métricas resumidas */}
        {m && (
          <div className="hidden sm:flex items-center gap-5 mr-2">
            <MetricPill
              label="agendados"
              value={m.leads_scheduled}
              color="text-[#0A2540]"
            />
            <MetricPill
              label="conversão"
              value={`${m.conversion_rate}%`}
              color={
                m.conversion_rate >= 55
                  ? "text-emerald-400"
                  : m.conversion_rate >= 40
                    ? "text-amber-400"
                    : "text-red-400"
              }
            />
            <div className="flex flex-col items-center gap-0.5">
              <ResponseTimeBadge minutes={m.avg_response_minutes} />
              <span className="text-[#A0AABB] text-[10px]">1ª resposta</span>
            </div>
            <MetricPill
              label="follow-up"
              value={`${m.followup_rate?.toFixed(0) ?? "—"}%`}
              color={
                (m.followup_rate ?? 0) >= 80
                  ? "text-emerald-400"
                  : (m.followup_rate ?? 0) >= 65
                    ? "text-amber-400"
                    : "text-red-400"
              }
            />
          </div>
        )}

        {/* Score + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {m && (
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                m.score >= 80
                  ? "bg-emerald-500/15 text-emerald-400"
                  : m.score >= 60
                    ? "bg-amber-500/15 text-amber-400"
                    : "bg-red-500/15 text-red-400"
              }`}
            >
              {m.score}
            </div>
          )}
          <ChevronRight
            className={`w-4 h-4 text-[#A0AABB] transition-transform ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Barra de score */}
      {m && (
        <div className="px-5 pb-1">
          <MiniBar
            value={m.score}
            max={100}
            color={
              m.score >= 80
                ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                : m.score >= 60
                  ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                  : "bg-gradient-to-r from-red-500 to-orange-400"
            }
          />
        </div>
      )}

      {/* Painel expandido */}
      {expanded && m && (
        <div className="px-5 pb-5 pt-4 border-t border-[#E2E8F0] mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Bloco 1: Abordagem */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#00C1B8]" />
                <p className="text-[#5A667A] text-xs font-bold uppercase tracking-wider">
                  Velocidade de Abordagem
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <ResponseTimeBadge minutes={m.avg_response_minutes} />
                  <p className="text-[#5A667A] text-xs mt-1">
                    tempo médio de 1ª resposta
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-black text-sm ${(m.first_contact_rate ?? 0) >= 85 ? "text-emerald-400" : (m.first_contact_rate ?? 0) >= 70 ? "text-amber-400" : "text-red-400"}`}
                  >
                    {m.first_contact_rate?.toFixed(0) ?? "—"}%
                  </p>
                  <p className="text-[#A0AABB] text-xs">leads abordados</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A667A]">Abordados</span>
                  <span className="text-[#0A2540] font-semibold">
                    {m.leads_contacted} / {m.leads_assigned}
                  </span>
                </div>
                <MiniBar
                  value={m.leads_contacted}
                  max={m.leads_assigned}
                  color="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]"
                />
                {(m.leads_lost_no_contact ?? 0) > 0 && (
                  <p className="text-red-400/80 text-[11px] flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {m.leads_lost_no_contact} lead
                    {(m.leads_lost_no_contact ?? 0) > 1 ? "s" : ""} sem
                    abordagem
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Follow-up */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <p className="text-[#5A667A] text-xs font-bold uppercase tracking-wider">
                  Follow-up
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={`font-black text-2xl leading-none ${(m.followup_rate ?? 0) >= 80 ? "text-emerald-400" : (m.followup_rate ?? 0) >= 65 ? "text-amber-400" : "text-red-400"}`}
                  >
                    {m.followup_rate?.toFixed(0) ?? "—"}%
                  </p>
                  <p className="text-[#5A667A] text-xs mt-1">
                    taxa de follow-up
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#0A2540] font-black text-sm">
                    {m.leads_followup_done ?? 0}
                  </p>
                  <p className="text-[#A0AABB] text-xs">follow-ups feitos</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A667A]">Recontatos</span>
                  <span className="text-[#0A2540] font-semibold">
                    {m.leads_followup_done ?? 0} / {m.leads_contacted}
                  </span>
                </div>
                <MiniBar
                  value={m.leads_followup_done ?? 0}
                  max={m.leads_contacted}
                  color="bg-gradient-to-r from-blue-500 to-cyan-400"
                />
                {(m.leads_lost_no_followup ?? 0) > 0 && (
                  <p className="text-amber-400/80 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {m.leads_lost_no_followup} lead
                    {(m.leads_lost_no_followup ?? 0) > 1 ? "s" : ""} perdido
                    {(m.leads_lost_no_followup ?? 0) > 1 ? "s" : ""} sem
                    recontato
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 3: Conversão */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-violet-400" />
                <p className="text-[#5A667A] text-xs font-bold uppercase tracking-wider">
                  Conversão em Agenda
                </p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p
                    className={`font-black text-2xl leading-none ${m.conversion_rate >= 55 ? "text-emerald-400" : m.conversion_rate >= 40 ? "text-amber-400" : "text-red-400"}`}
                  >
                    {m.conversion_rate}%
                  </p>
                  <p className="text-[#5A667A] text-xs mt-1">
                    leads → agendamento
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#0A2540] font-black text-sm">
                    {m.leads_confirmed}
                  </p>
                  <p className="text-[#A0AABB] text-xs">confirmados</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A667A]">Agendados</span>
                  <span className="text-[#0A2540] font-semibold">
                    {m.leads_scheduled} / {m.leads_assigned}
                  </span>
                </div>
                <MiniBar
                  value={m.leads_scheduled}
                  max={m.leads_assigned}
                  color="bg-gradient-to-r from-violet-500 to-purple-400"
                />
                <div className="flex justify-between text-[11px] text-[#5A667A] pt-0.5">
                  <span>Confirmados: {m.leads_confirmed}</span>
                  <span>
                    Pendentes: {m.leads_scheduled - m.leads_confirmed}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas automáticos */}
          {alerts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[#A0AABB] text-xs font-semibold uppercase tracking-wider">
                Diagnóstico automático
              </p>
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                    alert.type === "danger"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : alert.type === "warn"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  {alert.type === "danger" ? (
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  ) : alert.type === "warn" ? (
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  )}
                  {alert.text}
                </div>
              ))}
            </div>
          )}

          {/* Ação rápida */}
          <div className="mt-4 flex gap-2">
            <a
              href={`https://wa.me/${seller.phone?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
            >
              <Phone className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#5A667A] text-xs font-semibold hover:bg-[#EBF4FF] transition-colors border border-[#E2E8F0]">
              <MessageSquare className="w-3.5 h-3.5" />
              Dar feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Visão de saúde do time ────────────────────────────────────────────────────

export function TeamHealthPanel({ sellers }: { sellers: Seller[] }) {
  const withMetrics = sellers.filter(s => s.metrics);
  if (withMetrics.length === 0) return null;

  const avgResponse = Math.round(
    withMetrics.reduce(
      (a, s) => a + (s.metrics?.avg_response_minutes ?? 0),
      0
    ) / withMetrics.length
  );
  const avgConversion = Math.round(
    withMetrics.reduce((a, s) => a + (s.metrics?.conversion_rate ?? 0), 0) /
      withMetrics.length
  );
  const avgFollowup = Math.round(
    withMetrics.reduce((a, s) => a + (s.metrics?.followup_rate ?? 0), 0) /
      withMetrics.length
  );
  const totalLost = withMetrics.reduce(
    (a, s) =>
      a +
      (s.metrics?.leads_lost_no_contact ?? 0) +
      (s.metrics?.leads_lost_no_followup ?? 0),
    0
  );

  const healthScore = Math.round(
    (avgConversion / 60) * 40 +
      (Math.max(0, 60 - avgResponse) / 60) * 30 +
      (avgFollowup / 100) * 30
  );

  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00C1B8]" />
          <p className="text-[#0A2540] font-bold text-sm">
            Saúde do Time Comercial
          </p>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm ${
            healthScore >= 70
              ? "bg-emerald-500/15 text-emerald-400"
              : healthScore >= 50
                ? "bg-amber-500/15 text-amber-400"
                : "bg-red-500/15 text-red-400"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          {healthScore}/100
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <ResponseTimeBadge minutes={avgResponse} />
          <p className="text-[#5A667A] text-[11px] mt-1">
            tempo médio resposta
          </p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p
            className={`font-black text-sm ${avgConversion >= 50 ? "text-emerald-400" : avgConversion >= 35 ? "text-amber-400" : "text-red-400"}`}
          >
            {avgConversion}%
          </p>
          <p className="text-[#5A667A] text-[11px] mt-1">conversão média</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p
            className={`font-black text-sm ${avgFollowup >= 80 ? "text-emerald-400" : avgFollowup >= 65 ? "text-amber-400" : "text-red-400"}`}
          >
            {avgFollowup}%
          </p>
          <p className="text-[#5A667A] text-[11px] mt-1">taxa de follow-up</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p
            className={`font-black text-sm ${totalLost === 0 ? "text-emerald-400" : totalLost <= 3 ? "text-amber-400" : "text-red-400"}`}
          >
            {totalLost}
          </p>
          <p className="text-[#5A667A] text-[11px] mt-1">
            leads perdidos no mês
          </p>
        </div>
      </div>

      {totalLost > 4 && (
        <div className="mt-3 flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{totalLost} leads perdidos</strong> por falta de abordagem
            ou follow-up este mês. Considere uma reunião de alinhamento com o
            time.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

export function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:bg-white/8 transition-colors">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}
      >
        {icon}
      </div>
      <p className="text-2xl font-black text-[#0A2540]">{value}</p>
      <p className="text-sm text-[#5A667A] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#00C1B8] font-medium mt-1">{sub}</p>}
    </div>
  );
}

export function TemperatureIcon({ temp }: { temp: string }) {
  if (temp === "hot") return <Flame className="w-3.5 h-3.5 text-orange-400" />;
  if (temp === "warm")
    return <Thermometer className="w-3.5 h-3.5 text-amber-400" />;
  return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
}

export function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-400 bg-emerald-500/15"
      : score >= 50
        ? "text-amber-400 bg-amber-500/15"
        : "text-blue-400 bg-blue-500/15";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}
