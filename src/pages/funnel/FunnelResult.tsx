import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { ChevronRight, Loader2, Star, TrendingUp, AlertCircle, Sparkles, Calendar } from "lucide-react";

export default function FunnelResult() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) { setError(new Error("Token inválido")); return; }
    setIsLoading(true);
    supabase.from("ai_results").select("*, leads(session_token, name, franchise_id)").eq("session_token", token).maybeSingle()
      .then(({ data, error: sbError }) => {
        if (sbError || !data) setError(new Error("Resultado não encontrado"));
        else setResult(data);
        setIsLoading(false);
      });
  }, []);

  // Garantir tema claro no funil público (DEVE ficar antes de qualquer return condicional)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    return () => {};
  }, []);

  // Loading / Processing state
  if (isLoading || result?.processingStatus === "processing" || result?.processingStatus === "pending") {
    const steps = [
      "Detectando pontos-chave do couro cabeludo",
      "Calculando nível e padrão de calvície",
      "Gerando visualização pós-preenchimento",
      "Calculando seu potencial de crescimento capilar",
    ];
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm w-full">
          {/* Animated orb */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full bg-[#004A9D] opacity-20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-[#004A9D] opacity-40 animate-pulse" />
            <div className="relative w-24 h-24 rounded-full bg-[#004A9D] flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white animate-spin" style={{ animationDuration: "3s" }} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-[#0A2540] mb-2">Analisando suas fotos...</h2>
          <p className="text-[#5A667A] text-sm mb-8">
            Nossa IA está processando suas imagens e gerando a visualização personalizada do resultado.
          </p>

          <div className="space-y-3 text-left bg-white border border-[#E2E8F0] rounded-2xl p-5">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div
                  className="w-2 h-2 rounded-full bg-[#004A9D] flex-shrink-0"
                  style={{ animation: `pulse 1.5s ease-in-out ${i * 0.4}s infinite` }}
                />
                <span className="text-[#5A667A]">{step}</span>
              </div>
            ))}
          </div>

          <p className="text-xs text-[#A0AABB] mt-6">Isso pode levar até 30 segundos...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || result?.processingStatus === "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#0A2540] mb-2">Erro no processamento</h2>
          <p className="text-[#5A667A] text-sm mb-6">
            Não foi possível processar suas fotos. Por favor, tente novamente com fotos mais nítidas.
          </p>
          <button
            onClick={() => navigate(`/c/${slug}/fotos/${token}`)}
            className="bg-[#004A9D] text-white px-6 py-3 rounded-xl text-sm hover:bg-[#003d85] transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const score = result.leadScore ?? 0;
  const scoreColor = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#004A9D";
  const scoreLabel = score >= 70 ? "🔥 Alto Potencial" : score >= 40 ? "🟡 Potencial Moderado" : "💧 Potencial Inicial";
  const scoreSubLabel = score >= 70 ? "Excelente candidato ao tratamento" : score >= 40 ? "Bom candidato ao tratamento" : "Avaliação presencial recomendada";
  const scoreBg = score >= 70 ? "bg-emerald-500/10 border-emerald-500/20" : score >= 40 ? "bg-amber-500/10 border-amber-500/20" : "bg-[#EBF4FF] border-[#004A9D]/20";
  const totalCalvicieAreas = (result as any).totalCalvicieAreas as string[] | undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] text-[#0A2540] pb-32">
      {/* Hero header */}
      <div className="relative px-4 pt-10 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#004A9D]/5 to-transparent pointer-events-none" />
        <div className="relative">
          <h1 className="text-3xl font-bold text-[#0A2540] mb-2">Seu resultado está pronto!</h1>
          <p className="text-[#5A667A] text-sm">Veja como você ficará após o preenchimento capilar</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-8 space-y-4">
        {/* Aviso de calvície total */}
        {totalCalvicieAreas && totalCalvicieAreas.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Regiões com calvície total identificadas</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  As regiões <strong>{totalCalvicieAreas.join(", ")}</strong> apresentam calvície total (densidade 0%). Nossos tratamentos trabalham com o fio existente como referência visual, o que limita o resultado visual nessas áreas específicas. Um especialista Homenz irá apresentar as melhores opções para o seu caso.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Before/After — duas fotos separadas */}
        {(result.beforeImageUrl || result.afterImageUrl) && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs text-[#5A667A] uppercase tracking-wide font-semibold">Antes e depois</p>
            </div>
            <div className="px-4 pb-4">
              {result.beforeImageUrl && result.afterImageUrl ? (
                <div className="flex items-center gap-2">
                  {/* Foto Antes */}
                  <div className="flex-1 relative">
                    <div className="rounded-xl overflow-hidden aspect-[3/4] bg-[#F8FAFC]">
                      <img src={result.beforeImageUrl} alt="Antes" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Antes</div>
                  </div>
                  {/* Seta */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-8 h-8 rounded-full bg-[#004A9D] flex items-center justify-center shadow-md">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {/* Foto Depois */}
                  <div className="flex-1 relative">
                    <div className="rounded-xl overflow-hidden aspect-[3/4] bg-[#F8FAFC] ring-2 ring-[#004A9D]/30">
                      <img src={result.afterImageUrl} alt="Depois" className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-[#004A9D] text-white text-xs px-2 py-0.5 rounded-full font-semibold">Depois ✨</div>
                  </div>
                </div>
              ) : result.afterImageUrl ? (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden aspect-[4/3] bg-[#F8FAFC]">
                    <img src={result.afterImageUrl} alt="Resultado" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-2 right-2 bg-[#004A9D] text-white text-xs px-2 py-0.5 rounded-full font-semibold">Resultado ✨</div>
                </div>
              ) : (
                <div className="relative">
                  <div className="rounded-xl overflow-hidden aspect-[4/3] bg-[#F8FAFC]">
                    <img src={result.beforeImageUrl ?? ''} alt="Antes" className="w-full h-full object-cover" />
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Antes</div>
                </div>
              )}
              <p className="text-[10px] text-[#C0CADB] text-center mt-3">
                💡 Imagem sugerida com base no seu perfil — resultado aproximado, não é garantia. O resultado real pode variar conforme avaliação clínica presencial.
              </p>
            </div>
          </div>
        )}

        {/* Potencial de Crescimento Capilar card */}
        <div className={`border rounded-2xl p-5 ${scoreBg}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-[#5A667A] uppercase tracking-wide font-semibold mb-1">Potencial de Crescimento Capilar</p>
              <h2 className="font-bold text-lg text-[#0A2540]">{scoreLabel}</h2>
              <p className="text-xs text-[#5A667A] mt-0.5">{scoreSubLabel}</p>
            </div>
            <div className="text-right">
              <div className="flex justify-center gap-0.5 mt-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} className={`w-5 h-5 ${i <= Math.round(score / 20) ? "fill-current" : "text-[#C0CADB]"}`} style={{ color: i <= Math.round(score / 20) ? scoreColor : undefined }} />
                ))}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-[#EBF4FF] rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${score}%`, backgroundColor: scoreColor }}
            />
          </div>

          {/* Expectativa motivacional */}
          <div className="mt-3 bg-white/80 border border-[#004A9D]/10 rounded-xl p-3">
            <p className="text-xs text-[#004A9D] font-semibold mb-1">📍 Quanto antes, melhor o resultado</p>
            <p className="text-xs text-[#5A667A] leading-relaxed">
              O resultado da simulação acima é possível. Quanto mais cedo você iniciar, mais natural e completo será o preenchimento. Agende agora sua consulta gratuita e descubra o plano ideal para o seu caso.
            </p>
          </div>
        </div>

        {/* Analysis text */}
        {result.analysisText && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#00C1B8]" />
              <h3 className="font-semibold text-sm">Análise detalhada</h3>
            </div>
            <p className="text-sm text-[#5A667A] leading-relaxed">{result.analysisText}</p>
          </div>
        )}

        {/* Social proof */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
          <p className="text-xs text-[#5A667A] uppercase tracking-wide font-semibold mb-3">Resultados reais</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-black text-[#004A9D]">98%</p>
              <p className="text-xs text-[#5A667A] mt-0.5">satisfação</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#004A9D]">+1.200</p>
              <p className="text-xs text-[#5A667A] mt-0.5">procedimentos</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#004A9D]">8 anos</p>
              <p className="text-xs text-[#5A667A] mt-0.5">de experiência</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-[#E2E8F0] px-4 py-4 shadow-[0_-4px_16px_rgba(0,74,157,0.06)]">
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => navigate(`/c/${slug}/agendar/${token}`)}
            className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Agendar consulta gratuita
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-xs text-[#A0AABB] text-center mt-2">
            Consulta 100% gratuita e sem compromisso
          </p>
          <p className="text-[10px] text-[#C0CADB] text-center mt-1">
            💡 Imagem sugerida — resultado aproximado, não é garantia. Varia conforme avaliação presencial.
          </p>
        </div>
      </div>
    </div>
  );
}
