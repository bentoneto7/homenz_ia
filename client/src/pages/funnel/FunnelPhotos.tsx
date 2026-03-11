import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Camera, RotateCcw, Check, ChevronRight, Lock, Sparkles, AlertCircle } from "lucide-react";

type PhotoType = "front" | "top" | "left" | "right";

const PHOTO_STEPS: {
  type: PhotoType;
  label: string;
  instruction: string;
  icon: string;
  guide: string;
  tip: string;
}[] = [
  {
    type: "front",
    label: "Frente",
    instruction: "Olhe diretamente para a câmera com o rosto centralizado",
    icon: "👤",
    guide: "Centralize seu rosto no círculo",
    tip: "Boa iluminação frontal ajuda muito",
  },
  {
    type: "top",
    label: "Topo",
    instruction: "Incline a cabeça para baixo mostrando o topo do couro cabeludo",
    icon: "⬆️",
    guide: "Mostre o topo da cabeça centralizado",
    tip: "Peça ajuda a alguém para fotografar de cima",
  },
  {
    type: "left",
    label: "Lado Esquerdo",
    instruction: "Vire o rosto para a direita mostrando o lado esquerdo",
    icon: "◀️",
    guide: "Mantenha a orelha visível no centro",
    tip: "Perfil completo — da testa até a nuca",
  },
  {
    type: "right",
    label: "Lado Direito",
    instruction: "Vire o rosto para a esquerda mostrando o lado direito",
    icon: "▶️",
    guide: "Mantenha a orelha visível no centro",
    tip: "Perfil completo — da testa até a nuca",
  },
];

export default function FunnelPhotos() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState<Record<PhotoType, string | null>>({
    front: null, top: null, left: null, right: null,
  });
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Garantir tema claro no funil público (remove dark mode se ativo)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    return () => {};
  }, []);

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

              {/* Dark vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20 pointer-events-none" />

              {/* Oval guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-52 h-64 rounded-full border-2 border-[#D4A843]/80 border-dashed shadow-[0_0_20px_rgba(212,168,67,0.3)]" />
              </div>

              {/* Keypoints overlay */}
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

              {/* Top instruction */}
              <div className="absolute top-3 left-0 right-0 text-center px-4">
                <div className="bg-black/70 backdrop-blur rounded-full px-4 py-1.5 inline-block">
                  <p className="text-xs font-medium text-[#0A2540]">{currentStep.icon} {currentStep.label}</p>
                </div>
              </div>

              {/* Bottom guide */}
              <div className="absolute bottom-4 left-0 right-0 text-center px-4">
                <div className="bg-black/70 backdrop-blur rounded-xl px-4 py-2 inline-block">
                  <p className="text-xs font-medium text-[#0A2540]">{currentStep.guide}</p>
                  <p className="text-[10px] text-[#5A667A] mt-0.5">{currentStep.tip}</p>
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
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                        <Check className="w-3 h-3 text-[#0A2540]" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                        <p className="text-xs text-[#0A2540] font-semibold">{step.label}</p>
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
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Câmera não disponível</p>
                  <p className="text-xs text-[#5A667A] mt-0.5">Permita o acesso à câmera nas configurações do navegador e tente novamente.</p>
                </div>
              </div>
            )}

            {/* Current step instruction */}
            {!allCaptured && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-4">
                <p className="text-xs text-[#5A667A] mb-1 uppercase tracking-wide font-semibold">Próxima foto</p>
                <p className="font-semibold text-sm mb-1">
                  {currentStep.icon} Foto {currentPhotoIndex + 1} de 4: {currentStep.label}
                </p>
                <p className="text-xs text-[#5A667A]">{currentStep.instruction}</p>
              </div>
            )}

            {/* Action button */}
            {allCaptured ? (
              <button
                onClick={handleFinalize}
                disabled={triggerAI.isPending}
                className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              >
                {triggerAI.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
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
              <button
                onClick={openCamera}
                className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Fotografar: {currentStep.label}
              </button>
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
