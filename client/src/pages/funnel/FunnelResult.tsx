import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChevronRight, Loader2, Star, TrendingUp, AlertCircle } from "lucide-react";

export default function FunnelResult() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();

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

  if (isLoading || result?.processingStatus === "processing" || result?.processingStatus === "pending") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-6 pulse-gold">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-bold mb-2">Analisando suas fotos...</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Nossa IA está processando suas imagens e gerando a visualização do resultado.
          </p>
          <div className="space-y-2 text-left bg-card border border-border rounded-xl p-4">
            {[
              "Detectando pontos-chave do couro cabeludo",
              "Calculando nível e padrão de calvície",
              "Gerando visualização pós-preenchimento",
              "Calculando seu score de qualificação",
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || result?.processingStatus === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro no processamento</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Não foi possível processar suas fotos. Por favor, tente novamente.
          </p>
          <Button onClick={() => navigate(`/c/${slug}/fotos/${token}`)} variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const score = result.leadScore ?? 0;
  const scoreColor = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500";
  const scoreLabel = score >= 70 ? "Alto potencial" : score >= 40 ? "Potencial médio" : "Requer avaliação";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="gradient-dark px-4 pt-8 pb-12">
        <div className="max-w-lg mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs mb-4">
            <Star className="w-3 h-3 text-primary" />
            Análise personalizada por IA
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Seu resultado está pronto!</h1>
          <p className="text-white/60 text-sm">Veja como você ficará após o preenchimento capilar</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-6">
        {/* Before/After */}
        {(result.beforeImageUrl || result.afterImageUrl) && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
            <div className="grid grid-cols-2">
              <div className="relative">
                {result.beforeImageUrl && (
                  <img
                    src={result.beforeImageUrl}
                    alt="Antes"
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  Antes
                </div>
              </div>
              <div className="relative">
                {result.afterImageUrl && (
                  <img
                    src={result.afterImageUrl}
                    alt="Depois"
                    className="w-full aspect-square object-cover"
                  />
                )}
                <div className="absolute bottom-2 right-2 gradient-gold text-white text-xs px-2 py-0.5 rounded">
                  Depois ✨
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Score */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Seu perfil capilar</h2>
            <div className="flex items-center gap-1">
              <TrendingUp className={`w-4 h-4 ${scoreColor}`} />
              <span className={`text-sm font-bold ${scoreColor}`}>{scoreLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Escala de calvície</p>
              <p className="text-lg font-bold text-primary">{result.baldnessScale ?? "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Nível</p>
              <p className="text-lg font-bold capitalize">{result.baldnessLevel ?? "N/A"}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Sessões estimadas</p>
              <p className="text-lg font-bold text-primary">{result.estimatedSessions ?? "2-3"}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Score</p>
              <p className={`text-lg font-bold ${scoreColor}`}>{score}/100</p>
            </div>
          </div>

          {result.analysisText && (
            <div className="bg-muted/30 rounded-xl p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">{result.analysisText}</p>
            </div>
          )}
        </div>

        {/* Recomendação */}
        {result.recommendedTreatment && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 mb-4">
            <h3 className="font-semibold text-primary mb-2">Tratamento recomendado</h3>
            <p className="text-sm text-foreground">{result.recommendedTreatment}</p>
          </div>
        )}

        {/* CTA */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-1">Pronto para transformar seu visual?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Agende sua consulta gratuita e descubra como o preenchimento capilar pode mudar sua vida.
          </p>
          <Button
            onClick={() => navigate(`/c/${slug}/agendar/${token}`)}
            className="w-full gradient-gold text-white border-0 py-5 text-base"
          >
            Agendar consulta gratuita
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Consulta 100% gratuita e sem compromisso
          </p>
        </div>
      </div>
    </div>
  );
}
