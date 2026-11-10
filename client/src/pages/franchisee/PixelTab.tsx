import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Loader2,
  Zap,
  Eye,
  Settings,
  Info,
  CheckCircle,
  EyeOff,
  BarChart2,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

export function PixelTab({ franchiseId }: { franchiseId: string }) {
  const utils = trpc.useUtils();
  const pixelQuery = trpc.homenz.getFranchisePixel.useQuery(
    { franchiseId },
    { refetchOnWindowFocus: false }
  );
  const capiQuery = trpc.homenz.getCapiToken.useQuery(
    { franchiseId },
    { refetchOnWindowFocus: false }
  );
  const testCodeQuery = trpc.homenz.getTestEventCode.useQuery(
    { franchiseId },
    { refetchOnWindowFocus: false }
  );
  const eventStatsQuery = trpc.distribution.getPixelEventStats.useQuery(
    { franchiseId },
    { refetchOnWindowFocus: false, refetchInterval: 30000 }
  );

  const [pixelInput, setPixelInput] = useState("");
  const [capiInput, setCapiInput] = useState("");
  const [testCodeInput, setTestCodeInput] = useState("");
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [savedPixel, setSavedPixel] = useState(false);
  const [savedCapi, setSavedCapi] = useState(false);
  const [savedTestCode, setSavedTestCode] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (pixelQuery.data?.pixelId) setPixelInput(pixelQuery.data.pixelId);
  }, [pixelQuery.data?.pixelId]);

  useEffect(() => {
    if (capiQuery.data?.capiToken) setCapiInput(capiQuery.data.capiToken);
  }, [capiQuery.data?.capiToken]);

  useEffect(() => {
    if (testCodeQuery.data?.testEventCode)
      setTestCodeInput(testCodeQuery.data.testEventCode);
  }, [testCodeQuery.data?.testEventCode]);

  const updatePixelMutation = trpc.homenz.updateFranchisePixel.useMutation({
    onSuccess: () => {
      setSavedPixel(true);
      setTimeout(() => setSavedPixel(false), 3000);
      utils.homenz.getFranchisePixel.invalidate({ franchiseId });
      toast.success("Meta Pixel salvo com sucesso!");
    },
    onError: err => toast.error(err.message || "Erro ao salvar pixel"),
  });

  const updateCapiMutation = trpc.homenz.updateCapiToken.useMutation({
    onSuccess: () => {
      setSavedCapi(true);
      setTimeout(() => setSavedCapi(false), 3000);
      utils.homenz.getCapiToken.invalidate({ franchiseId });
      toast.success("CAPI Token salvo com sucesso!");
    },
    onError: err => toast.error(err.message || "Erro ao salvar CAPI token"),
  });

  const testCapiMutation = trpc.homenz.testCapiEvent.useMutation();
  const updateTestCodeMutation = trpc.homenz.updateTestEventCode.useMutation({
    onSuccess: () => {
      setSavedTestCode(true);
      setTimeout(() => setSavedTestCode(false), 3000);
      utils.homenz.getTestEventCode.invalidate({ franchiseId });
      toast.success(
        testCodeInput ? "Código de teste salvo!" : "Código de teste removido."
      );
    },
    onError: err =>
      toast.error(err.message || "Erro ao salvar código de teste"),
  });

  const handleTestPixel = async () => {
    const pid = pixelInput || pixelQuery.data?.pixelId;
    const capi = capiInput || capiQuery.data?.capiToken;
    const code =
      testCodeInput || testCodeQuery.data?.testEventCode || undefined;
    if (!pid) {
      toast.error("Configure o ID do Pixel antes de testar");
      return;
    }
    if (!capi) {
      toast.error(
        "Configure o CAPI Access Token para testar a conexão server-side"
      );
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testCapiMutation.mutateAsync({
        franchiseId,
        pixelId: pid,
        capiToken: capi,
        testEventCode: code,
      });
      if (result.success) {
        const codeMsg = code ? ` (código de teste: ${code})` : "";
        setTestResult({
          success: true,
          message: `Conexão OK! ${result.eventsReceived ?? 1} evento(s) recebido(s) pelo Meta.${codeMsg}`,
        });
      } else {
        setTestResult({
          success: false,
          message: result.error || "Erro desconhecido",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao testar";
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const currentPixel = pixelQuery.data?.pixelId || null;
  const stats = eventStatsQuery.data as
    | Record<
        string,
        {
          viewContent: number;
          initiateCheckout: number;
          leadFromDb?: number;
          lead: number;
          title: string;
        }
      >
    | undefined;
  const totalViews = stats
    ? Object.values(stats).reduce((s, v) => s + (v.viewContent || 0), 0)
    : 0;
  const totalInitiate = stats
    ? Object.values(stats).reduce((s, v) => s + (v.initiateCheckout || 0), 0)
    : 0;
  const totalLeads = stats
    ? Object.values(stats).reduce(
        (s, v) => s + (v.leadFromDb ?? v.lead ?? 0),
        0
      )
    : 0;

  return (
    <div className="space-y-5">
      {/* Card: Pixel ID */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-[#004A9D]" />
          </div>
          <div>
            <h4 className="text-[#0A2540] font-bold text-base">
              Meta Pixel (Facebook Ads)
            </h4>
            <p className="text-[#5A667A] text-xs mt-0.5">
              Rastreie conversões nas suas landing pages com eventos
              automáticos.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#0A2540]">
            ID do Meta Pixel
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pixelInput}
              onChange={e =>
                setPixelInput(e.target.value.replace(/\D/g, "").slice(0, 20))
              }
              placeholder="Ex: 1234567890123456"
              className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#0A2540] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#004A9D]/30 focus:border-[#004A9D]"
            />
            <button
              onClick={() =>
                updatePixelMutation.mutate({
                  franchiseId,
                  pixelId: pixelInput || null,
                })
              }
              disabled={updatePixelMutation.isPending}
              className="px-4 py-2.5 bg-[#004A9D] text-white text-sm font-semibold rounded-xl hover:bg-[#003580] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updatePixelMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedPixel ? (
                <CheckCircle className="w-4 h-4" />
              ) : null}
              {savedPixel ? "Salvo!" : "Salvar"}
            </button>
          </div>
          {currentPixel && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Pixel ativo:{" "}
              <span className="font-mono font-bold">{currentPixel}</span>
            </p>
          )}
        </div>
      </div>

      {/* Card: CAPI Access Token */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[#0A2540] font-bold text-base">
                Conversions API (CAPI)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Recomendado
              </span>
            </div>
            <p className="text-[#5A667A] text-xs mt-0.5">
              Envio server-side de eventos — mais preciso que o pixel, funciona
              mesmo com bloqueadores de cookies (iOS 14+).
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#0A2540]">
            Access Token do CAPI
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showCapiToken ? "text" : "password"}
                value={capiInput}
                onChange={e => setCapiInput(e.target.value.slice(0, 300))}
                placeholder="EAAxxxxxx..."
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#0A2540] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
              />
              <button
                type="button"
                onClick={() => setShowCapiToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A667A] hover:text-[#0A2540]"
              >
                {showCapiToken ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <button
              onClick={() =>
                updateCapiMutation.mutate({
                  franchiseId,
                  capiToken: capiInput || null,
                })
              }
              disabled={updateCapiMutation.isPending}
              className="px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updateCapiMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedCapi ? (
                <CheckCircle className="w-4 h-4" />
              ) : null}
              {savedCapi ? "Salvo!" : "Salvar"}
            </button>
          </div>
          <p className="text-[10px] text-[#5A667A]">
            Encontre em: Meta Business &gt; Configurações &gt; Fontes de Dados
            &gt; Pixels &gt; API de Conversões &gt; Gerar Token de Acesso
          </p>
        </div>

        {/* Código de Teste */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#0A2540]">
              Código de Teste
            </label>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
              Opcional
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={testCodeInput}
              onChange={e =>
                setTestCodeInput(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 20)
                )
              }
              placeholder="Ex: TEST12345"
              className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2 text-[#0A2540] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            />
            <button
              onClick={() =>
                updateTestCodeMutation.mutate({
                  franchiseId,
                  testEventCode: testCodeInput || null,
                })
              }
              disabled={updateTestCodeMutation.isPending}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updateTestCodeMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedTestCode ? (
                <CheckCircle className="w-4 h-4" />
              ) : null}
              {savedTestCode ? "Salvo!" : "Salvar"}
            </button>
          </div>
          <p className="text-[10px] text-[#5A667A]">
            Quando preenchido, os eventos aparecem na aba{" "}
            <strong>Testar Eventos</strong> do Meta Events Manager sem afetar
            dados reais de campanha.
          </p>
        </div>

        {/* Botão Testar Pixel */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
          <button
            onClick={handleTestPixel}
            disabled={isTesting || (!pixelInput && !currentPixel)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{
              background: "rgba(0,74,157,0.06)",
              border: "1px solid rgba(0,74,157,0.2)",
              color: "#004A9D",
            }}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {isTesting ? "Testando..." : "Testar Conexão"}
          </button>
          {testResult && (
            <div
              className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-xs ${testResult.success ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Card: Relatório de Eventos */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[#0A2540] font-bold flex items-center gap-2 text-base">
            <BarChart2 className="w-4 h-4 text-[#004A9D]" />
            Eventos por Landing Page
          </h5>
          <button
            onClick={() => eventStatsQuery.refetch()}
            className="text-xs text-[#5A667A] hover:text-[#004A9D] flex items-center gap-1"
          >
            {eventStatsQuery.isFetching ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : null}
            Atualizar
          </button>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            {
              label: "Visualizações",
              value: totalViews,
              Icon: Eye,
              color: "#004A9D",
            },
            {
              label: "Iniciaram",
              value: totalInitiate,
              Icon: Smartphone,
              color: "#7C3AED",
            },
            {
              label: "Leads",
              value: totalLeads,
              Icon: CheckCircle,
              color: "#059669",
            },
          ].map(({ label, value, Icon, color }) => (
            <div
              key={label}
              className="bg-[#F8FAFC] rounded-xl p-3 text-center"
            >
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
              <div className="text-xl font-bold" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] text-[#5A667A] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabela por LP */}
        {stats && Object.keys(stats).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2 px-2 text-[#5A667A] font-semibold">
                    Landing Page
                  </th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">
                    Views
                  </th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">
                    Iniciou
                  </th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">
                    Leads
                  </th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">
                    Conv.
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats).map(([slug, s]) => {
                  const leads = s.leadFromDb ?? s.lead ?? 0;
                  const conv =
                    s.viewContent > 0
                      ? ((leads / s.viewContent) * 100).toFixed(1)
                      : "—";
                  return (
                    <tr
                      key={slug}
                      className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]"
                    >
                      <td className="py-2 px-2 text-[#0A2540] font-medium max-w-[140px] truncate">
                        {s.title || slug}
                      </td>
                      <td className="py-2 px-2 text-center text-[#004A9D] font-bold">
                        {s.viewContent || 0}
                      </td>
                      <td className="py-2 px-2 text-center text-purple-600 font-bold">
                        {s.initiateCheckout || 0}
                      </td>
                      <td className="py-2 px-2 text-center text-emerald-600 font-bold">
                        {leads}
                      </td>
                      <td className="py-2 px-2 text-center text-[#5A667A]">
                        {conv}
                        {conv !== "—" ? "%" : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-[#5A667A] text-xs">
            {eventStatsQuery.isLoading
              ? "Carregando..."
              : "Nenhuma landing page ativa com eventos registrados ainda."}
          </div>
        )}
      </div>

      {/* Eventos rastreados */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
        <h5 className="text-[#0A2540] font-bold mb-3 flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-amber-500" />
          Eventos Disparados Automaticamente
        </h5>
        <div className="grid grid-cols-1 gap-2">
          {[
            {
              event: "ViewContent",
              desc: "Quando o lead abre a landing page",
              Icon: Eye,
              capi: true,
            },
            {
              event: "InitiateCheckout",
              desc: "Quando informa nome e WhatsApp",
              Icon: Smartphone,
              capi: false,
            },
            {
              event: "Lead",
              desc: "Quando o lead é distribuído para o vendedor",
              Icon: CheckCircle,
              capi: true,
            },
            {
              event: "CompleteRegistration",
              desc: "Quando o cadastro é finalizado",
              Icon: UserCheck,
              capi: true,
            },
          ].map(({ event, desc, Icon, capi }) => (
            <div
              key={event}
              className="flex items-center gap-3 p-2.5 bg-[#F8FAFC] rounded-xl"
            >
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#004A9D]">
                <Icon className="w-4 h-4" />
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#0A2540] font-mono">
                  {event}
                </p>
                <p className="text-[10px] text-[#5A667A]">{desc}</p>
              </div>
              <div className="flex gap-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
                  Pixel
                </span>
                {capi && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
                    CAPI
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
