import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import { funnelStepLabel } from "@/lib/leadTemperature";
import HomenzLayout from "@/components/HomenzLayout";
import TrialExpiredGate from "@/components/TrialExpiredGate";
import CalendarTab from "@/components/CalendarTab";
import {
  Target,
  Calendar,
  CalendarCheck,
  Users,
  Award,
  TrendingUp,
  Flame,
  Thermometer,
  Snowflake,
  Copy,
  Plus,
  Loader2,
  UserPlus,
  Phone,
  MessageSquare,
  ChevronRight,
  BarChart3,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  Zap,
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Link2,
  ExternalLink,
  QrCode,
  Globe,
  Smartphone,
  Eye,
  MousePointerClick,
  Share2,
  MapPin,
  Settings,
  Info,
  CheckCircle,
  EyeOff,
  BarChart2,
  Timer,
  CreditCard,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { FranchiseeSettingsTab } from "./FranchiseeSettingsTab";
import { LandingPagesTab } from "./LandingPagesTab";
import { PixelTab } from "./PixelTab";
import { FranchiseeKanbanTab, type KanbanLead } from "./FranchiseeKanbanTab";
import { FranchiseeAnalyticsTab, type FranchiseeAnalytics } from "./FranchiseeAnalyticsTab";
import {
  SellerCard,
  TeamHealthPanel,
  StatCard,
  TemperatureIcon,
  ScoreBadge,
  type Seller,
} from "./SellerComponents";

// Extrai as respostas do quiz de chat_answers para exibição legível na ficha do lead
function getLeadAnswers(
  chatAnswers?: Record<string, unknown>
): { label: string; value: string }[] {
  if (!chatAnswers) return [];
  const summary = chatAnswers.summary;
  // Formato atual: { summary: "Problema principal: X\nRegião afetada: Y\n..." }
  if (typeof summary === "string" && summary.trim()) {
    return summary
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const idx = line.indexOf(":");
        return idx === -1
          ? { label: "", value: line }
          : { label: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() };
      });
  }
  // Fallback: pares chave/valor crus
  return Object.entries(chatAnswers)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]) => ({ label: k, value: String(v) }));
}

