import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Camera,
  ArrowCounterClockwise,
  Check,
  CaretRight,
  Lock,
  Sparkle,
  WarningCircle,
  Info,
  Sun,
  X,
  CheckCircle,
  XCircle,
  Lightbulb,
  User,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  FolderOpen,
  Flask,
  PushPin,
  Scissors,
  House,
  DeviceMobile,
  Ruler,
  Prohibit,
  MagnifyingGlass,
  IconContext,
} from "@phosphor-icons/react";
import { useFunnelTheme } from "./useFunnelTheme";
import { FunnelThemeToggle } from "./FunnelThemeToggle";

type PhotoType = "front" | "top" | "left" | "right";

const accentTint = "color-mix(in oklab, var(--fn-accent) 12%, transparent)";
const accentLine = "color-mix(in oklab, var(--fn-accent) 30%, transparent)";
// Cor do guia sobre o vídeo (fundo preto) — teal da marca, fixa
const GUIDE = "#3B82F6";

const PHOTO_STEPS: {
  type: PhotoType;
  label: string;
  Icon: typeof Camera;
  instruction: string;
  guide: string;
  tip: string;
  doList: string[];
  dontList: string[];
  aiAnalysis: string[];
}[] = [
  {
    type: "front",
    label: "Frente",
    Icon: User,
    instruction: "Olhe diretamente para a câmera com o rosto centralizado",
    guide: "Centralize seu rosto no círculo",
    tip: "Câmera na altura exata dos olhos",
    doList: [
      "Olhe diretamente para a câmera",
      "Queixo levemente levantado",
      "Rosto centralizado preenchendo o frame",
      "Câmera na altura exata dos olhos",
      "Expressão neutra, boca fechada",
    ],
    dontList: [
      "Contraluz (janela atrás da cabeça)",
      "Flash direto — cria reflexo",
      "Câmera abaixo do rosto (distorce entradas)",
      "Meio perfil — deve ser frontal 100%",
      "Selfie com câmera frontal de má qualidade",
    ],
    aiAnalysis: [
      "Linha frontal de implantação",
      "Entradas temporais (direita e esquerda)",
      "Simetria facial e densidade frontal",
    ],
  },
  {
    type: "top",
    label: "Topo",
    Icon: ArrowUp,
    instruction: "Braço estendido acima da cabeça, câmera apontando para baixo",
    guide: "Mostre o topo da cabeça centralizado",
    tip: "Peça ajuda a alguém para fotografar de cima",
    doList: [
      "Braço estendido acima, câmera para baixo",
      "Ou: peça para alguém fotografar de cima",
      "Cabeça levemente inclinada para frente",
      "Cabelo seco, penteado para os lados",
    ],
    dontList: [
      "Flash — cria reflexo no couro cabeludo",
      "Cabelo úmido — aparenta 30–50% mais queda",
      "Zoom digital — pixela a análise",
      "Ângulo oblíquo — deve ser perpendicular",
    ],
    aiAnalysis: [
      "Vertex: área central do topo",
      "Coroa: região posterior superior",
      "Padrão de rarefação e falhas circulares",
    ],
  },
  {
    type: "left",
    label: "Lado Esquerdo",
    Icon: ArrowLeft,
    instruction: "Perfil exato 90° — orelha esquerda completamente visível",
    guide: "Mantenha a orelha visível no centro",
    tip: "Perfil fechado 90° — não meio perfil",
    doList: [
      "Perfil exato 90° — orelha esquerda visível",
      "Câmera na altura das têmporas",
      "Olhar para frente, cabeça ereta",
      "Distância: 40–60 cm do rosto",
    ],
    dontList: [
      "Meio perfil (3/4) — deve ser perfil 90°",
      "Ombro cobrindo parte do pescoço",
      "Cabeça inclinada para baixo ou para cima",
      "Câmera muito baixa — distorce linha frontal",
    ],
    aiAnalysis: [
      "Recessão temporal esquerda",
      "Ângulo de recuo da linha frontal",
      "Comparação de simetria com o lado direito",
    ],
  },
  {
    type: "right",
    label: "Lado Direito",
    Icon: ArrowRight,
    instruction: "Perfil exato 90° — orelha direita completamente visível",
    guide: "Mantenha a orelha visível no centro",
    tip: "Mesma iluminação da foto anterior",
    doList: [
      "Perfil exato 90° — orelha direita visível",
      "Câmera na altura das têmporas",
      "Olhar para frente, cabeça ereta",
      "Manter consistência de iluminação",
    ],
    dontList: [
      "Repetir ângulos errados do lado esquerdo",
      "Luz diferente da foto anterior",
      "Meio perfil ou cabeça inclinada",
    ],
    aiAnalysis: [
      "Recessão temporal direita",
      "Confirmação de simetria bilateral",
      "Linha de implantação lateral",
    ],
  },
];

