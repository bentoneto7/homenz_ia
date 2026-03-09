import { useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, RotateCcw, Check, ChevronRight, Info } from "lucide-react";

type PhotoType = "front" | "top" | "left" | "right";

const PHOTO_STEPS: {
  type: PhotoType;
  label: string;
  instruction: string;
  icon: string;
  guide: string;
}[] = [
  {
    type: "front",
    label: "Frente",
    instruction: "Olhe diretamente para a câmera, mantenha o rosto centralizado",
    icon: "👤",
    guide: "Posicione o topo da cabeça no círculo superior",
  },
  {
    type: "top",
    label: "Topo",
    instruction: "Incline a cabeça para baixo, mostre o topo do couro cabeludo",
    icon: "⬆️",
    guide: "Centralize o topo da cabeça no círculo",
  },
  {
    type: "left",
    label: "Lado Esquerdo",
    instruction: "Vire o rosto para a direita, mostrando o lado esquerdo da cabeça",
    icon: "◀️",
    guide: "Mantenha a orelha visível no centro",
  },
  {
    type: "right",
    label: "Lado Direito",
    instruction: "Vire o rosto para a esquerda, mostrando o lado direito da cabeça",
    icon: "▶️",
    guide: "Mantenha a orelha visível no centro",
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const uploadPhoto = trpc.photos.upload.useMutation();
  const updateStep = trpc.leads.updateStep.useMutation();
  const triggerAI = trpc.ai.processPhotos.useMutation({
    onSuccess: () => {
      navigate(`/c/${slug}/resultado/${token}`);
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : "Erro ao processar"),
  });

  const currentStep = PHOTO_STEPS[currentPhotoIndex];
  const allCaptured = Object.values(capturedPhotos).every(Boolean);

  const openCamera = async () => {
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
    } catch (err) {
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

    // Upload
    setUploading(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const formData = new FormData();
      formData.append("photo", blob, `${currentStep.type}.jpg`);
      formData.append("sessionToken", token ?? "");
      formData.append("photoType", currentStep.type);

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
    } catch (err) {
      toast.error("Erro ao salvar foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }, [currentStep, currentPhotoIndex, token]);

  const handleFinalize = () => {
    triggerAI.mutate({ sessionToken: token ?? "" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-semibold">Fotos para análise</h1>
            <span className="text-sm text-muted-foreground">
              {Object.values(capturedPhotos).filter(Boolean).length}/4 fotos
            </span>
          </div>
          <div className="flex gap-1">
            {PHOTO_STEPS.map((s, i) => (
              <div
                key={s.type}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  capturedPhotos[s.type] ? "bg-emerald-500" : i === currentPhotoIndex ? "gradient-gold" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Camera view */}
        {isCameraOpen ? (
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[3/4]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Overlay guide */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border-2 border-primary/70 border-dashed" />
              </div>
              {/* Points overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {[
                  { x: "50%", y: "15%", label: "Topo" },
                  { x: "50%", y: "85%", label: "Queixo" },
                  { x: "15%", y: "50%", label: "Esq" },
                  { x: "85%", y: "50%", label: "Dir" },
                ].map((pt) => (
                  <div
                    key={pt.label}
                    className="absolute flex flex-col items-center"
                    style={{ left: pt.x, top: pt.y, transform: "translate(-50%, -50%)" }}
                  >
                    <div className="w-3 h-3 rounded-full bg-primary pulse-gold" />
                    <span className="text-[10px] text-primary font-medium mt-0.5 bg-background/70 px-1 rounded">
                      {pt.label}
                    </span>
                  </div>
                ))}
              </div>
              {/* Instruction overlay */}
              <div className="absolute bottom-4 left-0 right-0 text-center px-4">
                <div className="bg-background/80 backdrop-blur rounded-xl px-4 py-2 inline-block">
                  <p className="text-xs font-medium">{currentStep.guide}</p>
                </div>
              </div>
            </div>
            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={closeCamera} className="flex-1">
                <RotateCcw className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={capturePhoto}
                className="flex-1 gradient-gold text-white border-0"
                disabled={uploading}
              >
                {uploading ? "Salvando..." : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Capturar
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Photo grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {PHOTO_STEPS.map((step, i) => (
                <div
                  key={step.type}
                  className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    capturedPhotos[step.type]
                      ? "border-emerald-500"
                      : i === currentPhotoIndex
                      ? "border-primary border-dashed"
                      : "border-border"
                  }`}
                  onClick={() => {
                    if (!capturedPhotos[step.type]) {
                      setCurrentPhotoIndex(i);
                      openCamera();
                    }
                  }}
                >
                  {capturedPhotos[step.type] ? (
                    <>
                      <img
                        src={capturedPhotos[step.type]!}
                        alt={step.label}
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                        <p className="text-xs text-white font-medium">{step.label}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 gap-2">
                      <span className="text-2xl">{step.icon}</span>
                      <p className="text-xs font-medium text-center px-2">{step.label}</p>
                      {i === currentPhotoIndex && (
                        <p className="text-[10px] text-primary">Toque para fotografar</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Current step instruction */}
            {!allCaptured && (
              <div className="bg-card border border-border rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm mb-1">
                      {currentStep.icon} Foto {currentPhotoIndex + 1}: {currentStep.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{currentStep.instruction}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action button */}
            {allCaptured ? (
              <Button
                onClick={handleFinalize}
                className="w-full gradient-gold text-white border-0 py-5 text-base"
                disabled={triggerAI.isPending}
              >
                {triggerAI.isPending ? "Processando..." : (
                  <>
                    Gerar minha análise com IA
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={openCamera}
                className="w-full gradient-gold text-white border-0 py-5 text-base"
              >
                <Camera className="w-5 h-5 mr-2" />
                Fotografar: {currentStep.label}
              </Button>
            )}

            <p className="text-xs text-muted-foreground text-center mt-3">
              Suas fotos são criptografadas e usadas apenas para análise capilar
            </p>
          </>
        )}
      </div>
    </div>
  );
}
