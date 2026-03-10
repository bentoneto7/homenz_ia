import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import {
  Target, Calendar, Users, Award, TrendingUp,
  Flame, Thermometer, Snowflake, Copy, Plus,
  Loader2, UserPlus, Phone, MessageSquare,
  ChevronRight, BarChart3, Clock, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, TrendingDown,
  Zap, Activity, ArrowUp, ArrowDown, Minus,
} from "lucide-react";
import { toast } from "sonner";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type SellerMetrics = {
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

type Seller = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  leadsAssigned: number;
  metrics: SellerMetrics | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSellerStatus(m: SellerMetrics | null): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  description: string;
} {
  if (!m) return {
    label: "Sem dados",
    color: "text-white/40",
    bg: "bg-white/5",
    border: "border-white/10",
    icon: <Minus className="w-3.5 h-3.5" />,
    description: "Nenhuma métrica registrada ainda",
  };

  const score = m.score;
  if (score >= 80) return {
    label: "Alta performance",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: "Abordagem rápida, boa conversão e follow-up consistente",
  };
  if (score >= 60) return {
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

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function ResponseTimeBadge({ minutes }: { minutes: number }) {
  const isGood = minutes <= 10;
  const isOk = minutes <= 30;
  const color = isGood ? "text-emerald-400" : isOk ? "text-amber-400" : "text-red-400";
  const icon = isGood ? <Zap className="w-3 h-3" /> : isOk ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />;
  return (
    <span className={`flex items-center gap-1 font-black text-sm ${color}`}>
      {icon}
      {formatResponseTime(minutes)}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1 bg-white/8 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MetricPill({ label, value, color = "text-white" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <span className={`font-black text-sm leading-none ${color}`}>{value}</span>
      <span className="text-white/30 text-[10px] leading-none text-center">{label}</span>
    </div>
  );
}

// ── Card de vendedor expandido ─────────────────────────────────────────────────

function SellerCard({ seller, rank }: { seller: Seller; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const m = seller.metrics;
  const status = getSellerStatus(m);
  const initials = seller.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const rankColors = [
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "bg-slate-400/20 text-slate-300 border-slate-400/30",
    "bg-orange-700/20 text-orange-500 border-orange-700/30",
  ];

  // Alertas automáticos
  const alerts: { text: string; type: "warn" | "danger" | "ok" }[] = [];
  if (m) {
    if (m.avg_response_minutes > 30) alerts.push({ text: `Tempo de resposta alto: ${formatResponseTime(m.avg_response_minutes)}`, type: "danger" });
    if ((m.followup_rate ?? 100) < 70) alerts.push({ text: `Follow-up abaixo de 70% (${m.followup_rate?.toFixed(0)}%)`, type: "warn" });
    if ((m.leads_lost_no_contact ?? 0) >= 3) alerts.push({ text: `${m.leads_lost_no_contact} leads sem 1ª abordagem`, type: "danger" });
    if ((m.leads_lost_no_followup ?? 0) >= 3) alerts.push({ text: `${m.leads_lost_no_followup} leads perdidos sem follow-up`, type: "warn" });
    if (m.conversion_rate >= 55 && m.avg_response_minutes <= 15) alerts.push({ text: "Ótima combinação: resposta rápida + alta conversão", type: "ok" });
  }

  return (
    <div className={`bg-white/[0.03] border rounded-2xl overflow-hidden transition-all ${
      expanded ? "border-white/15" : "border-white/8 hover:border-white/12"
    }`}>
      {/* Linha principal */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        {/* Rank */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm border ${
          rankColors[rank - 1] ?? "bg-white/10 text-white/50 border-white/10"
        }`}>{rank}</div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>

        {/* Nome + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm">{seller.name}</p>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-white/35 text-xs mt-0.5">{seller.leadsAssigned} leads atribuídos este mês</p>
        </div>

        {/* Métricas resumidas */}
        {m && (
          <div className="hidden sm:flex items-center gap-5 mr-2">
            <MetricPill label="agendados" value={m.leads_scheduled} color="text-white" />
            <MetricPill label="conversão" value={`${m.conversion_rate}%`} color={m.conversion_rate >= 55 ? "text-emerald-400" : m.conversion_rate >= 40 ? "text-amber-400" : "text-red-400"} />
            <div className="flex flex-col items-center gap-0.5">
              <ResponseTimeBadge minutes={m.avg_response_minutes} />
              <span className="text-white/30 text-[10px]">1ª resposta</span>
            </div>
            <MetricPill label="follow-up" value={`${m.followup_rate?.toFixed(0) ?? "—"}%`} color={(m.followup_rate ?? 0) >= 80 ? "text-emerald-400" : (m.followup_rate ?? 0) >= 65 ? "text-amber-400" : "text-red-400"} />
          </div>
        )}

        {/* Score + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {m && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
              m.score >= 80 ? "bg-emerald-500/15 text-emerald-400" :
              m.score >= 60 ? "bg-amber-500/15 text-amber-400" :
              "bg-red-500/15 text-red-400"
            }`}>{m.score}</div>
          )}
          <ChevronRight className={`w-4 h-4 text-white/30 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Barra de score */}
      {m && (
        <div className="px-5 pb-1">
          <MiniBar value={m.score} max={100} color={
            m.score >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
            m.score >= 60 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
            "bg-gradient-to-r from-red-500 to-orange-400"
          } />
        </div>
      )}

      {/* Painel expandido */}
      {expanded && m && (
        <div className="px-5 pb-5 pt-4 border-t border-white/8 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Bloco 1: Abordagem */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#14b8a6]" />
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Velocidade de Abordagem</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <ResponseTimeBadge minutes={m.avg_response_minutes} />
                  <p className="text-white/40 text-xs mt-1">tempo médio de 1ª resposta</p>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${(m.first_contact_rate ?? 0) >= 85 ? "text-emerald-400" : (m.first_contact_rate ?? 0) >= 70 ? "text-amber-400" : "text-red-400"}`}>
                    {m.first_contact_rate?.toFixed(0) ?? "—"}%
                  </p>
                  <p className="text-white/30 text-xs">leads abordados</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Abordados</span>
                  <span className="text-white font-semibold">{m.leads_contacted} / {m.leads_assigned}</span>
                </div>
                <MiniBar value={m.leads_contacted} max={m.leads_assigned} color="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]" />
                {(m.leads_lost_no_contact ?? 0) > 0 && (
                  <p className="text-red-400/80 text-[11px] flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {m.leads_lost_no_contact} lead{(m.leads_lost_no_contact ?? 0) > 1 ? "s" : ""} sem abordagem
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Follow-up */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Follow-up</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`font-black text-2xl leading-none ${(m.followup_rate ?? 0) >= 80 ? "text-emerald-400" : (m.followup_rate ?? 0) >= 65 ? "text-amber-400" : "text-red-400"}`}>
                    {m.followup_rate?.toFixed(0) ?? "—"}%
                  </p>
                  <p className="text-white/40 text-xs mt-1">taxa de follow-up</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-sm">{m.leads_followup_done ?? 0}</p>
                  <p className="text-white/30 text-xs">follow-ups feitos</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Recontatos</span>
                  <span className="text-white font-semibold">{m.leads_followup_done ?? 0} / {m.leads_contacted}</span>
                </div>
                <MiniBar value={m.leads_followup_done ?? 0} max={m.leads_contacted} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
                {(m.leads_lost_no_followup ?? 0) > 0 && (
                  <p className="text-amber-400/80 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {m.leads_lost_no_followup} lead{(m.leads_lost_no_followup ?? 0) > 1 ? "s" : ""} perdido{(m.leads_lost_no_followup ?? 0) > 1 ? "s" : ""} sem recontato
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 3: Conversão */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-violet-400" />
                <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Conversão em Agenda</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`font-black text-2xl leading-none ${m.conversion_rate >= 55 ? "text-emerald-400" : m.conversion_rate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {m.conversion_rate}%
                  </p>
                  <p className="text-white/40 text-xs mt-1">leads → agendamento</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-black text-sm">{m.leads_confirmed}</p>
                  <p className="text-white/30 text-xs">confirmados</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Agendados</span>
                  <span className="text-white font-semibold">{m.leads_scheduled} / {m.leads_assigned}</span>
                </div>
                <MiniBar value={m.leads_scheduled} max={m.leads_assigned} color="bg-gradient-to-r from-violet-500 to-purple-400" />
                <div className="flex justify-between text-[11px] text-white/40 pt-0.5">
                  <span>Confirmados: {m.leads_confirmed}</span>
                  <span>Pendentes: {m.leads_scheduled - m.leads_confirmed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas automáticos */}
          {alerts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-white/30 text-xs font-semibold uppercase tracking-wider">Diagnóstico automático</p>
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                  alert.type === "danger" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                  alert.type === "warn" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {alert.type === "danger" ? <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
                   alert.type === "warn" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
                   <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
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
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/50 text-xs font-semibold hover:bg-white/10 transition-colors border border-white/10">
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

function TeamHealthPanel({ sellers }: { sellers: Seller[] }) {
  const withMetrics = sellers.filter((s) => s.metrics);
  if (withMetrics.length === 0) return null;

  const avgResponse = Math.round(withMetrics.reduce((a, s) => a + (s.metrics?.avg_response_minutes ?? 0), 0) / withMetrics.length);
  const avgConversion = Math.round(withMetrics.reduce((a, s) => a + (s.metrics?.conversion_rate ?? 0), 0) / withMetrics.length);
  const avgFollowup = Math.round(withMetrics.reduce((a, s) => a + (s.metrics?.followup_rate ?? 0), 0) / withMetrics.length);
  const totalLost = withMetrics.reduce((a, s) => a + (s.metrics?.leads_lost_no_contact ?? 0) + (s.metrics?.leads_lost_no_followup ?? 0), 0);

  const healthScore = Math.round(
    (avgConversion / 60) * 40 +
    (Math.max(0, 60 - avgResponse) / 60) * 30 +
    (avgFollowup / 100) * 30
  );

  return (
    <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#14b8a6]" />
          <p className="text-white font-bold text-sm">Saúde do Time Comercial</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm ${
          healthScore >= 70 ? "bg-emerald-500/15 text-emerald-400" :
          healthScore >= 50 ? "bg-amber-500/15 text-amber-400" :
          "bg-red-500/15 text-red-400"
        }`}>
          <BarChart3 className="w-4 h-4" />
          {healthScore}/100
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <ResponseTimeBadge minutes={avgResponse} />
          <p className="text-white/35 text-[11px] mt-1">tempo médio resposta</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className={`font-black text-sm ${avgConversion >= 50 ? "text-emerald-400" : avgConversion >= 35 ? "text-amber-400" : "text-red-400"}`}>
            {avgConversion}%
          </p>
          <p className="text-white/35 text-[11px] mt-1">conversão média</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className={`font-black text-sm ${avgFollowup >= 80 ? "text-emerald-400" : avgFollowup >= 65 ? "text-amber-400" : "text-red-400"}`}>
            {avgFollowup}%
          </p>
          <p className="text-white/35 text-[11px] mt-1">taxa de follow-up</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className={`font-black text-sm ${totalLost === 0 ? "text-emerald-400" : totalLost <= 3 ? "text-amber-400" : "text-red-400"}`}>
            {totalLost}
          </p>
          <p className="text-white/35 text-[11px] mt-1">leads perdidos no mês</p>
        </div>
      </div>

      {totalLost > 4 && (
        <div className="mt-3 flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{totalLost} leads perdidos</strong> por falta de abordagem ou follow-up este mês. Considere uma reunião de alinhamento com o time.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

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
  const [activeTab, setActiveTab] = useState<"leads" | "sellers" | "funnel">("sellers");

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
            {(["sellers", "leads", "funnel"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
                }`}
              >
                {tab === "leads" ? "Leads Recentes" : tab === "sellers" ? "Time Comercial" : "Funil"}
              </button>
            ))}
          </div>

          {/* Tab: Time Comercial */}
          {activeTab === "sellers" && (
            <div>
              <TeamHealthPanel sellers={sellers as Seller[]} />
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
                  sellers.map((seller, i) => (
                    <SellerCard key={seller.id} seller={seller as Seller} rank={i + 1} />
                  ))
                )}
              </div>

              {/* Legenda de métricas */}
              {sellers.length > 0 && (
                <div className="mt-4 bg-white/[0.02] border border-white/6 rounded-xl p-4">
                  <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Como interpretar as métricas</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-white/40">
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#14b8a6] flex-shrink-0 mt-0.5" />
                      <span><strong className="text-white/60">1ª Resposta:</strong> ideal abaixo de 10min. Acima de 30min o lead esfria significativamente.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="text-white/60">Follow-up:</strong> recontato após 24h sem resposta. Acima de 80% é excelente.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="text-white/60">Conversão:</strong> % de leads que viraram agendamento. Acima de 55% é referência de mercado.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

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
                          {lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
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