const GENERAL_RULES: { Icon: typeof Camera; text: string }[] = [
  { Icon: Scissors, text: "Cabelo SECO e natural — sem gel, pomada ou fixador" },
  { Icon: House, text: "Fundo neutro: parede branca, cinza ou bege — sem estampas" },
  { Icon: DeviceMobile, text: "Use a câmera TRASEIRA do celular — melhor qualidade" },
  { Icon: Ruler, text: "Distância: 40 a 60 cm do rosto / cabeça" },
  { Icon: Prohibit, text: "Sem óculos, bonés, chapéus ou acessórios na cabeça" },
  { Icon: MagnifyingGlass, text: "Resolução mínima: 720p — não usar zoom digital" },
];

type ScreenState = "disclaimer" | "rules" | "capture";

export default function FunnelPhotos() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const { mode, toggle } = useFunnelTheme();
  const [screen, setScreen] = useState<ScreenState>("disclaimer");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<PhotoType, string | null>>({
    front: null, top: null, left: null, right: null,
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadPhoto = trpc.photos.upload.useMutation();
  const updateStep = trpc.leads.updateStep.useMutation();
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const triggerAI = trpc.ai.processPhotos.useMutation({
    onSuccess: () => navigate(`/c/${slug}/resultado/${token}`),
    onError: (err: unknown) => {
      const currentRetry = retryCount;
      if (currentRetry < MAX_RETRIES) {
        const nextRetry = currentRetry + 1;
        setRetryCount(nextRetry);
        toast.loading(`Tentando novamente... (${nextRetry}/${MAX_RETRIES})`, { id: 'ai-retry' });
        setTimeout(() => {
          triggerAI.mutate({ sessionToken: token ?? "" });
        }, 3000);
      } else {
        toast.dismiss('ai-retry');
        toast.error(err instanceof Error ? err.message : "Erro ao processar. Tente novamente mais tarde.");
        setRetryCount(0);
      }
    },
  });

  const currentStep = PHOTO_STEPS[currentPhotoIndex];
  const capturedCount = Object.values(capturedPhotos).filter(Boolean).length;
  const allCaptured = capturedCount === 4;

  const openCamera = async () => {
    setCameraError(false);
    setShowInstructions(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
      if (currentPhotoIndex === 0) {
        updateStep.mutate({ sessionToken: token ?? "", funnelStep: "photos_started" });
      }
    } catch {
      setCameraError(true);
      toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const closeCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setIsCameraOpen(false);
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    closeCamera();

    setUploading(true);
    try {
      await uploadPhoto.mutateAsync({
        sessionToken: token ?? "",
        photoType: currentStep.type,
        base64: dataUrl,
      });
      setCapturedPhotos((prev) => ({ ...prev, [currentStep.type]: dataUrl }));
      toast.success(`Foto ${currentStep.label} capturada!`);
      if (currentPhotoIndex < PHOTO_STEPS.length - 1) {
        setCurrentPhotoIndex((i) => i + 1);
      }
    } catch {
      toast.error("Erro ao salvar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }, [currentStep, currentPhotoIndex, token, uploadPhoto]);

  const handleFinalize = () => {
    triggerAI.mutate({ sessionToken: token ?? "" });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploading(true);
      try {
        await uploadPhoto.mutateAsync({
          sessionToken: token ?? "",
          photoType: currentStep.type,
          base64: dataUrl,
        });
        setCapturedPhotos((prev) => ({ ...prev, [currentStep.type]: dataUrl }));
        toast.success(`Foto ${currentStep.label} enviada!`);
        if (currentPhotoIndex < PHOTO_STEPS.length - 1) {
          setCurrentPhotoIndex((i) => i + 1);
        }
      } catch {
        toast.error("Erro ao salvar foto. Tente novamente.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove o dark mode do painel (shadcn) — o funil tem o próprio tema (.funnel-theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  const floatingToggle = (
    <FunnelThemeToggle mode={mode} onToggle={toggle} className="fixed top-4 right-4 z-30" />
  );

  // ── TELA 1: DISCLAIMER ─────────────────────────────────────────────────────
  if (screen === "disclaimer") {
    return (
      <IconContext.Provider value={{ weight: "duotone" }}>
      <div className="funnel-theme min-h-[100dvh]">
        {floatingToggle}
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Logo / Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: "var(--fn-accent)" }}>
              <Sparkle className="w-7 h-7" weight="fill" style={{ color: "var(--fn-accent-ink)" }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--fn-ink)" }}>Avaliação Capilar</h1>
            <p className="text-sm mt-1" style={{ color: "var(--fn-muted)" }}>Antes de enviar suas fotos, leia com atenção</p>
          </div>

          {/* Disclaimer card */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: accentTint }}>
                <Info className="w-3.5 h-3.5" style={{ color: "var(--fn-accent)" }} />
              </div>
              <h2 className="font-bold text-sm" style={{ color: "var(--fn-ink)" }}>Ao enviar suas fotos, você concorda:</h2>
            </div>
            <ol className="space-y-3">
              {[
                "Esta análise é uma avaliação visual gerada por inteligência artificial, com fins ilustrativos e de pré-qualificação. Não substitui avaliação clínica presencial.",
                "A Homenz Advanced realiza tratamentos capilares estéticos: micropigmentação e fibras capilares. Não realizamos transplante capilar nem implante de fios.",
                "A imagem simulada do \"depois\" representa o resultado visual possível dos nossos tratamentos, e não garante resultado idêntico. Cada caso é único.",
                "Suas fotos são criptografadas, usadas exclusivamente para análise capilar e não serão compartilhadas com terceiros.",
                "Um especialista Homenz entrará em contato para apresentar o protocolo ideal para o seu caso.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center mt-0.5" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}>
                    {i + 1}
                  </span>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--fn-muted)" }}>{item}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Important note */}
          <div className="rounded-2xl p-4 mb-6" style={{ background: "color-mix(in oklab, #f59e0b 10%, transparent)", border: "1px solid color-mix(in oklab, #f59e0b 22%, transparent)" }}>
            <div className="flex items-start gap-2.5">
              <WarningCircle className="w-5 h-5 flex-shrink-0 mt-0.5" weight="fill" style={{ color: "#f59e0b" }} />
              <div>
                <p className="text-xs font-bold mb-1" style={{ color: "var(--fn-ink)" }}>Realidade dos nossos tratamentos</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--fn-muted)" }}>
                  Trabalhamos com o cabelo <strong style={{ color: "var(--fn-body)" }}>existente</strong> como referência visual. Nossos tratamentos potencializam, preenchem e harmonizam o que já existe. Casos com calvície total em determinada região limitam o resultado visual nessa área — mas você <strong style={{ color: "var(--fn-body)" }}>sempre</strong> será encaminhado ao nosso time para avaliação completa.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen("rules")}
            className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-opacity"
            style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
          >
            Entendi — ver como fotografar
            <CaretRight className="w-5 h-5" weight="bold" />
          </button>
        </div>
      </div>
      </IconContext.Provider>
    );
  }

  // ── TELA 2: REGRAS GERAIS + ILUMINAÇÃO ────────────────────────────────────
  if (screen === "rules") {
    return (
      <IconContext.Provider value={{ weight: "duotone" }}>
      <div className="funnel-theme min-h-[100dvh]">
        {floatingToggle}
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3" style={{ background: "var(--fn-accent)" }}>
              <Camera className="w-7 h-7" style={{ color: "var(--fn-accent-ink)" }} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--fn-ink)" }}>Como fotografar corretamente</h1>
            <p className="text-sm mt-1" style={{ color: "var(--fn-muted)" }}>Siga estas regras para obter a melhor análise</p>
          </div>

          {/* Regras gerais */}
          <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <h2 className="font-bold text-sm mb-3 flex items-center gap-1.5" style={{ color: "var(--fn-ink)" }}>
              <PushPin className="w-4 h-4" style={{ color: "var(--fn-accent)" }} /> Regras gerais — válidas para as 4 fotos
            </h2>
            <div className="space-y-2.5">
              {GENERAL_RULES.map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <rule.Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--fn-accent)" }} />
                  <p className="text-xs leading-relaxed" style={{ color: "var(--fn-muted)" }}>{rule.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guia de iluminação */}
          <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4" weight="fill" style={{ color: "#f59e0b" }} />
              <h2 className="font-bold text-sm" style={{ color: "var(--fn-ink)" }}>Guia de iluminação</h2>
            </div>
            <p className="text-[10px] mb-3" style={{ color: "var(--fn-muted)" }}>A iluminação é o fator que mais compromete a análise. Uma boa foto pode fazer a diferença entre Norwood III e V na leitura da IA.</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 text-center" style={{ background: "color-mix(in oklab, var(--fn-accent) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--fn-accent) 22%, transparent)" }}>
                <CheckCircle className="w-4 h-4 mx-auto mb-1.5" weight="fill" style={{ color: "var(--fn-accent)" }} />
                <p className="text-[10px] font-bold mb-1" style={{ color: "var(--fn-accent)" }}>Ideal</p>
                <p className="text-[9px] leading-tight" style={{ color: "var(--fn-muted)" }}>Luz natural indireta (janela lateral) ou ring light frontal a 50–70 cm</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "color-mix(in oklab, #f59e0b 10%, transparent)", border: "1px solid color-mix(in oklab, #f59e0b 22%, transparent)" }}>
                <WarningCircle className="w-4 h-4 mx-auto mb-1.5" weight="fill" style={{ color: "#fbbf24" }} />
                <p className="text-[10px] font-bold mb-1" style={{ color: "#fbbf24" }}>Aceitável</p>
                <p className="text-[9px] leading-tight" style={{ color: "var(--fn-muted)" }}>Lâmpada LED no teto, sem sombras fortes, ambiente bem iluminado</p>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "color-mix(in oklab, #ef4444 10%, transparent)", border: "1px solid color-mix(in oklab, #ef4444 22%, transparent)" }}>
                <XCircle className="w-4 h-4 mx-auto mb-1.5" weight="fill" style={{ color: "#f87171" }} />
                <p className="text-[10px] font-bold mb-1" style={{ color: "#f87171" }}>Inválido</p>
                <p className="text-[9px] leading-tight" style={{ color: "var(--fn-muted)" }}>Contraluz, flash direto, sombras no couro cabeludo, ambiente escuro</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 rounded-lg p-2.5" style={{ background: "color-mix(in oklab, #f59e0b 8%, transparent)" }}>
              <Lightbulb className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" weight="fill" style={{ color: "#fbbf24" }} />
              <p className="text-[10px]" style={{ color: "var(--fn-muted)" }}>Evite luz amarela incandescente no teto — satura a cor do couro cabeludo.</p>
            </div>
          </div>

          <button
            onClick={() => setScreen("capture")}
            className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-opacity"
            style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
          >
            <Camera className="w-5 h-5" />
            Pronto — começar a fotografar
            <CaretRight className="w-5 h-5" weight="bold" />
          </button>
        </div>
      </div>
      </IconContext.Provider>
    );
  }

  // ── TELA 3: CAPTURA DAS FOTOS ─────────────────────────────────────────────
  return (
    <IconContext.Provider value={{ weight: "duotone" }}>
    <div className="funnel-theme min-h-[100dvh]">
      {floatingToggle}
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{ background: "color-mix(in oklab, var(--fn-bg) 88%, transparent)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--fn-line)" }}
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-bold text-sm" style={{ color: "var(--fn-ink)" }}>Captura de Fotos</h1>
              <p className="text-xs" style={{ color: "var(--fn-muted)" }}>Envie suas fotos para avaliação capilar</p>
            </div>
            <span className="text-sm font-bold pr-12" style={{ color: "var(--fn-accent)" }}>{capturedCount}/4</span>
          </div>
          <div className="flex gap-1.5">
            {PHOTO_STEPS.map((s, i) => (
              <div
                key={s.type}
                className="h-1.5 flex-1 rounded-full transition-all duration-500"
                style={{
                  background: capturedPhotos[s.type]
                    ? "var(--fn-success)"
                    : i === currentPhotoIndex
                    ? "var(--fn-accent)"
                    : "var(--fn-line)",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Camera view */}
        {isCameraOpen ? (
          <div className="fn-msg">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4] shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-64 rounded-full border-2 border-dashed" style={{ borderColor: `${GUIDE}cc`, boxShadow: `0 0 20px ${GUIDE}4d` }} />
              </div>
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { x: "50%", y: "12%", label: "Topo" },
                  { x: "50%", y: "88%", label: "Queixo" },
                  { x: "12%", y: "50%", label: "Esq" },
                  { x: "88%", y: "50%", label: "Dir" },
                ].map((pt) => (
                  <div
                    key={pt.label}
                    className="absolute flex flex-col items-center"
                    style={{ left: pt.x, top: pt.y, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: GUIDE, boxShadow: `0 0 8px ${GUIDE}cc` }} />
                    <span className="text-[9px] font-bold mt-0.5 bg-black/60 px-1 rounded" style={{ color: GUIDE }}>
                      {pt.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute top-3 left-0 right-0 text-center px-4">
                <div className="bg-black/70 backdrop-blur rounded-full px-4 py-1.5 inline-flex items-center gap-1.5">
                  <currentStep.Icon className="w-3.5 h-3.5 text-white" />
                  <p className="text-xs font-medium text-white">{currentStep.label}</p>
                </div>
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center px-4">
                <div className="bg-black/70 backdrop-blur rounded-xl px-4 py-2 inline-block">
                  <p className="text-xs font-medium text-white">{currentStep.guide}</p>
                  <p className="text-[10px] text-white/70 mt-0.5">{currentStep.tip}</p>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 mt-4">
              <button
                onClick={closeCamera}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm transition-colors"
                style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)", color: "var(--fn-muted)" }}
              >
                <ArrowCounterClockwise className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 font-bold rounded-xl py-3.5 text-sm disabled:opacity-60 transition-opacity"
                style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "var(--fn-accent-ink)", borderTopColor: "transparent" }} />
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    Capturar foto
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Photo grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              {PHOTO_STEPS.map((step, i) => {
                const captured = !!capturedPhotos[step.type];
                const isCurrent = i === currentPhotoIndex;
                return (
                  <div
                    key={step.type}
                    onClick={() => {
                      if (!capturedPhotos[step.type]) {
                        setCurrentPhotoIndex(i);
                        openCamera();
                      }
                    }}
                    className="relative aspect-square rounded-xl overflow-hidden border-2 border-dashed transition-all cursor-pointer"
                    style={{
                      borderColor: captured
                        ? "var(--fn-success)"
                        : isCurrent
                        ? "var(--fn-accent)"
                        : "var(--fn-line)",
                      borderStyle: captured ? "solid" : isCurrent ? "dashed" : "solid",
                    }}
                  >
                    {capturedPhotos[step.type] ? (
                      <>
                        <img
                          src={capturedPhotos[step.type]!}
                          alt={step.label}
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "var(--fn-success)" }}>
                          <Check className="w-3.5 h-3.5 text-white" weight="bold" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-2 py-2 flex items-center justify-between gap-1">
                          <p className="text-xs text-white font-semibold truncate">{step.label}</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentPhotoIndex(i);
                              openCamera();
                            }}
                            className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-white hover:bg-white/40 active:scale-95 transition-all"
                          >
                            <ArrowCounterClockwise className="w-3 h-3" weight="bold" /> Refazer
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ background: isCurrent ? accentTint : "var(--fn-elevated)" }}>
                        <step.Icon className="w-8 h-8" style={{ color: isCurrent ? "var(--fn-accent)" : "var(--fn-muted)" }} />
                        <p className="text-xs font-medium text-center px-2" style={{ color: "var(--fn-muted)" }}>{step.label}</p>
                        {isCurrent && (
                          <span className="text-[10px] font-semibold animate-pulse" style={{ color: "var(--fn-accent)" }}>Toque para fotografar</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Camera error */}
            {cameraError && (
              <div className="flex items-start gap-3 rounded-xl p-4 mb-4" style={{ background: "color-mix(in oklab, #f59e0b 10%, transparent)", border: "1px solid color-mix(in oklab, #f59e0b 22%, transparent)" }}>
                <WarningCircle className="w-5 h-5 flex-shrink-0 mt-0.5" weight="fill" style={{ color: "#fbbf24" }} />
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--fn-ink)" }}>Não detectamos uma câmera</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--fn-muted)" }}>Conecte uma câmera, permita o acesso ou abra esta página no seu celular. Você também pode enviar uma foto da galeria.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs font-semibold underline inline-flex items-center gap-1"
                    style={{ color: "var(--fn-accent)" }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Enviar foto da galeria
                  </button>
                </div>
              </div>
            )}

            {/* Current step instruction card with do/don't */}
            {!allCaptured && (
              <div className="rounded-xl p-4 mb-4" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: "var(--fn-muted)" }}>Próxima foto</p>
                    <p className="font-bold text-sm mt-0.5 flex items-center gap-1.5" style={{ color: "var(--fn-ink)" }}>
                      <currentStep.Icon className="w-4 h-4" style={{ color: "var(--fn-accent)" }} /> Foto {currentPhotoIndex + 1} de 4: {currentStep.label}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg"
                    style={{ background: accentTint, color: "var(--fn-accent)" }}
                  >
                    <Info className="w-3 h-3" />
                    {showInstructions ? "Fechar" : "Ver dicas"}
                  </button>
                </div>
                <p className="text-xs" style={{ color: "var(--fn-muted)" }}>{currentStep.instruction}</p>

                {showInstructions && (
                  <div className="mt-3 space-y-3 fn-msg">
                    {/* Do list */}
                    <div>
                      <p className="text-[10px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--fn-accent)" }}>
                        <CheckCircle className="w-3 h-3" weight="fill" /> Como fazer
                      </p>
                      <div className="space-y-1">
                        {currentStep.doList.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 flex-shrink-0 mt-0.5" weight="bold" style={{ color: "var(--fn-accent)" }} />
                            <p className="text-[10px]" style={{ color: "var(--fn-muted)" }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Don't list */}
                    <div>
                      <p className="text-[10px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "#f87171" }}>
                        <XCircle className="w-3 h-3" weight="fill" /> Evitar
                      </p>
                      <div className="space-y-1">
                        {currentStep.dontList.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <X className="w-3 h-3 flex-shrink-0 mt-0.5" weight="bold" style={{ color: "#f87171" }} />
                            <p className="text-[10px]" style={{ color: "var(--fn-muted)" }}>{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* AI analysis */}
                    <div className="rounded-lg p-2.5" style={{ background: accentTint }}>
                      <p className="text-[10px] font-bold mb-1.5 flex items-center gap-1" style={{ color: "var(--fn-accent)" }}>
                        <Flask className="w-3 h-3" weight="fill" /> O que será avaliado nesta foto
                      </p>
                      <div className="space-y-1">
                        {currentStep.aiAnalysis.map((item, i) => (
                          <p key={i} className="text-[10px]" style={{ color: "var(--fn-muted)" }}>• {item}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Action button */}
            {allCaptured ? (
              <button
                onClick={handleFinalize}
                disabled={triggerAI.isPending}
                className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
              >
                {triggerAI.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--fn-accent-ink)", borderTopColor: "transparent" }} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Sparkle className="w-5 h-5" weight="fill" />
                    Enviar fotos
                    <CaretRight className="w-5 h-5" weight="bold" />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={openCamera}
                  disabled={uploading}
                  className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
                >
                  {uploading ? (
                    <><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--fn-accent-ink)", borderTopColor: "transparent" }} /> Enviando...</>
                  ) : (
                    <><Camera className="w-5 h-5" /> Tirar foto: {currentStep.label}</>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full font-medium py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)", color: "var(--fn-muted)" }}
                >
                  <FolderOpen className="w-4 h-4" /> Enviar foto da galeria
                </button>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Lock className="w-3.5 h-3.5" style={{ color: "var(--fn-muted)" }} />
              <p className="text-xs" style={{ color: "var(--fn-muted)" }}>
                Suas fotos são criptografadas e usadas apenas para sua avaliação
              </p>
            </div>
          </>
        )}
      </div>
    </div>
    </IconContext.Provider>
  );
}