export default function FranchiseeDashboard() {
  const [locationPath, navigate] = useLocation();
  const { user, isFranchisee, isOwner, loading: authLoading } = useHomenzAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(
    null
  );
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  // Sincronizar aba com a rota atual.
  // "analytics" = aba de métricas/funil (nome padronizado, antes era "funnel" no
  // inline e "Analytics" no menu — agora é Analytics em todo lugar). "kanban" =
  // novo board de Desempenho (status + quem atende).
  type FranchiseeTab =
    | "leads"
    | "sellers"
    | "kanban"
    | "analytics"
    | "landing"
    | "calendar"
    | "pixel"
    | "settings";
  const routeToTab: Record<string, FranchiseeTab> = {
    "/franqueado": "sellers",
    "/franqueado/vendedores": "sellers",
    "/franqueado/leads": "leads",
    "/franqueado/desempenho": "kanban",
    "/franqueado/agendamentos": "calendar",
    "/franqueado/analytics": "analytics",
    "/franqueado/configuracoes": "settings",
    "/franqueado/landing-pages": "landing",
    "/franqueado/pixel": "pixel",
  };
  // Aba ativa derivada da rota — reativa a mudanças de URL pelo menu lateral
  const activeTabFromRoute = useMemo(
    () => routeToTab[locationPath as string] ?? "sellers",
    [locationPath]
  );
  // activeTab derivado 100% da rota — menu lateral e tabs inline sincronizados
  const activeTab = activeTabFromRoute;
  const setActiveTab = (tab: FranchiseeTab) => {
    const tabToRoute: Record<FranchiseeTab, string> = {
      sellers: "/franqueado/vendedores",
      leads: "/franqueado/leads",
      kanban: "/franqueado/desempenho",
      analytics: "/franqueado/analytics",
      calendar: "/franqueado/agendamentos",
      landing: "/franqueado/landing-pages",
      pixel: "/franqueado/pixel",
      settings: "/franqueado/configuracoes",
    };
    navigate(tabToRoute[tab] ?? "/franqueado");
  };

  const statsQuery = trpc.homenz.franchiseeStats.useQuery(undefined, {
    enabled: isFranchisee || isOwner,
    refetchInterval: 5000,
  });

  // MUST be declared before any conditional returns to comply with React hooks rules
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  // Detectar redirecionamento pós-pagamento Stripe
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(
    () => searchParams.get("pagamento") === "sucesso"
  );

  const createInviteMutation = trpc.homenz.createSellerInvite.useMutation({
    onSuccess: data => {
      setGeneratedInviteUrl(data.inviteUrl);
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      toast.success("Link de convite gerado! Copie e envie ao vendedor.");
    },
    onError: err => toast.error(err.message),
  });

  // Auth guard is handled by ProtectedRoute in App.tsx — no navigate() in render
  if (!authLoading && (!user || user.role === "seller")) {
    return null;
  }

  if (authLoading || statsQuery.isLoading) {
    return (
      <HomenzLayout title="Dashboard Franqueado">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#00C1B8] animate-spin" />
        </div>
      </HomenzLayout>
    );
  }

  const data = statsQuery.data;
  if (!data) {
    return (
      <HomenzLayout title="Dashboard Franqueado">
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <p className="text-[#5A667A]">Nenhum dado disponível</p>
          <p className="text-[#C0CADB] text-sm">
            Execute a migração SQL no Supabase
          </p>
        </div>
      </HomenzLayout>
    );
  }

  const { franchise, leads, sellers, stats, funnel, trial } = data;
  // Novos no payload (#14/#15): allLeads = todos os leads p/ o kanban; analytics =
  // métricas da franquia. Acesso tolerante caso um deploy antigo do server não os envie.
  const allLeads = ((data as { allLeads?: KanbanLead[] }).allLeads ?? []) as KanbanLead[];
  const analytics = (data as { analytics?: FranchiseeAnalytics }).analytics ?? null;

  // Bloquear acesso se trial expirou e não tem plano pago
  // hasPaidPlan = true libera o painel mesmo com trial expirado (assinante pago via Stripe)
  // trial.active = false + daysLeft = 0 + hasPaidPlan = false = bloqueado
  const trialExpired =
    trial &&
    !trial.active &&
    trial.endsAt !== null &&
    (trial.daysLeft ?? 0) <= 0 &&
    !trial.hasPaidPlan;
  if (trialExpired) {
    return <TrialExpiredGate />;
  }

  return (
    <HomenzLayout title={franchise?.name ?? "Dashboard Franqueado"}>
      {/* Modal de Sucesso Pós-Pagamento */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative animate-in fade-in zoom-in-95 duration-300">
            {/* Fechar */}
            <button
              onClick={() => {
                setShowPaymentSuccess(false);
                // Limpar o parâmetro da URL sem recarregar
                window.history.replaceState({}, "", window.location.pathname);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ícone animado */}
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-[#004A9D] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-black text-[#0A2540] mb-2">
              Bem-vindo ao plano{" "}
              {((franchise?.plan ?? "Pro") as string).toUpperCase()}!
            </h2>
            <p className="text-[#5A667A] text-sm mb-6">
              Seu pagamento foi confirmado. O painel está totalmente liberado.
            </p>

            {/* Benefícios do plano */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-5 mb-6 text-left space-y-3">
              <p className="text-xs font-bold text-[#004A9D] uppercase tracking-wide mb-2">
                O que você desbloqueou
              </p>
              {[
                { Icon: Target, text: "Funil de diagnóstico capilar com IA" },
                { Icon: BarChart3, text: "Painel de leads em tempo real" },
                { Icon: Users, text: "Gestão completa de vendedores" },
                { Icon: Globe, text: "Landing pages ilimitadas de captação" },
                { Icon: Thermometer, text: "Alertas de temperatura de lead" },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/70 text-[#00C1B8]">
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-sm text-[#0A2540] font-medium">
                    {text}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => {
                setShowPaymentSuccess(false);
                window.history.replaceState({}, "", window.location.pathname);
              }}
              className="w-full bg-[#00C1B8] text-[#0A2540] font-bold py-3 rounded-xl hover:bg-[#00a89f] transition-colors"
            >
              Começar agora
            </button>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A2540]">
              {franchise?.name ?? "Minha Franquia"}
            </h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-[#5A667A] text-sm">
                {franchise?.city}, {franchise?.state}
              </p>
              {franchise?.plan && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#004A9D]">
                  Plano {(franchise.plan as string).toUpperCase()}
                </span>
              )}
              <span className="text-[#5A667A] text-sm">
                · {sellers.length}/
                {(() => {
                  const p = franchise?.plan as string | undefined;
                  return p === "pro"
                    ? 10
                    : p === "enterprise" || p === "network"
                      ? "∞"
                      : 2;
                })()}{" "}
                vendedores
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-teal-50 text-[#00C1B8] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00C1B8]/30 transition-colors border border-[#14b8a6]/30"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Vendedor
          </button>
        </div>

        {/* Banner de Trial */}
        {trial?.active && trial.daysLeft !== null && !trialBannerDismissed && (
          <div
            className={`relative rounded-2xl p-4 flex items-center gap-4 flex-wrap ${
              trial.daysLeft <= 3
                ? "bg-red-50 border border-red-200"
                : trial.daysLeft <= 7
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-blue-50 border border-blue-200"
            }`}
          >
            {/* Ícone */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                trial.daysLeft <= 3
                  ? "bg-red-100"
                  : trial.daysLeft <= 7
                    ? "bg-amber-100"
                    : "bg-blue-100"
              }`}
            >
              <Timer
                className={`w-5 h-5 ${
                  trial.daysLeft <= 3
                    ? "text-red-600"
                    : trial.daysLeft <= 7
                      ? "text-amber-600"
                      : "text-[#004A9D]"
                }`}
              />
            </div>
            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p
                className={`font-bold text-sm ${
                  trial.daysLeft <= 3
                    ? "text-red-800"
                    : trial.daysLeft <= 7
                      ? "text-amber-800"
                      : "text-[#0A2540]"
                }`}
              >
                {trial.daysLeft === 0
                  ? "Seu trial expirou hoje!"
                  : trial.daysLeft === 1
                    ? "\u26a0\ufe0f Falta 1 dia para o trial encerrar"
                    : `${trial.daysLeft} dias restantes no seu per\u00edodo gratuito`}
              </p>
              <p
                className={`text-xs mt-0.5 ${
                  trial.daysLeft <= 3
                    ? "text-red-600"
                    : trial.daysLeft <= 7
                      ? "text-amber-600"
                      : "text-[#5A667A]"
                }`}
              >
                {trial.daysLeft <= 3
                  ? "Assine agora para n\u00e3o perder o acesso ao painel e aos seus leads."
                  : "Aproveite o per\u00edodo gratuito. Assine antes do fim para manter o acesso."}
              </p>
            </div>
            {/* CTA */}
            <a
              href="/planos"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white flex-shrink-0 transition-all ${
                trial.daysLeft <= 3
                  ? "bg-red-600 hover:bg-red-700"
                  : trial.daysLeft <= 7
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-[#004A9D] hover:bg-[#003580]"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Assinar agora
            </a>
            {/* Fechar */}
            <button
              onClick={() => setTrialBannerDismissed(true)}
              className="absolute top-3 right-3 text-[#94A3B8] hover:text-[#5A667A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total de Leads"
            value={stats.totalLeads}
            sub="Este mês"
            icon={<Target className="w-5 h-5 text-[#0A2540]" />}
            color="bg-blue-500/20"
          />
          <StatCard
            label="Agendamentos"
            value={stats.scheduledLeads}
            sub={`${stats.conversionRate}% conversão`}
            icon={<Calendar className="w-5 h-5 text-[#0A2540]" />}
            color="bg-emerald-500/20"
          />
          <StatCard
            label="Score Médio"
            value={stats.avgScore}
            sub="0–100 pts"
            icon={<Award className="w-5 h-5 text-[#0A2540]" />}
            color="bg-amber-500/20"
          />
          <StatCard
            label="Leads Quentes"
            value={stats.hotLeads}
            sub={`${stats.warmLeads} mornos, ${stats.coldLeads} frios`}
            icon={<Flame className="w-5 h-5 text-[#0A2540]" />}
            color="bg-orange-500/20"
          />
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                { id: "sellers", label: "Time", icon: Users },
                { id: "leads", label: "Leads", icon: UserPlus },
                { id: "kanban", label: "Desempenho", icon: BarChart2 },
                { id: "calendar", label: "Agenda", icon: Calendar },
                { id: "analytics", label: "Analytics", icon: BarChart3 },
                { id: "landing", label: "Landing", icon: Globe },
                { id: "pixel", label: "Pixel", icon: Activity },
                { id: "settings", label: "Config", icon: Settings },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C1B8]/50 ${
                  activeTab === id
                    ? "bg-[#EBF4FF] text-[#004A9D]"
                    : "text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8]"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab: Time Comercial */}
          {activeTab === "sellers" && (
            <div>
              <TeamHealthPanel sellers={sellers as Seller[]} />
              <div className="space-y-3">
                {sellers.length === 0 ? (
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
                    <Users className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
                    <p className="text-[#5A667A] mb-3">
                      Nenhum vendedor cadastrado
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 bg-teal-50 text-[#00C1B8] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00C1B8]/30 transition-colors border border-[#14b8a6]/30 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Convidar primeiro vendedor
                    </button>
                  </div>
                ) : (
                  sellers.map((seller, i) => (
                    <SellerCard
                      key={seller.id}
                      seller={seller as Seller}
                      rank={i + 1}
                    />
                  ))
                )}
              </div>

              {/* Legenda de métricas */}
              {sellers.length > 0 && (
                <div className="mt-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[#A0AABB] text-xs font-semibold uppercase tracking-wider mb-3">
                    Como interpretar as métricas
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#5A667A]">
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#00C1B8] flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#5A667A]">1ª Resposta:</strong>{" "}
                        ideal abaixo de 10min. Acima de 30min o lead esfria
                        significativamente.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#5A667A]">Follow-up:</strong>{" "}
                        recontato após 24h sem resposta. Acima de 80% é
                        excelente.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-[#5A667A]">Conversão:</strong> %
                        de leads que viraram agendamento. Acima de 55% é
                        referência de mercado.
                      </span>
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
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
                  <Target className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
                  <p className="text-[#5A667A]">Nenhum lead ainda</p>
                </div>
              ) : (
                leads.map(lead => {
                  const isExpanded = expandedLeadId === lead.id;
                  const answers = getLeadAnswers(lead.chat_answers);
                  return (
                  <div
                    key={lead.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden hover:border-[#00C1B8]/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedLeadId(isExpanded ? null : lead.id)
                      }
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-center gap-4">
                        {lead.photo_url ? (
                          <img
                            src={lead.photo_url}
                            alt={lead.name}
                            loading="lazy"
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-[#E2E8F0]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8a6]/30 to-[#3b82f6]/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#004A9D] text-sm font-bold">
                              {lead.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-[#0A2540] font-semibold text-sm">
                              {lead.name}
                            </p>
                            <ScoreBadge score={lead.lead_score} />
                            <TemperatureIcon temp={lead.temperature} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#5A667A] flex-wrap">
                            <span>{lead.phone}</span>
                            {lead.age && <span>· {lead.age} anos</span>}
                            {lead.hair_problem && (
                              <span>· {lead.hair_problem}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-[#5A667A] bg-[#F0F4F8] px-2 py-1 rounded-lg capitalize hidden sm:inline">
                            {funnelStepLabel(lead.funnel_step)}
                          </span>
                          <ChevronRight
                            className={`w-4 h-4 text-[#C0CADB] transition-transform ${isExpanded ? "rotate-90" : ""}`}
                          />
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t border-[#EEF2F7]">
                        {lead.photo_url && (
                          <div className="flex items-center gap-3 mt-3 mb-4">
                            <button
                              type="button"
                              onClick={() => setPhotoModalUrl(lead.photo_url!)}
                              className="group relative flex-shrink-0"
                            >
                              <img
                                src={lead.photo_url}
                                alt={`Foto enviada por ${lead.name}`}
                                loading="lazy"
                                className="w-16 h-16 rounded-xl object-cover border border-[#E2E8F0]"
                              />
                              <span className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-colors">
                                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotoModalUrl(lead.photo_url!)}
                              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#004A9D] hover:text-[#00C1B8] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                              Ver foto enviada
                            </button>
                          </div>
                        )}

                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9AA7BC] mb-2">
                          Respostas do diagnóstico
                        </p>
                        {answers.length > 0 ? (
                          <dl className="space-y-1.5">
                            {answers.map((a, i) => (
                              <div
                                key={i}
                                className="flex gap-2 text-sm leading-snug"
                              >
                                {a.label && (
                                  <dt className="text-[#5A667A] flex-shrink-0">
                                    {a.label}:
                                  </dt>
                                )}
                                <dd className="text-[#0A2540] font-medium">
                                  {a.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-sm text-[#9AA7BC]">
                            Este lead não respondeu ao quiz de diagnóstico.
                          </p>
                        )}

                        {/* Bloco de agendamento. appointment_at vem da tabela
                            `appointments` (1º agendamento não-cancelado do lead,
                            servido por getLeadsByFranchise). Como fallback, o
                            funnel_step "scheduled"/"confirmed" também conta como
                            agendado mesmo sem registro de horário na agenda. */}
                        {(() => {
                          const apptAt = lead.appointment_at ?? null;
                          const stepScheduled =
                            lead.funnel_step === "scheduled" ||
                            lead.funnel_step === "confirmed";
                          const isScheduled = !!apptAt || stepScheduled;
                          return (
                            <div className="mt-4 pt-3 border-t border-[#EEF2F7]">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9AA7BC] mb-2">
                                Agendamento
                              </p>
                              {isScheduled ? (
                                <div className="flex items-center gap-2 rounded-lg border border-[#00C1B8]/30 bg-[#00C1B8]/10 px-3 py-2">
                                  <CalendarCheck className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="text-sm font-semibold text-[#0A2540]">
                                      Agendado
                                    </span>
                                    {apptAt ? (
                                      <span className="text-sm text-[#5A667A]">
                                        {new Date(apptAt).toLocaleString("pt-BR")}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-[#5A667A]">
                                        sem horário definido na agenda
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2">
                                  <Calendar className="w-4 h-4 text-[#9AA7BC] flex-shrink-0" />
                                  <span className="text-sm text-[#5A667A]">
                                    Sem agendamento ainda
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab: Desempenho (Kanban de leads + quem atende) */}
          {activeTab === "kanban" && (
            <FranchiseeKanbanTab
              leads={allLeads}
              sellers={sellers.map((s) => ({ id: s.id, name: s.name }))}
            />
          )}

          {/* Tab: Agenda */}
          {activeTab === "calendar" && <CalendarTab />}
          {/* Tab: Landing Pages */}
          {activeTab === "landing" && <LandingPagesTab />}

          {/* Tab: Analytics (métricas + funil) */}
          {activeTab === "analytics" &&
            (analytics ? (
              <FranchiseeAnalyticsTab analytics={analytics} funnel={funnel} />
            ) : (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
                <p className="text-[#5A667A]">Carregando métricas…</p>
              </div>
            ))}

          {/* Tab: Meta Pixel */}
          {activeTab === "pixel" && franchise?.id && (
            <PixelTab franchiseId={franchise.id} />
          )}

          {/* Tab: Configurações */}
          {activeTab === "settings" && <FranchiseeSettingsTab />}
        </div>

        {/* Modal de convite */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md">
              <h3
                className="text-xl font-bold text-[#0A2540] mb-2"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              >
                Convidar Vendedor
              </h3>
              <p className="text-[#5A667A] text-sm mb-6">
                Gere um link de convite para adicionar um vendedor à sua equipe
              </p>

              {generatedInviteUrl ? (
                /* Exibir link gerado */
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <p className="text-emerald-700 font-semibold text-sm">
                        Link gerado com sucesso!
                      </p>
                    </div>
                    <p className="text-[#5A667A] text-xs mb-3">
                      Copie e envie este link ao vendedor. Válido por 7 dias.
                    </p>
                    <div className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <span className="text-[#0A2540] text-xs font-mono flex-1 break-all">
                        {generatedInviteUrl}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedInviteUrl);
                          toast.success("Copiado!");
                        }}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-[#00C1B8]/10 hover:bg-[#00C1B8]/20 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#00C1B8]" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail("");
                      setGeneratedInviteUrl(null);
                    }}
                    className="w-full py-3 rounded-xl bg-[#00C1B8] text-white font-bold text-sm hover:bg-[#009E96] transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                /* Formulário de geração */
                <>
                  <div className="mb-4">
                    <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                      Email do vendedor (opcional)
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="vendedor@email.com"
                      className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteEmail("");
                        setGeneratedInviteUrl(null);
                      }}
                      className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() =>
                        createInviteMutation.mutate({
                          email: inviteEmail || undefined,
                          expiresInDays: 7,
                        })
                      }
                      disabled={createInviteMutation.isPending}
                      className="flex-1 py-3 rounded-xl bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#00a89f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {createInviteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      Gerar Link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Lightbox da foto do lead */}
        {photoModalUrl && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setPhotoModalUrl(null)}
          >
            <button
              type="button"
              onClick={() => setPhotoModalUrl(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={photoModalUrl}
              alt="Foto enviada pelo lead"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </HomenzLayout>
  );
}
