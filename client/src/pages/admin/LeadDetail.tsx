import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, TrendingUp, Camera, Brain, Calendar } from "lucide-react";

const STEP_LABELS: Record<string, string> = {
  landing: "Landing", chat_started: "Chat iniciado", chat_completed: "Chat completo",
  photos_started: "Fotos iniciadas", photos_done: "Fotos enviadas",
  ai_processing: "IA processando", ai_done: "IA concluída",
  scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluído", abandoned: "Abandonado",
};

export default function AdminLeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated } = useAuth();

  const { data: lead, isLoading } = trpc.leads.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id && isAuthenticated }
  );
  const { data: photos } = trpc.photos.listByLeadId.useQuery(
    { leadId: Number(id) },
    { enabled: !!id && isAuthenticated }
  );
  const { data: aiResult } = trpc.ai.getResultByLeadId.useQuery(
    { leadId: Number(id) },
    { enabled: !!id && isAuthenticated }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Lead não encontrado</p>
          <Button onClick={() => navigate("/painel/leads")} variant="outline">Voltar</Button>
        </div>
      </div>
    );
  }

  const score = lead.leadScore ?? 0;
  const scoreColor = score >= 70 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-500";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/painel/leads")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-sm">{lead.name}</h1>
            <p className="text-xs text-muted-foreground">{STEP_LABELS[lead.funnelStep] ?? lead.funnelStep}</p>
          </div>
          {score > 0 && (
            <div className="flex items-center gap-1">
              <TrendingUp className={`w-4 h-4 ${scoreColor}`} />
              <span className={`font-bold text-sm ${scoreColor}`}>{score}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        {/* Contact info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-3">Informações de contato</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${lead.phone}`} className="hover:text-primary">{lead.phone}</a>
            </div>
            {lead.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="hover:text-primary">{lead.email}</a>
              </div>
            )}
            {lead.utmSource && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs">Origem:</span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {lead.utmSource}{lead.utmCampaign ? ` / ${lead.utmCampaign}` : ""}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Cadastrado em {new Date(lead.createdAt).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        {/* Chat answers */}
        {(() => {
          const answers = lead.chatAnswers as Record<string, unknown> | null;
          if (!answers || typeof answers !== 'object') return null;
          const entries = Object.entries(answers);
          if (entries.length === 0) return null;
          return (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold text-sm mb-3">Respostas do chat</h2>
            <div className="space-y-2">
              {entries.map(([k, v]) => (
                <div key={k} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground capitalize min-w-[120px]">{k.replace(/_/g, " ")}:</span>
                  <span className="font-medium">{String(v ?? "")}</span>
                </div>
              ))}
            </div>
          </div>
          );
        })()}

        {/* Photos */}
        {photos && photos.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Fotos capturadas ({photos.length})</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {photos.map((photo) => (
                <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                  <img src={photo.s3Url} alt={photo.photoType} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5 capitalize">
                    {photo.photoType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Result */}
        {aiResult && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-purple-500" />
              <h2 className="font-semibold text-sm">Análise de IA</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full ml-auto ${
                aiResult.processingStatus === "done" ? "bg-emerald-500/20 text-emerald-600" :
                aiResult.processingStatus === "processing" ? "bg-amber-500/20 text-amber-600" :
                "bg-red-500/20 text-red-600"
              }`}>
                {aiResult.processingStatus}
              </span>
            </div>

            {aiResult.beforeImageUrl && aiResult.afterImageUrl && (
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={aiResult.beforeImageUrl} alt="Antes" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">Antes</div>
                </div>
                <div className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={aiResult.afterImageUrl} alt="Depois" className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded">Depois</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Escala</p>
                <p className="text-sm font-bold text-primary">{aiResult.baldnessScale ?? "—"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Nível</p>
                <p className="text-sm font-bold capitalize">{aiResult.baldnessLevel ?? "—"}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">Score</p>
                <p className={`text-sm font-bold ${scoreColor}`}>{aiResult.leadScore ?? "—"}</p>
              </div>
            </div>

            {aiResult.analysisText && (
              <p className="text-xs text-muted-foreground leading-relaxed">{aiResult.analysisText}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
