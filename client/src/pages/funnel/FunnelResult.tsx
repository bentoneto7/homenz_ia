import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Loader2, Star, TrendingUp, AlertCircle, Sparkles, Calendar, CheckCircle2 } from "lucide-react";

export default function FunnelResult() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

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

  // Loading / Processing state
  if (isLoading || result?.processingStatus === "processing" || result?.processingStatus === "pending") {
    const steps = [
      "Detectando pontos-chave do couro cabeludo",
      "Calculando nível e padrão de calvície",
      "Gerando visualização pós-preenchimento",
      "Calculando seu score de qualificação",
    ];
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          {/* Animated orb */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full gradient-gold opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full gradient-gold opacity-40 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full gradient-gold flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-black animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Analisando suas fotos...</h2>
          <p className="text-white/50 text-sm mb-8">
            Nossa IA está processando suas imagens e gerando a visualização personalizada do resultado.
          </p>

          <div className="space-y-3 text-left bg-white/5 border border-white/10 rounded-2xl p-5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div
                  className="w-2 h-2 rounded-full bg-[#D4A843] flex-shrink-0"
                  style={{ animation: `pulse 1.5s ease-in-out ${i * 0.4}s infinite` }}
                />
                <span className="text-white/60">{step}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-white/30 mt-6">Isso pode levar até 30 segundos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || result?.processingStatus === "error") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro no processamento</h2>
          <p className="text-white/50 text-sm mb-6">
            Não foi possível processar suas fotos. Por favor, tente novamente com fotos mais nítidas.
          </p>
          <button
            onClick={() => navigate(`/c/${slug}/fotos/${token}`)}
            className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl text-sm hover:bg-white/15 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const score = result.leadScore ?? 0;
  const scoreColor = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const scoreLabel = score >= 70 ? "Excelente candidato" : score >= 40 ? "Bom candidato" : "Requer avaliação";
  const scoreBg = score >= 70 ? "bg-emerald-500/10 border-emerald-500/20" : score >= 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32">
      {/* Hero header */}
      <div className="relative px-4 pt-10 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4A843]/10 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20 text-[#D4A843] text-xs font-semibold mb-4">
            <Sparkles className="w-3 h-3" />
            Análise personalizada por IA
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Seu resultado está pronto!</h1>
          <p className="text-white/50 text-sm">Veja como você ficará após o preenchimento capilar</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-4">
        {/* Before/After slider */}
        {result.beforeImageUrl && result.afterImageUrl ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-white/40 uppercase tracking-wide font-semibold">Antes × Depois — Arraste para comparar</p>
            </div>
            <div
              className="relative aspect-[4/3] cursor-ew-resize select-none"
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handleSliderMove}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onTouchMove={handleSliderMove}
            >
              {/* Before image (full) */}
              <img src={result.beforeImageUrl} alt="Antes" className="absolute inset-0 w-full h-full object-cover" />
              {/* After image (clipped) */}
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}>
                <img src={result.afterImageUrl} alt="Depois" className="absolute inset-0 w-full h-full object-cover" />
              </div>
              {/* Slider line */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ left: `${sliderPos}%` }}>
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M5 8H11M5 8L3 6M5 8L3 10M11 8L13 6M11 8L13 10" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              {/* Labels */}
              <div className="absolute bottom-3 left-3 bg-black/70 text-white text-xs px-2.5 py-1 rounded-full font-semibold">Antes</div>
              <div className="absolute bottom-3 right-3 gradient-gold text-black text-xs px-2.5 py-1 rounded-full font-semibold">Depois ✨</div>
            </div>
          </div>
        ) : result.afterImageUrl ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs text-white/40 uppercase tracking-wide font-semibold">Resultado simulado</p>
            </div>
            <img src={result.afterImageUrl} alt="Resultado" className="w-full aspect-[4/3] object-cover" />
            <div className="px-4 py-3">
              <p className="text-xs text-white/50 text-center">Simulação gerada por IA com base nas suas fotos</p>
            </div>
          </div>
        ) : null}

        {/* Score card */}
        <div className={`border rounded-2xl p-5 ${scoreBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-1">Seu perfil capilar</p>
              <h2 className="font-bold text-lg text-white">{scoreLabel}</h2>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black" style={{ color: scoreColor }}>{score}</div>
              <div className="text-xs text-white/40">/ 100 pts</div>
            </div>
          </div>

          {/* Score bar */}
          <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Escala de calvície</p>
              <p className="text-xl font-black text-[#D4A843]">{result.baldnessScale ?? "N/A"}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Nível</p>
              <p className="text-xl font-black text-white capitalize">{result.baldnessLevel ?? "N/A"}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Sessões estimadas</p>
              <p className="text-xl font-black text-[#D4A843]">{result.estimatedSessions ?? "2-3"}</p>
            </div>
            <div className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-xs text-white/40 mb-1">Potencial</p>
              <div className="flex justify-center gap-0.5 mt-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className={`w-4 h-4 ${i <= Math.round(score / 20) ? "text-[#D4A843] fill-[#D4A843]" : "text-white/20"}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Analysis text */}
        {result.analysisText && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#D4A843]" />
              <h3 className="font-semibold text-sm">Análise detalhada</h3>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">{result.analysisText}</p>
          </div>
        )}

        {/* Recommended treatment */}
        {result.recommendedTreatment && (
          <div className="bg-[#D4A843]/10 border border-[#D4A843]/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-[#D4A843]" />
              <h3 className="font-semibold text-sm text-[#D4A843]">Tratamento recomendado</h3>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{result.recommendedTreatment}</p>
          </div>
        )}

        {/* Social proof */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-3">Resultados reais</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-[#D4A843]">98%</p>
              <p className="text-xs text-white/40 mt-0.5">satisfação</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#D4A843]">+1.200</p>
              <p className="text-xs text-white/40 mt-0.5">procedimentos</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#D4A843]">8 anos</p>
              <p className="text-xs text-white/40 mt-0.5">de experiência</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/c/${slug}/agendar/${token}`)}
            className="w-full gradient-gold text-black font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Calendar className="w-5 h-5" />
            Agendar consulta gratuita
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-white/30 text-center mt-2">
            Consulta 100% gratuita e sem compromisso
          </p>
        </div>
      </div>
    </div>
  );
}
