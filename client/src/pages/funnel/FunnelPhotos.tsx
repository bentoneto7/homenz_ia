import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Camera,
  RotateCcw,
  Check,
  ChevronRight,
  Lock,
  Sparkles,
  AlertCircle,
  Info,
  Sun,
  X,
  CheckCircle2,
  XCircle,
  Lightbulb,
} from "lucide-react";

type PhotoType = "front" | "top" | "left" | "right";

const PHOTO_STEPS: {
  type: PhotoType;
  label: string;
  icon: string;
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
    icon: "👤",
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
    icon: "⬆️",
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
    icon: "◀️",
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
    icon: "▶️",
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

type ScreenState = "disclaimer" | "rules" | "capture";

export default function FunnelPhotos() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
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
  const triggerAI = trpc.ai.processPhotos.useMutation({
    onSuccess: () => navigate(`/c/${slug}/resultado/${token}`),
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao processar"),
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
      toast.success(`✅ Foto ${currentStep.label} capturada!`);
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
        toast.success(`✅ Foto ${currentStep.label} enviada!`);
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

  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    return () => {};
  }, []);

  // ── TELA 1: DISCLAIMER ─────────────────────────────────────────────────────
  if (screen === "disclaimer") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] text-[#0A2540]">
        <div className="max-w-lg mx-auto px-4 py-8">
          {/* Logo / Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#004A9D] mb-3">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#0A2540]">Análise Capilar com IA</h1>
            <p className="text-sm text-[#5A667A] mt-1">Antes de enviar suas fotos, leia com atenção</p>
          </div>

          {/* Disclaimer card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-[#EBF4FF] flex items-center justify-center flex-shrink-0">
                <Info className="w-3.5 h-3.5 text-[#004A9D]" />
              </div>
              <h2 className="font-bold text-sm text-[#0A2540]">Ao enviar suas fotos, você concorda:</h2>
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
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#004A9D] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-[#5A667A] leading-relaxed">{item}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Important note */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Realidade dos nossos tratamentos</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Trabalhamos com o cabelo <strong>existente</strong> como referência visual. Nossos tratamentos potencializam, preenchem e harmonizam o que já existe. Casos com calvície total em determinada região limitam o resultado visual nessa área — mas você <strong>sempre</strong> será encaminhado ao nosso time para avaliação completa.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setScreen("rules")}
            className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-colors"
          >
            Entendi — ver como fotografar
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ── TELA 2: REGRAS GERAIS + ILUMINAÇÃO ────────────────────────────────────
  if (screen === "rules") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] text-[#0A2540]">
        <div className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#004A9D] mb-3">
              <Camera className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-[#0A2540]">Como fotografar corretamente</h1>
            <p className="text-sm text-[#5A667A] mt-1">Siga estas regras para obter a melhor análise</p>
          </div>

          {/* Regras gerais */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-4">
            <h2 className="font-bold text-sm text-[#0A2540] mb-3">📌 Regras gerais — válidas para as 4 fotos</h2>
            <div className="space-y-2">
              {[
                { icon: "💇", text: "Cabelo SECO e natural — sem gel, pomada ou fixador" },
                { icon: "🏠", text: "Fundo neutro: parede branca, cinza ou bege — sem estampas" },
                { icon: "📱", text: "Use a câmera TRASEIRA do celular — melhor qualidade" },
                { icon: "📏", text: "Distância: 40 a 60 cm do rosto / cabeça" },
                { icon: "🚫", text: "Sem óculos, bonés, chapéus ou acessórios na cabeça" },
                { icon: "🔍", text: "Resolução mínima: 720p — não usar zoom digital" },
              ].map((rule, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span className="text-base flex-shrink-0">{rule.icon}</span>
                  <p className="text-xs text-[#5A667A] leading-relaxed">{rule.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guia de iluminação */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold text-sm text-[#0A2540]">Guia de iluminação</h2>
            </div>
            <p className="text-[10px] text-[#5A667A] mb-3">A iluminação é o fator que mais compromete a análise. Uma boa foto pode fazer a diferença entre Norwood III e V na leitura da IA.</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1.5" />
                <p className="text-[10px] font-bold text-emerald-800 mb-1">✅ Ideal</p>
                <p className="text-[9px] text-emerald-700 leading-tight">Luz natural indireta (janela lateral) ou ring light frontal a 50–70 cm</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <AlertCircle className="w-4 h-4 text-amber-500 mx-auto mb-1.5" />
                <p className="text-[10px] font-bold text-amber-800 mb-1">⚠️ Aceitável</p>
                <p className="text-[9px] text-amber-700 leading-tight">Lâmpada LED no teto, sem sombras fortes, ambiente bem iluminado</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <XCircle className="w-4 h-4 text-red-500 mx-auto mb-1.5" />
                <p className="text-[10px] font-bold text-red-800 mb-1">❌ Inválido</p>
                <p className="text-[9px] text-red-700 leading-tight">Contraluz, flash direto, sombras no couro cabeludo, ambiente escuro</p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2 bg-amber-50 rounded-lg p-2.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-700">Evite luz amarela incandescente no teto — satura a cor do couro cabeludo.</p>
            </div>
          </div>

          <button
            onClick={() => setScreen("capture")}
            className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Pronto — começar a fotografar
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // ── TELA 3: CAPTURA DAS FOTOS ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] text-[#0A2540]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E2E8F0] px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="font-bold text-sm text-[#0A2540]">Captura de Fotos</h1>
              <p className="text-xs text-[#5A667A]">Para análise capilar com IA</p>
            </div>
            <span className="text-sm font-bold text-[#004A9D]">{capturedCount}/4</span>
          </div>
          <div className="flex gap-1.5">
            {PHOTO_STEPS.map((s, i) => (
              <div
                key={s.type}
                className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  capturedPhotos[s.type]
                    ? "bg-emerald-500"
                    : i === currentPhotoIndex
                    ? "bg-[#004A9D]"
                    : "bg-[#E2E8F0]"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Camera view */}
        {isCameraOpen ? (
          <div className="animate-in fade-in duration-300">
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
                <div className="w-52 h-64 rounded-full border-2 border-[#D4A843]/80 border-dashed shadow-[0_0_20px_rgba(212,168,67,0.3)]" />
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
                    <div className="w-2.5 h-2.5 rounded-full bg-[#D4A843] shadow-[0_0_8px_rgba(212,168,67,0.8)] animate-pulse" />
                    <span className="text-[9px] text-[#D4A843] font-bold mt-0.5 bg-black/60 px-1 rounded">
                      {pt.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute top-3 left-0 right-0 text-center px-4">
                <div className="bg-black/70 backdrop-blur rounded-full px-4 py-1.5 inline-block">
                  <p className="text-xs font-medium text-white">{currentStep.icon} {currentStep.label}</p>
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
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-[#E2E8F0] rounded-xl py-3.5 text-sm text-[#5A667A] hover:bg-[#EBF4FF] transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#004A9D] hover:bg-[#003d85] text-white font-bold rounded-xl py-3.5 text-sm disabled:opacity-60 transition-colors"
              >
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
              {PHOTO_STEPS.map((step, i) => (
                <div
                  key={step.type}
                  onClick={() => {
                    if (!capturedPhotos[step.type]) {
                      setCurrentPhotoIndex(i);
                      openCamera();
                    }
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    capturedPhotos[step.type]
                      ? "border-emerald-500"
                      : i === currentPhotoIndex
                      ? "border-[#004A9D] border-dashed shadow-[0_0_12px_rgba(0,74,157,0.15)]"
                      : "border-[#E2E8F0]"
                  }`}
                >
                  {capturedPhotos[step.type] ? (
                    <>
                      <img
                        src={capturedPhotos[step.type]!}
                        alt={step.label}
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                        <p className="text-xs text-white font-semibold">{step.label}</p>
                      </div>
                    </>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${i === currentPhotoIndex ? "bg-[#EBF4FF]" : "bg-[#F8FAFC]"}`}>
                      <span className="text-3xl">{step.icon}</span>
                      <p className="text-xs font-medium text-center px-2 text-[#5A667A]">{step.label}</p>
                      {i === currentPhotoIndex && (
                        <span className="text-[10px] text-[#004A9D] font-semibold animate-pulse">Toque para fotografar</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Camera error */}
            {cameraError && (
              <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-700">Câmera não disponível</p>
                  <p className="text-xs text-[#5A667A] mt-0.5">Permita o acesso à câmera ou envie uma foto da galeria.</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 text-xs text-[#004A9D] font-semibold underline"
                  >
                    📁 Enviar da galeria
                  </button>
                </div>
              </div>
            )}

            {/* Current step instruction card with do/don't */}
            {!allCaptured && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-[#5A667A] uppercase tracking-wide font-semibold">Próxima foto</p>
                    <p className="font-bold text-sm mt-0.5">
                      {currentStep.icon} Foto {currentPhotoIndex + 1} de 4: {currentStep.label}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="flex items-center gap-1 text-[10px] text-[#004A9D] font-semibold bg-[#EBF4FF] px-2.5 py-1.5 rounded-lg"
                  >
                    <Info className="w-3 h-3" />
                    {showInstructions ? "Fechar" : "Ver dicas"}
                  </button>
                </div>
                <p className="text-xs text-[#5A667A]">{currentStep.instruction}</p>

                {showInstructions && (
                  <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                    {/* Do list */}
                    <div>
                      <p className="text-[10px] font-bold text-emerald-700 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Como fazer
                      </p>
                      <div className="space-y-1">
                        {currentStep.doList.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-[#5A667A]">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Don't list */}
                    <div>
                      <p className="text-[10px] font-bold text-red-600 mb-1.5 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Evitar
                      </p>
                      <div className="space-y-1">
                        {currentStep.dontList.map((item, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <X className="w-3 h-3 text-red-400 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-[#5A667A]">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* AI analysis */}
                    <div className="bg-[#EBF4FF] rounded-lg p-2.5">
                      <p className="text-[10px] font-bold text-[#004A9D] mb-1.5 flex items-center gap-1">
                        🔬 O que a IA analisa nesta foto
                      </p>
                      <div className="space-y-1">
                        {currentStep.aiAnalysis.map((item, i) => (
                          <p key={i} className="text-[10px] text-[#5A667A]">• {item}</p>
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
                className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              >
                {triggerAI.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Gerar minha análise 3D com IA
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={openCamera}
                  disabled={uploading}
                  className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {uploading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando...</>
                  ) : (
                    <><Camera className="w-5 h-5" /> Fotografar: {currentStep.label}</>
                  )}
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full bg-white border border-[#E2E8F0] text-[#5A667A] font-medium py-3 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#F8FAFC] transition-colors disabled:opacity-60"
                >
                  📁 Enviar da galeria
                </button>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Lock className="w-3.5 h-3.5 text-[#A0AABB]" />
              <p className="text-xs text-[#A0AABB]">
                Suas fotos são criptografadas e usadas apenas para análise capilar
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
