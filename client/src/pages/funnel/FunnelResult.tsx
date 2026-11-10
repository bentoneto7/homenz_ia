import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  CaretRight,
  Star,
  TrendUp,
  WarningCircle,
  Warning,
  Sparkle,
  CalendarCheck,
  ArrowRight,
  IconContext,
} from "@phosphor-icons/react";
import { useFunnelTheme } from "./useFunnelTheme";
import { FunnelThemeToggle } from "./FunnelThemeToggle";

export default function FunnelResult() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const { mode, toggle } = useFunnelTheme();
  const { data: result, isLoading, error } = trpc.ai.getResultByToken.useQuery(
    { sessionToken: token ?? "" },
    {
      enabled: !!token,
      refetchInterval: (query) => {
        const d = query.state.data;
        if (!d || d.processingStatus === "processing" || d.processingStatus === "pending") return 3000;
        return false;
      },
    }
  );

  // Remove o dark mode do painel (shadcn) — o funil tem o próprio tema (.funnel-theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  const floatingToggle = (
    <FunnelThemeToggle mode={mode} onToggle={toggle} className="fixed top-4 right-4 z-30" />
  );

  // Loading / Processing state
  if (isLoading || result?.processingStatus === "processing" || result?.processingStatus === "pending") {
    const steps = [
      "Detectando pontos-chave do couro cabeludo",
      "Calculando nível e padrão de calvície",
      "Gerando visualização pós-preenchimento",
      "Calculando seu potencial de crescimento capilar",
    ];
    return (
      <IconContext.Provider value={{ weight: "duotone" }}>
        <div className="funnel-theme min-h-[100dvh] flex flex-col items-center justify-center px-4">
          {floatingToggle}
          <div className="text-center max-w-sm w-full">
            {/* Animated orb */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "var(--fn-accent)", opacity: 0.2 }} />
              <div className="absolute inset-2 rounded-full animate-pulse" style={{ background: "var(--fn-accent)", opacity: 0.4 }} />
              <div className="relative w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "var(--fn-accent)" }}>
                <Sparkle className="w-10 h-10 animate-spin" weight="fill" style={{ color: "var(--fn-accent-ink)", animationDuration: "3s" }} />
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--fn-ink)" }}>Analisando suas fotos...</h2>
            <p className="text-sm mb-8" style={{ color: "var(--fn-muted)" }}>
              Nossa IA está processando suas imagens e gerando a visualização personalizada do resultado.
            </p>

            <div className="space-y-3 text-left rounded-2xl p-5" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: "var(--fn-accent)", animation: `pulse 1.5s ease-in-out ${i * 0.4}s infinite` }}
                  />
                  <span style={{ color: "var(--fn-body)" }}>{step}</span>
                </div>
              ))}
            </div>

            <p className="text-xs mt-6" style={{ color: "var(--fn-muted)" }}>Isso pode levar até 30 segundos...</p>
          </div>
        </div>
      </IconContext.Provider>
    );
  }

  // Error state
  if (error || result?.processingStatus === "error") {
    return (
      <IconContext.Provider value={{ weight: "duotone" }}>
        <div className="funnel-theme min-h-[100dvh] flex items-center justify-center px-4">
          {floatingToggle}
          <div className="text-center max-w-sm">
            <WarningCircle className="w-14 h-14 mx-auto mb-4" style={{ color: "var(--fn-accent)" }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--fn-ink)" }}>Erro no processamento</h2>
            <p className="text-sm mb-6" style={{ color: "var(--fn-muted)" }}>
              Não foi possível processar suas fotos. Por favor, tente novamente com fotos mais nítidas.
            </p>
            <button
              onClick={() => navigate(`/c/${slug}/fotos/${token}`)}
              className="fn-cta-glow px-6 py-3 rounded-xl text-sm font-semibold transition-opacity"
              style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </IconContext.Provider>
    );
  }

  if (!result) return null;

  const score = result.leadScore ?? 0;
  const scoreColor = score >= 70 ? "var(--fn-accent)" : score >= 40 ? "#f59e0b" : "var(--fn-accent)";
  const scoreLabel = score >= 70 ? "Alto Potencial" : score >= 40 ? "Potencial Moderado" : "Potencial Inicial";
  const scoreSubLabel = score >= 70 ? "Excelente candidato ao tratamento" : score >= 40 ? "Bom candidato ao tratamento" : "Avaliação presencial recomendada";
  const scoreBgStyle = {
    background: `color-mix(in oklab, ${scoreColor} 12%, transparent)`,
    border: `1px solid color-mix(in oklab, ${scoreColor} 28%, transparent)`,
  };
  const totalCalvicieAreas = (result as any).totalCalvicieAreas as string[] | undefined;

  return (
    <IconContext.Provider value={{ weight: "duotone" }}>
    <div className="funnel-theme min-h-[100dvh] pb-32">
      {floatingToggle}
      {/* Hero header */}
      <div className="relative px-4 pt-10 pb-16 text-center overflow-hidden">
        <div className="relative">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--fn-ink)" }}>Seu resultado está pronto!</h1>
          <p className="text-sm" style={{ color: "var(--fn-muted)" }}>Veja como você ficará após o preenchimento capilar</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-4">
        {/* Aviso de calvície total */}
        {totalCalvicieAreas && totalCalvicieAreas.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
            <div className="flex items-start gap-2.5">
              <Warning className="w-5 h-5 flex-shrink-0 mt-0.5" weight="fill" style={{ color: "#f59e0b" }} />
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--fn-ink)" }}>Regiões com calvície total identificadas</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--fn-muted)" }}>
                  As regiões <strong style={{ color: "var(--fn-body)" }}>{totalCalvicieAreas.join(", ")}</strong> apresentam calvície total (densidade 0%). Nossos tratamentos trabalham com o fio existente como referência visual, o que limita o resultado visual nessas áreas específicas. Um especialista Homenz irá apresentar as melhores opções para o seu caso.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Before/After — duas fotos separadas */}
        {(result.beforeImageUrl || result.afterImageUrl) && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--fn-muted)" }}>Antes e depois</p>
            </div>
            <div className="px-4 pb-4">
              {result.beforeImageUrl && result.afterImageUrl ? (
                <div className="flex items-center gap-2">
                  {/* Foto Antes */}
                  <div className="flex-1 relative">
                    <div className="rounded-xl overflow-hidden aspect-[3/4]" style={{ background: "var(--fn-elevated)" }}>
                      <img src={result.beforeImageUrl} alt="Antes" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Antes</div>
                  </div>
                  {/* Seta */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1" style={{ color: "var(--fn-accent-ink)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--fn-accent)" }}>
                      <ArrowRight className="w-4 h-4" weight="bold" />
                    </div>
                  </div>
                  {/* Foto Depois */}
                  <div className="flex-1 relative">
                    <div className="rounded-xl overflow-hidden aspect-[3/4]" style={{ background: "var(--fn-elevated)", boxShadow: "0 0 0 2px color-mix(in oklab, var(--fn-accent) 35%, transparent)" }}>
                      <img src={result.afterImageUrl} alt="Depois" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}>Depois</div>
                  </div>
                </div>
              ) : result.afterImageUrl ? (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden aspect-[4/3]" style={{ background: "var(--fn-elevated)" }}>
                    <img src={result.afterImageUrl} alt="Resultado" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}>Resultado</div>
                </div>
              ) : (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden aspect-[4/3]" style={{ background: "var(--fn-elevated)" }}>
                    <img src={result.beforeImageUrl ?? ''} alt="Antes" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Antes</div>
                </div>
              )}
              <p className="text-[10px] text-center mt-3" style={{ color: "var(--fn-muted)" }}>
                Imagem sugerida com base no seu perfil — resultado aproximado, não é garantia. O resultado real pode variar conforme avaliação clínica presencial.
              </p>
            </div>
          </div>
        )}

        {/* Potencial de Crescimento Capilar card */}
        <div className="rounded-2xl p-5" style={scoreBgStyle}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: "var(--fn-muted)" }}>Potencial de Crescimento Capilar</p>
              <h2 className="font-bold text-lg" style={{ color: "var(--fn-ink)" }}>{scoreLabel}</h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--fn-muted)" }}>{scoreSubLabel}</p>
            </div>
            <div className="text-right">
              <div className="flex justify-center gap-0.5 mt-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className="w-5 h-5" weight={i <= Math.round(score / 20) ? "fill" : "regular"} style={{ color: i <= Math.round(score / 20) ? scoreColor : "var(--fn-line-strong)" }} />
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-4" style={{ background: "color-mix(in oklab, var(--fn-ink) 10%, transparent)" }}>
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </div>

          {/* Expectativa motivacional */}
          <div className="mt-3 rounded-xl p-3" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--fn-accent)" }}>Quanto antes, melhor o resultado</p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--fn-muted)" }}>
              O resultado da simulação acima é possível. Quanto mais cedo você iniciar, mais natural e completo será o preenchimento. Agende agora sua consulta gratuita e descubra o plano ideal para o seu caso.
            </p>
          </div>
        </div>

        {/* Analysis text */}
        {result.analysisText && (
          <div className="rounded-2xl p-5" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendUp className="w-4 h-4" style={{ color: "var(--fn-accent)" }} />
              <h3 className="font-semibold text-sm" style={{ color: "var(--fn-ink)" }}>Análise detalhada</h3>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--fn-body)" }}>{result.analysisText}</p>
          </div>
        )}

        {/* Social proof */}
        <div className="rounded-2xl p-5" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
          <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: "var(--fn-muted)" }}>Resultados reais</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black" style={{ color: "var(--fn-accent)" }}>98%</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fn-muted)" }}>satisfação</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: "var(--fn-accent)" }}>+1.200</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fn-muted)" }}>procedimentos</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: "var(--fn-accent)" }}>8 anos</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--fn-muted)" }}>de experiência</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-4"
        style={{ background: "color-mix(in oklab, var(--fn-bg) 88%, transparent)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--fn-line)" }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/c/${slug}/agendar/${token}`)}
            className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-opacity"
            style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
          >
            <CalendarCheck className="w-5 h-5" />
            Agendar consulta gratuita
            <CaretRight className="w-5 h-5" weight="bold" />
          </button>
          <p className="text-xs text-center mt-2" style={{ color: "var(--fn-muted)" }}>
            Consulta 100% gratuita e sem compromisso
          </p>
          <p className="text-[10px] text-center mt-1" style={{ color: "var(--fn-muted)" }}>
            Imagem sugerida — resultado aproximado, não é garantia. Varia conforme avaliação presencial.
          </p>
        </div>
      </div>
    </div>
    </IconContext.Provider>
  );
}
