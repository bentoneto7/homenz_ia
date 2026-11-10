/**
 * Landing Page Pública por Franquia — Homenz
 * 
 * Rota: /l/:slug
 * 
 * Fluxo:
 * 1. Chat conversacional de captação (IA)
 * 2. Upload de foto da área capilar
 * 3. Coleta de dados (nome, telefone, idade)
 * 4. Submissão → distribuição automática round-robin
 * 5. Tela de confirmação
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Sun, Camera, Crosshair, Warning, CaretRight, Sparkle, CalendarCheck, Clock } from "@phosphor-icons/react";
import {
  TrendingDown, CircleAlert, Feather, ScanFace, CircleDashed,
  ArrowUp, ArrowUpToLine, MoveHorizontal, Grip, Maximize2,
  Timer, Calendar, CalendarDays, Hourglass,
  Ban, Pill, Hospital, PenTool, FlaskConical,
  EyeOff, Smile, Sprout, Zap, Check,
  type LucideIcon,
} from "lucide-react";
import FranchiseLandingView from "./funnel/FranchiseLandingView";
import FunnelWordmark from "./funnel/FunnelWordmark";
import { resolveLandingContent } from "./funnel/landingContent";
import { buildWhatsappUrl } from "@/lib/whatsapp";


// Helper para extrair dados da franquia do objeto aninhado
function getFranchise(lp: { franchises?: unknown }) {
  const f = lp.franchises as { name?: string; city?: string; state?: string; phone?: string; address?: string; logo_url?: string; pixel_id?: string | null } | null;
  return f || {};
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "bot" | "user";
  text: string;
  type?: "text" | "photo-upload" | "options" | "input-name" | "input-phone" | "input-age" | "success";
  options?: string[];
}

interface LeadData {
  name: string;
  phone: string;
  age: string;
  hairProblem: string;
  hairRegion?: string;
  hairTime?: string;
  previousTreatment?: string;
  expectation?: string;
  photoUrl?: string;
  chatSummary: string;
}

// ─── Fluxo do Chat ────────────────────────────────────────────────────────────

const CHAT_FLOW = [
  {
    id: "age",
    text: "E aí! Sou o assistente da Homenz.\n\nVou fazer algumas perguntas rápidas pra montar seu diagnóstico capilar personalizado. Leva menos de 2 minutos.\n\nPra começar: qual é a sua idade?",
    type: "input-age" as const,
  },
  {
    id: "problem",
    field: "hairProblem" as const,
    text: "Como você descreveria o que tá acontecendo com seu cabelo?",
    type: "options" as const,
    options: [
      "Queda progressiva",
      "Calvície avançada",
      "Cabelo fino / rarefeito",
      "Entradas na testa",
      "Falhas no couro cabeludo",
    ],
  },
  {
    id: "region",
    field: "hairRegion" as const,
    text: "Em qual região você sente mais?",
    type: "options" as const,
    options: [
      "Frente / testa",
      "Topo da cabeça",
      "Laterais (entradas)",
      "Espalhado pela cabeça",
      "Área toda",
    ],
  },
  {
    id: "time",
    field: "hairTime" as const,
    text: "Há quanto tempo você percebe isso?",
    type: "options" as const,
    options: [
      "Menos de 1 ano",
      "1 a 3 anos",
      "3 a 5 anos",
      "Mais de 5 anos",
    ],
  },
  {
    id: "previous",
    field: "previousTreatment" as const,
    text: "Já tentou algum tratamento antes?",
    type: "options" as const,
    options: [
      "Nunca fiz nada",
      "Minoxidil / remédios",
      "Transplante capilar",
      "Micropigmentação",
      "Outros tratamentos",
    ],
  },
  {
    id: "expectation",
    field: "expectation" as const,
    text: "O que você quer alcançar com o tratamento?",
    type: "options" as const,
    options: [
      "Disfarçar a calvície no dia a dia",
      "Recuperar minha autoestima",
      "Resultado natural e duradouro",
      "Solução rápida sem cirurgia",
    ],
  },
  {
    id: "photo",
    text: "Perfeito! Pra fechar seu diagnóstico, me envia uma foto da área que mais te preocupa.\n\nPode ser uma selfie do topo ou da frente da cabeça.",
    type: "photo-upload" as const,
  },
];

// Microrreforços entre perguntas — dão a sensação de conversa (igual ao original)
const REINFORCEMENTS = [
  "Anotado!",
  "Boa!",
  "Entendido!",
  "Show!",
  "Perfeito!",
  "Isso ajuda muito!",
];

// Ícone por opção (só visual — o valor salvo do lead continua limpo)
const OPTION_ICON: Record<string, LucideIcon> = {
  // Problema
  "Queda progressiva": TrendingDown,
  "Calvície avançada": CircleAlert,
  "Cabelo fino / rarefeito": Feather,
  "Entradas na testa": ScanFace,
  "Falhas no couro cabeludo": CircleDashed,
  // Região
  "Frente / testa": ArrowUp,
  "Topo da cabeça": ArrowUpToLine,
  "Laterais (entradas)": MoveHorizontal,
  "Espalhado pela cabeça": Grip,
  "Área toda": Maximize2,
  // Tempo
  "Menos de 1 ano": Timer,
  "1 a 3 anos": Calendar,
  "3 a 5 anos": CalendarDays,
  "Mais de 5 anos": Hourglass,
  // Tratamentos anteriores
  "Nunca fiz nada": Ban,
  "Minoxidil / remédios": Pill,
  "Transplante capilar": Hospital,
  "Micropigmentação": PenTool,
  "Outros tratamentos": FlaskConical,
  // Expectativa
  "Disfarçar a calvície no dia a dia": EyeOff,
  "Recuperar minha autoestima": Smile,
  "Resultado natural e duradouro": Sprout,
  "Solução rápida sem cirurgia": Zap,
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FranchiseLanding() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showHero, setShowHero] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<Partial<LeadData>>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // Pós-captação: vendedor atribuído (WhatsApp na hora) + agendamento pelo próprio lead
  const [assignedSeller, setAssignedSeller] = useState<{ name?: string; phone?: string } | null>(null);
  const [submittedLeadId, setSubmittedLeadId] = useState<string | null>(null);
  const [schedulingOpen, setSchedulingOpen] = useState(false);
  const [schedDate, setSchedDate] = useState<string | null>(null);
  const [schedSlot, setSchedSlot] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  // Vagas restantes (escassez) — fixo por sessão, varia 3-5 pra soar real
  const [vagasRestantes] = useState(() => 3 + Math.floor(Math.random() * 3));
  const [stepHistory, setStepHistory] = useState<Array<{ step: number; messages: ChatMessage[]; leadData: Partial<LeadData> }>>([]);
  const [photoQualityTip, setPhotoQualityTip] = useState<string | null>(null);
  // Camera ao vivo (getUserMedia) em vez do seletor de arquivo, que no desktop
  // abria a "galeria". cameraError abre o aviso "nao detectamos uma camera".
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  // Buscar dados da landing page
  const { data: landingPage, isLoading: lpLoading, error: lpError } = trpc.distribution.getLandingPage.useQuery(
    { slug },
    { enabled: !!slug, retry: false }
  );

  // Dados da franquia (join), com override pela landing page (white-label)
  const franchise = landingPage ? getFranchise(landingPage) : {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lp = (landingPage ?? {}) as Record<string, any>;
  const franchiseName = franchise.name || `Homenz ${landingPage?.city || ''}`;
  const franchiseWhatsapp = lp.custom_phone || franchise.phone || '';
  const franchiseAddress = lp.custom_address || franchise.address || '';
  const franchiseBio = '';

  // Conteúdo da landing rica (white-label): DEFAULT_CONTENT + overrides da LP
  const content = resolveLandingContent(lp, landingPage?.city);
  // Logo custom da franquia (senão usa a wordmark vetorial Homenz no tema navy)
  const customLogo: string | undefined = lp.custom_logo_url || undefined;
  const BrandLogo = ({ height = 26 }: { height?: number }) =>
    customLogo
      ? <img src={customLogo} alt={franchiseName} className="object-contain" style={{ height }} />
      : <FunnelWordmark height={height} />;

  // Pixel ID: prioridade landing page > franquia
  const pixelId = (
    (landingPage as { pixel_id?: string | null } | null)?.pixel_id ||
    (franchise as { pixel_id?: string | null })?.pixel_id ||
    null
  );

  const submitLeadMutation = trpc.distribution.submitLead.useMutation();
  const trackEventMutation = trpc.distribution.trackPixelEvent.useMutation();
  const generateAiMutation = trpc.distribution.generateAiResult.useMutation();
  const scheduleAppointmentMutation = trpc.distribution.scheduleFranchiseAppointment.useMutation();
  const slotsQuery = trpc.distribution.getFranchiseSlots.useQuery(
    {
      landingPageSlug: slug ?? "",
      date: schedDate ?? "",
      tzOffsetMinutes: -new Date().getTimezoneOffset(),
    },
    { enabled: schedulingOpen && !!schedDate && !!slug }
  );

  // Helper para disparar eventos do Meta Pixel (client-side) + rastreamento server-side
  // Gera um event_id único por evento para deduplicar entre pixel e CAPI
  const firePixelEvent = (event: string, params?: Record<string, unknown>) => {
    // Gerar event_id único para deduplicar entre pixel client-side e CAPI server-side
    const eventId = `${event}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Client-side: Meta Pixel com eventID para deduplicar
    const fbq = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
    if (typeof fbq === 'function') {
      // O 4º parâmetro do fbq é o objeto de opções com eventID
      fbq('track', event, params || {}, { eventID: eventId });
    }
    // Server-side: rastreamento interno + event_id para CAPI
    const validEvents = ['ViewContent', 'InitiateCheckout', 'Lead', 'CompleteRegistration'] as const;
    type ValidEvent = typeof validEvents[number];
    if (slug && validEvents.includes(event as ValidEvent)) {
      trackEventMutation.mutate({ slug, event: event as ValidEvent, eventId });
    }
  };

  // Card de captura da landing → guarda nome+WhatsApp e abre o quiz.
  // InitiateCheckout dispara aqui (lead identificado) em vez de no fim do chat.
  const handleStart = (name: string, phone: string) => {
    setLeadData((d) => ({ ...d, name, phone }));
    firePixelEvent("InitiateCheckout", {
      content_name: "Diagnóstico Capilar Gratuito",
      content_category: "Hair Clinic",
      currency: "BRL",
      value: 0,
    });
    setShowHero(false);
  };

  // Injetar Meta Pixel script quando pixel_id estiver disponível
  useEffect(() => {
    if (!pixelId) return;
    // Injeta o snippet (init + PageView) uma única vez por slug
    if (!document.getElementById('meta-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'meta-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }
    // Dispara ViewContent só quando o fbq estiver pronto (evita race com o load assíncrono
    // do script). firePixelEvent já manda client (com eventID) + server-side (CAPI/total_views).
    let tries = 0;
    const interval = setInterval(() => {
      const fbqFn = (window as Window & { fbq?: (...args: unknown[]) => void }).fbq;
      if (typeof fbqFn === 'function') {
        clearInterval(interval);
        firePixelEvent('ViewContent');
      } else if (++tries > 30) {
        clearInterval(interval); // desiste após ~3s
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pixelId]);

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Iniciar o chat só quando o usuário dispensa o hero (clica no CTA)
  useEffect(() => {
    if (!showHero && landingPage && messages.length === 0) {
      setTimeout(() => {
        addBotMessage(CHAT_FLOW[0]);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingPage, showHero]);

  const addBotMessage = useCallback((step: typeof CHAT_FLOW[0]) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        text: step.text,
        type: step.type,
        options: (step as { options?: string[] }).options,
      }]);
    }, 1000 + Math.random() * 500);
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: "user",
      text,
    }]);
  }, []);

  const advanceToNextStep = useCallback((userResponse: string, dataUpdate: Partial<LeadData>) => {
    // Salvar estado atual no histórico antes de avançar
    setStepHistory(prev => [...prev, { step: currentStep, messages: [...messages], leadData: { ...leadData } }]);
    addUserMessage(userResponse);
    const newLeadData = { ...leadData, ...dataUpdate };
    setLeadData(newLeadData);

    const nextStepIndex = currentStep + 1;
    if (nextStepIndex < CHAT_FLOW.length) {
      setCurrentStep(nextStepIndex);
      // Microrreforço ("Anotado!") antes da próxima pergunta — conversa mais humana
      const reinforcement = REINFORCEMENTS[currentStep % REINFORCEMENTS.length];
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: `${Date.now()}-r`,
          role: "bot",
          text: reinforcement,
          type: "text",
        }]);
      }, 250);
      setTimeout(() => {
        addBotMessage(CHAT_FLOW[nextStepIndex]);
      }, 650);
    } else {
      // Último passo — submeter lead
      submitLead(newLeadData as LeadData);
    }
  }, [currentStep, leadData, messages, addUserMessage, addBotMessage]);

  const handleGoBack = useCallback(() => {
    if (stepHistory.length === 0) return;
    const prev = stepHistory[stepHistory.length - 1];
    setStepHistory(h => h.slice(0, -1));
    setCurrentStep(prev.step);
    setMessages(prev.messages);
    setLeadData(prev.leadData);
    setInputValue("");
    setPhotoPreview(null);
  }, [stepHistory]);

  const handleOptionSelect = (option: string) => {
    const step = CHAT_FLOW[currentStep] as { field?: keyof LeadData };
    const field = step.field ?? "hairProblem";
    advanceToNextStep(option, { [field]: option });
  };

  const handleTextInput = () => {
    if (!inputValue.trim()) return;
    const step = CHAT_FLOW[currentStep];

    // Hoje o único campo digitado no chat é a idade (nome/WhatsApp vêm do card).
    if (step.type === "input-age") {
      const age = parseInt(inputValue);
      if (isNaN(age) || age < 18 || age > 90) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "bot",
          text: "Por favor, informe uma idade válida (entre 18 e 90 anos).",
          type: "text",
        }]);
        return;
      }
      advanceToNextStep(inputValue + " anos", { age: inputValue });
    }
    setInputValue("");
  };

  // Comprime a imagem via canvas e retorna base64 JPEG (max 1200px, qualidade 0.75)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX = 1200;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
            else { width = Math.round((width * MAX) / height); height = MAX; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas não disponível")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── Camera ao vivo ──────────────────────────────────────────────────────────
  // Abre a camera do aparelho (getUserMedia). No desktop sem webcam / permissao
  // negada cai no catch e mostra o aviso "nao detectamos uma camera".
  const openCamera = async () => {
    setCameraError(false);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = mediaStream;
      setCameraOpen(true);
      // o <video> so existe apos o setState; liga o stream no proximo tick
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      }, 80);
    } catch {
      setCameraError(true);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  // Captura o frame atual do video num canvas e reaproveita o handlePhotoUpload
  // (compressao + upload + avanco) convertendo pra File.
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    closeCamera();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], "captura.jpg", { type: "image/jpeg" });
        handlePhotoUpload(file);
      },
      "image/jpeg",
      0.85,
    );
  };

  // Garante que a camera nao fica ligada se o componente desmontar com ela aberta
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert("Foto muito grande. Máximo 15MB.");
      return;
    }
    // Feedback de qualidade baseado no tamanho do arquivo
    if (file.size < 50 * 1024) {
      setPhotoQualityTip("Foto muito pequena. Tente tirar uma com mais luz e resolução.");
    } else if (file.size < 200 * 1024) {
      setPhotoQualityTip("Fotos com boa iluminação ajudam a equipe a fazer uma avaliação mais precisa.");
    } else {
      setPhotoQualityTip(null);
    }

    setIsUploading(true);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);

    try {
      // Comprime a imagem antes de enviar (evita limite de proxy em produção)
      const base64 = await compressImage(file);

      // Usa o endpoint tRPC de upload (mesmo caminho do FunnelPhotos, mais robusto)
      const response = await fetch("/api/trpc/photos.uploadPublic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { base64 } }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Erro desconhecido");
        console.error("[upload-photo] Erro HTTP:", response.status, errText);
        throw new Error(`Upload falhou: ${response.status}`);
      }

      const result = await response.json();
      const photoUrl: string | undefined = result?.result?.data?.json?.url;

      if (!photoUrl) throw new Error("URL da foto não retornada");

      setIsUploading(false);
      advanceToNextStep("Foto enviada", { photoUrl });
    } catch (err) {
      console.error("[upload-photo] Erro:", err);
      setIsUploading(false);
      setPhotoPreview(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        text: "Não consegui enviar a foto. Tente novamente ou clique em \"Não posso enviar agora\".",
        type: "text",
      }]);
    }
  };

  const skipPhoto = () => {
    advanceToNextStep("Prefiro não enviar foto agora", {});
  };

  const submitLead = async (data: LeadData) => {
    setIsTyping(true);

    // Mensagem de processamento
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        text: `Perfeito, **${data.name}**. Estou registrando suas informações e já vou conectar você com a equipe da **${franchiseName}**.`,
        type: "text",
      }]);
    }, 800);

    try {
      // Capturar UTMs da URL
      const urlParams = new URLSearchParams(window.location.search);
      
      const submitResult = await submitLeadMutation.mutateAsync({
        landingPageSlug: slug,
        name: data.name,
        phone: data.phone,
        email: undefined,
        age: data.age ? parseInt(data.age) : undefined,
        hairProblem: data.hairProblem,
        photoUrl: data.photoUrl,
        chatSummary: [
          `Problema principal: ${data.hairProblem || "N/A"}`,
          `Região afetada: ${data.hairRegion || "N/A"}`,
          `Tempo de evolução: ${data.hairTime || "N/A"}`,
          `Tratamentos anteriores: ${data.previousTreatment || "N/A"}`,
          `Expectativa: ${data.expectation || "N/A"}`,
          `Idade: ${data.age ? `${data.age} anos` : "N/A"}`,
          `Foto enviada: ${data.photoUrl ? "Sim" : "Não"}`,
        ].join("\n"),
        utmSource: urlParams.get("utm_source") || undefined,
        utmMedium: urlParams.get("utm_medium") || undefined,
        utmCampaign: urlParams.get("utm_campaign") || undefined,
      });

      // Disparar evento CompleteRegistration quando lead é registrado com sucesso
      firePixelEvent('CompleteRegistration', {
        content_name: 'Diagnóstico Capilar Gratuito',
        content_category: 'Hair Clinic',
        status: 'lead_submitted',
        currency: 'BRL',
        value: 0,
      });
      // Disparar evento Lead (distribuição para vendedor confirmada)
      // Este evento sinaliza ao Meta que o lead foi qualificado e distribuído
      firePixelEvent('Lead', {
        content_name: 'Diagnóstico Capilar Gratuito',
        content_category: 'Hair Clinic',
        currency: 'BRL',
        value: 0,
        status: 'distributed',
      });

      // Vendedor atribuído na hora (round-robin): o lead recebe o WhatsApp dele na tela final
      setAssignedSeller({
        name: submitResult.assignedSellerName ?? undefined,
        phone: submitResult.assignedSellerPhone ?? undefined,
      });

      // Se enviou foto, gera o antes/depois por IA antes da tela final (clímax do funil)
      const leadId = (submitResult as { leadId?: string })?.leadId;
      if (leadId) setSubmittedLeadId(leadId);
      if (data.photoUrl && leadId) {
        setAiLoading(true);
        try {
          const r = await generateAiMutation.mutateAsync({ leadId });
          setAiResult(r);
        } catch (aiErr) {
          console.warn("[franchiseAI] geração falhou:", aiErr);
          setTimeout(() => setIsSubmitted(true), 1500);
        } finally {
          setAiLoading(false);
        }
      } else {
        setTimeout(() => {
          setIsSubmitted(true);
        }, 2000);
      }
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        text: "Ocorreu um erro ao registrar seu contato. Por favor, tente novamente ou entre em contato diretamente pelo WhatsApp.",
        type: "text",
      }]);
    }
  };

  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  };

  const currentStepType = CHAT_FLOW[currentStep]?.type;
  const showInput = !isSubmitted && currentStepType === "input-age";

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (lpLoading) {
    return (
      <div className="funnel-theme min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div className="mb-6 flex justify-center"><FunnelWordmark height={34} /></div>
          <div className="flex gap-2 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--fn-accent)", animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (lpError || !landingPage) {
    return (
      <div className="funnel-theme min-h-[100dvh] flex items-center justify-center">
        <div className="text-center p-8">
          <div className="mb-6 flex justify-center"><FunnelWordmark height={34} /></div>
          <h2 className="font-semibold text-xl mb-2">Página não encontrada</h2>
          <p style={{ color: "var(--fn-muted)" }}>Este link pode estar inativo ou incorreto.</p>
        </div>
      </div>
    );
  }

  // ─── Processando IA (gerando antes/depois) ──────────────────────────────────

  if (aiLoading) {
    return (
      <div className="funnel-theme min-h-[100dvh] flex flex-col items-center justify-center px-4 text-center">
        <div className="mb-8"><BrandLogo height={32} /></div>
        <div className="w-16 h-16 rounded-full animate-spin mb-6" style={{ border: "4px solid var(--fn-line)", borderTopColor: "var(--fn-accent)" }} />
        <h2 className="text-xl font-semibold mb-2">Analisando suas fotos com IA…</h2>
        <p className="max-w-xs" style={{ color: "var(--fn-muted)" }}>
          Estamos gerando sua simulação de antes e depois personalizada. Leva alguns segundos.
        </p>
      </div>
    );
  }

  // ─── Agendamento pelo lead (escolha de dia e horário) ───────────────────────

  if (schedulingOpen) {
    // Próximos 12 dias com expediente (pula domingos)
    const dayOptions: Date[] = [];
    for (let i = 1; dayOptions.length < 12 && i <= 16; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (d.getDay() !== 0) dayOptions.push(d);
    }
    const toDateStr = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const confirmSchedule = async () => {
      if (!submittedLeadId || !schedSlot) return;
      try {
        // Envia o horário com o offset local — sem ele o Postgres assume UTC
        // e a exibição desloca o horário (14:00 virava 11:00 em BRT)
        const off = -new Date().getTimezoneOffset();
        const sign = off >= 0 ? "+" : "-";
        const abs = Math.abs(off);
        const offStr = `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
        const r = await scheduleAppointmentMutation.mutateAsync({
          leadId: submittedLeadId,
          datetime: `${schedSlot}${offStr}`,
        });
        setScheduledAt(r.scheduledAt);
        setSchedulingOpen(false);
        // Limpa o resultado da IA: senão a tela `if (aiResult)` (precede `isSubmitted`)
        // renderiza o antes/depois de novo e a confirmação some — parece "voltou pra foto".
        setAiResult(null);
        setIsSubmitted(true);
      } catch (err) {
        console.error("[agendamento] falhou:", err);
      }
    };

    return (
      <div className="funnel-theme min-h-[100dvh] flex flex-col">
        <header className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--fn-line)" }}>
          <BrandLogo height={26} />
          <span className="text-sm" style={{ color: "var(--fn-muted)" }}>· {franchiseName}</span>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-8 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-center gap-2 mb-1">
            <CalendarCheck className="w-5 h-5" weight="duotone" style={{ color: "var(--fn-accent)" }} />
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--fn-accent)" }}>Avaliação gratuita</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-center">Escolha o melhor dia e horário</h1>
          <p className="text-sm text-center mb-7 flex items-center justify-center gap-1.5" style={{ color: "var(--fn-muted)" }}>
            <Clock className="w-4 h-4" weight="duotone" /> Duração de 1 hora · {franchiseName}
          </p>

          {/* Dias */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-1 px-1">
            {dayOptions.map((d) => {
              const ds = toDateStr(d);
              const sel = ds === schedDate;
              return (
                <button
                  key={ds}
                  onClick={() => { setSchedDate(ds); setSchedSlot(null); }}
                  className="flex flex-col items-center rounded-[var(--fn-r-card)] px-3.5 py-2.5 flex-shrink-0 transition-all"
                  style={{
                    background: sel ? "var(--fn-accent)" : "var(--fn-elevated)",
                    color: sel ? "var(--fn-accent-ink)" : "var(--fn-body)",
                    border: `1px solid ${sel ? "var(--fn-accent)" : "var(--fn-line)"}`,
                  }}
                >
                  <span className="text-[11px] font-semibold uppercase">{d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}</span>
                  <span className="text-lg font-bold leading-tight">{d.getDate()}</span>
                  <span className="text-[10px]" style={{ opacity: 0.75 }}>{d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                </button>
              );
            })}
          </div>

          {/* Horários do dia escolhido */}
          {!schedDate && (
            <p className="text-sm text-center py-4" style={{ color: "var(--fn-muted)" }}>Selecione um dia para ver os horários.</p>
          )}
          {schedDate && slotsQuery.isLoading && (
            <div className="flex justify-center py-6">
              <div className="w-7 h-7 rounded-full animate-spin" style={{ border: "3px solid var(--fn-line)", borderTopColor: "var(--fn-accent)" }} />
            </div>
          )}
          {schedDate && slotsQuery.data && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-6">
              {slotsQuery.data.slots.map((s) => {
                const sel = s.datetime === schedSlot;
                return (
                  <button
                    key={s.time}
                    disabled={!s.available}
                    onClick={() => setSchedSlot(s.datetime)}
                    className="rounded-[var(--fn-r-card)] py-3 text-sm font-semibold transition-all disabled:opacity-35 disabled:line-through"
                    style={{
                      background: sel ? "var(--fn-accent)" : "var(--fn-elevated)",
                      color: sel ? "var(--fn-accent-ink)" : "var(--fn-ink)",
                      border: `1px solid ${sel ? "var(--fn-accent)" : "var(--fn-line)"}`,
                    }}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={confirmSchedule}
            disabled={!schedSlot || scheduleAppointmentMutation.isPending}
            className="fn-cta-glow w-full rounded-[var(--fn-r-pill)] py-4 font-bold text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
          >
            {scheduleAppointmentMutation.isPending ? "Agendando..." : "Confirmar horário"}
            <CaretRight className="w-5 h-5" weight="bold" />
          </button>
          {scheduleAppointmentMutation.isError && (
            <p role="alert" className="mt-3 text-sm text-center font-medium" style={{ color: "var(--fn-danger)" }}>
              Não foi possível agendar. Tente outro horário.
            </p>
          )}
          <button
            onClick={() => { setSchedulingOpen(false); setAiResult(null); setIsSubmitted(true); }}
            className="w-full mt-4 text-sm underline-offset-2 hover:underline"
            style={{ color: "var(--fn-muted)" }}
          >
            Prefiro que a equipe entre em contato comigo
          </button>
        </div>
      </div>
    );
  }

  // ─── Resultado da IA (antes/depois) ─────────────────────────────────────────

  if (aiResult) {
    return (
      <div className="funnel-theme min-h-[100dvh] flex flex-col">
        <header className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--fn-line)" }}>
          <BrandLogo height={26} />
          <span className="text-sm" style={{ color: "var(--fn-muted)" }}>· {franchiseName}</span>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-8 max-w-lg mx-auto w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-center mb-1" style={{ color: "var(--fn-accent)" }}>
            Simulação por IA
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold mb-2 text-center">Seu potencial de resultado</h1>
          <p className="text-sm text-center mb-7" style={{ color: "var(--fn-muted)" }}>
            Gerado a partir da sua foto · expectativa, não garantia
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <figure className="relative rounded-[var(--fn-r-card)] overflow-hidden" style={{ border: "1px solid var(--fn-line)" }}>
              <img src={aiResult.before_image_url} alt="Antes" className="w-full aspect-square object-cover" />
              <figcaption className="absolute bottom-2 left-2 text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}>Antes</figcaption>
            </figure>
            <figure className="relative rounded-[var(--fn-r-card)] overflow-hidden" style={{ border: "2px solid var(--fn-accent)" }}>
              <img src={aiResult.after_image_url} alt="Depois" className="w-full aspect-square object-cover" />
              <figcaption className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}>Depois</figcaption>
            </figure>
          </div>

          {aiResult.analysis_text && (
            <div className="rounded-[var(--fn-r-card)] p-4 mb-6" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
              <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: "var(--fn-body)" }}>{aiResult.analysis_text}</p>
            </div>
          )}

          <button
            onClick={() => (submittedLeadId ? setSchedulingOpen(true) : setIsSubmitted(true))}
            className="fn-cta-glow w-full rounded-[var(--fn-r-pill)] py-4 font-bold text-base transition-all"
            style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
          >
            Agendar minha avaliação gratuita
          </button>
        </div>
      </div>
    );
  }

  // ─── Tela de Sucesso ────────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="funnel-theme min-h-[100dvh] flex flex-col items-center justify-center px-5 py-10">
        <div className="max-w-md w-full text-center">
          <div className="mb-8 flex justify-center"><BrandLogo height={30} /></div>

          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "var(--fn-elevated)", border: "2px solid var(--fn-accent)" }}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="var(--fn-accent)" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold mb-3">
            {scheduledAt ? "Avaliação agendada" : "Recebemos seus dados"}
          </h1>
          <p className="mb-7 leading-relaxed" style={{ color: "var(--fn-body)" }}>
            {assignedSeller?.name ? (
              <>
                <strong style={{ color: "var(--fn-ink)" }}>{assignedSeller.name.split(" ")[0]}</strong>, seu consultor na{" "}
                <strong style={{ color: "var(--fn-ink)" }}>{franchiseName}</strong>, vai falar com você pelo WhatsApp
                {scheduledAt ? " para confirmar o horário da sua avaliação gratuita." : " para combinar o melhor horário da sua avaliação gratuita."}
              </>
            ) : (
              <>
                A equipe da <strong style={{ color: "var(--fn-ink)" }}>{franchiseName}</strong> vai entrar em contato pelo WhatsApp para confirmar o melhor horário da sua avaliação gratuita.
              </>
            )}
          </p>

          {scheduledAt && (
            <div className="rounded-[var(--fn-r-card)] p-4 mb-5 flex items-center gap-3 text-left" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-accent)" }}>
              <CalendarCheck className="w-8 h-8 flex-shrink-0" weight="duotone" style={{ color: "var(--fn-accent)" }} />
              <div>
                <p className="font-semibold capitalize" style={{ color: "var(--fn-ink)" }}>
                  {new Date(scheduledAt).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-sm" style={{ color: "var(--fn-muted)" }}>
                  às {new Date(scheduledAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · duração de 1 hora
                </p>
              </div>
            </div>
          )}

          {!scheduledAt && submittedLeadId && (
            <button
              onClick={() => setSchedulingOpen(true)}
              className="fn-cta-glow w-full rounded-[var(--fn-r-pill)] py-3.5 font-bold text-base transition-all mb-5 flex items-center justify-center gap-2"
              style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
            >
              <CalendarCheck className="w-5 h-5" weight="duotone" />
              Escolher dia e horário agora
            </button>
          )}

          <div className="rounded-[var(--fn-r-card)] p-5 text-left mb-6" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
            <p className="font-semibold text-xs mb-4 uppercase tracking-wider" style={{ color: "var(--fn-accent)" }}>O que acontece agora</p>
            {(scheduledAt
              ? [
                  "Seu consultor confirma o horário pelo WhatsApp",
                  "Você recebe o endereço e as orientações",
                  "Avaliação gratuita no dia marcado",
                  "Você conhece o protocolo ideal para o seu caso",
                ]
              : [
                  "Nossa equipe analisa suas informações",
                  "Você recebe contato pelo WhatsApp",
                  "Agendamos sua avaliação gratuita",
                  "Você conhece o protocolo ideal para o seu caso",
                ]
            ).map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}>
                  {i + 1}
                </div>
                <p className="text-sm" style={{ color: "var(--fn-body)" }}>{step}</p>
              </div>
            ))}
          </div>

          {(franchiseWhatsapp || assignedSeller?.phone) && (
            <a
              href={buildWhatsappUrl(franchiseWhatsapp || assignedSeller?.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-[var(--fn-r-pill)] text-sm font-semibold mb-5 transition-all hover:opacity-90"
              style={{ background: "#25D366", color: "white" }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              {!franchiseWhatsapp && assignedSeller?.name && assignedSeller?.phone
                ? `Falar com ${assignedSeller.name.split(" ")[0]} no WhatsApp`
                : "Falar pelo WhatsApp"}
            </a>
          )}
          <p className="text-xs" style={{ color: "var(--fn-muted)" }}>
            {franchiseName} · {landingPage.city}/{landingPage.state}
          </p>
        </div>
      </div>
    );
  }

  // ─── Hero / Apresentação (antes do quiz) ────────────────────────────────────

  if (showHero) {
    return (
      <FranchiseLandingView
        content={content}
        franchiseName={franchiseName}
        logoUrl={lp.custom_logo_url || undefined}
        city={landingPage?.city ?? undefined}
        state={landingPage?.state ?? undefined}
        address={franchiseAddress || undefined}
        whatsapp={franchiseWhatsapp || undefined}
        submitting={submitLeadMutation.isPending}
        maskPhone={maskPhone}
        onStart={handleStart}
      />
    );
  }

  // ─── Chat Principal ─────────────────────────────────────────────────────────

  return (
    <div className="funnel-theme min-h-[100dvh] flex flex-col sm:items-center sm:justify-center sm:p-6">
      {/* Card de conversa: full-screen no mobile, painel centralizado no desktop (mata o vazio embaixo) */}
      <div
        className="w-full flex flex-col flex-1 min-h-0 sm:flex-none sm:max-w-2xl sm:h-[min(86vh,800px)] sm:rounded-2xl overflow-hidden"
        style={{ background: "var(--fn-bg)", border: "1px solid var(--fn-line)", boxShadow: "0 30px 80px -40px oklch(0.72 0.135 185 / 0.30)" }}
      >
      {/* Barra de escassez — urgência no topo do quiz */}
      {!isSubmitted && (
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 text-center"
          style={{ background: "oklch(0.62 0.17 28)", color: "oklch(0.99 0.01 28)" }}
        >
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "oklch(0.99 0.01 28)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "oklch(0.99 0.01 28)" }} />
          </span>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">
            Apenas {vagasRestantes} vagas gratuitas disponíveis esta semana
          </span>
        </div>
      )}
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--fn-line)" }}>
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto w-full">
          <BrandLogo height={24} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: "var(--fn-ink)" }}>
              {franchiseName}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--fn-accent)" }} />
              <p className="text-xs" style={{ color: "var(--fn-accent)" }}>Assistente online</p>
            </div>
          </div>
          <div className="ml-auto flex-shrink-0">
            <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--fn-elevated)", color: "var(--fn-body)", border: "1px solid var(--fn-line)" }}>
              Avaliação gratuita
            </span>
          </div>
        </div>
        {/* Endereço da unidade — exibido abaixo do header quando preenchido (WhatsApp fica no rodapé) */}
        {franchiseAddress && (
          <div className="px-4 pb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 max-w-2xl mx-auto w-full">
            {franchiseAddress && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(franchiseAddress + (landingPage?.city ? ', ' + landingPage.city : '') + (landingPage?.state ? ' - ' + landingPage.state : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 group w-fit"
              >
                <svg className="w-3 h-3 flex-shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#00C1B8" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs underline underline-offset-2 decoration-dotted group-hover:decoration-solid transition-all" style={{ color: "#00C1B8" }}>
                  {franchiseAddress}{landingPage?.city ? `, ${landingPage.city}` : ''}{landingPage?.state ? ` - ${landingPage.state}` : ''}
                </span>
                <svg className="w-2.5 h-2.5 flex-shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: "#00C1B8" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        )}
        {/* Barra de progresso do quiz (delight: sensação de avanço) */}
        <div className="px-4 pb-3 pt-1 max-w-2xl mx-auto w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "var(--fn-muted)" }}>
              Passo {Math.min(currentStep + 1, CHAT_FLOW.length)} de {CHAT_FLOW.length}
            </span>
            <span className="text-[11px] font-bold" style={{ color: "var(--fn-accent)" }}>
              {Math.round((Math.min(currentStep + 1, CHAT_FLOW.length) / CHAT_FLOW.length) * 100)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--fn-elevated)" }}>
            <div
              className="h-full w-full rounded-full origin-left"
              style={{
                transform: `scaleX(${Math.min(currentStep + 1, CHAT_FLOW.length) / CHAT_FLOW.length})`,
                background: "linear-gradient(90deg, var(--fn-accent-press), var(--fn-accent))",
                boxShadow: "0 0 12px -2px var(--fn-accent)",
                transition: "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-6" style={{ background: "var(--fn-bg)" }}>
        <div className="max-w-2xl mx-auto w-full space-y-4">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`fn-msg flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1" style={{ background: "var(--fn-brand-blue)" }}>
                <Sparkle className="w-4 h-4" weight="fill" style={{ color: "var(--fn-brand-blue-ink)" }} />
              </div>
            )}
            <div className="max-w-[80%]">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"
                }`}
                style={{
                  background: msg.role === "user" ? "var(--fn-brand-blue)" : "var(--fn-surface)",
                  color: msg.role === "user" ? "var(--fn-brand-blue-ink)" : "var(--fn-ink)",
                  border: msg.role === "bot" ? "1px solid var(--fn-line)" : "none",
                  boxShadow: msg.role === "bot" ? "0 2px 10px -6px oklch(0.25 0.04 258 / 0.25)" : "none",
                  fontWeight: msg.role === "user" ? 500 : 400,
                }}
                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
              />

              {/* Opções de escolha */}
              {msg.role === "bot" && msg.type === "options" && msg.options && idx === messages.length - 1 && !isTyping && (
                <div className="mt-3 space-y-2">
                  {msg.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleOptionSelect(opt)}
                      className="group fn-lift w-full flex items-center justify-between gap-3 text-left px-4 py-3 rounded-xl text-sm font-medium"
                      style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line-strong)", color: "var(--fn-ink)", boxShadow: "0 2px 10px -6px oklch(0.25 0.04 258 / 0.25)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--fn-accent)"; e.currentTarget.style.boxShadow = "0 12px 26px -16px var(--fn-accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--fn-line-strong)"; e.currentTarget.style.boxShadow = "0 2px 10px -6px oklch(0.25 0.04 258 / 0.25)"; }}
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        {(() => {
                          const OptIcon = OPTION_ICON[opt];
                          return OptIcon ? <OptIcon className="w-4 h-4 flex-shrink-0" style={{ color: "var(--fn-accent)" }} aria-hidden="true" /> : null;
                        })()}
                        <span className="truncate">{opt}</span>
                      </span>
                      <CaretRight weight="bold" className="w-4 h-4 flex-shrink-0 opacity-30 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0.5" style={{ color: "var(--fn-accent)" }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Upload de foto */}
              {msg.role === "bot" && msg.type === "photo-upload" && idx === messages.length - 1 && !leadData.photoUrl && (
                <div className="mt-3 space-y-2">
                  {/* Guia visual de como tirar a foto */}
                  {!photoPreview && (
                    <div className="rounded-[var(--fn-r-card)] overflow-hidden" style={{ border: "1px solid var(--fn-line)", background: "var(--fn-elevated)" }}>
                      <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--fn-muted)", borderBottom: "1px solid var(--fn-line)" }}>
                        Como tirar a foto ideal
                      </div>
                      <div className="grid grid-cols-3">
                        {[
                          { Icon: Sun, label: "Boa luz", tip: "Luz natural ou ambiente bem iluminado" },
                          { Icon: Camera, label: "Topo da cabeça", tip: "Aponte a câmera de cima para baixo" },
                          { Icon: Crosshair, label: "Foco na área", tip: "Centralize a região com maior queda" },
                        ].map((item, idx) => (
                          <div key={item.label} className="flex flex-col items-center gap-1.5 px-2.5 py-3.5 text-center" style={{ borderLeft: idx > 0 ? "1px solid var(--fn-line)" : "none" }}>
                            <div className="w-9 h-9 rounded-full flex items-center justify-center mb-0.5" style={{ border: "1px solid var(--fn-line-strong)" }}>
                              <item.Icon weight="duotone" className="w-4 h-4" style={{ color: "var(--fn-accent)" }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: "var(--fn-ink)" }}>{item.label}</span>
                            <span className="text-[11px] leading-snug" style={{ color: "var(--fn-muted)" }}>{item.tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Aviso de expectativa — neutro, legível no navy (sem âmbar de baixo contraste) */}
                  {!photoPreview && (
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-[var(--fn-r-card)] text-xs leading-relaxed" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
                      <Warning weight="duotone" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.82 0.13 85)" }} />
                      <span style={{ color: "var(--fn-muted)" }}>
                        <strong style={{ color: "var(--fn-ink)" }}>Expectativa, não garantia.</strong> A foto orienta a avaliação inicial da equipe. Resultados reais são avaliados presencialmente.
                      </span>
                    </div>
                  )}
                  {photoPreview ? (
                    <div className="space-y-2">
                      <div className="relative rounded-xl overflow-hidden" style={{ border: "2px solid var(--fn-line-strong)" }}>
                        <img src={photoPreview} alt="Preview" className="w-full max-w-[220px] rounded-xl object-cover block" style={{ maxHeight: "165px" }} />
                        {isUploading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl gap-2" style={{ background: "rgba(0,0,0,0.55)" }}>
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <div className="text-white text-xs font-medium">Enviando...</div>
                          </div>
                        )}
                        {!isUploading && (
                          <div className="absolute top-2 right-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}><Check className="w-3 h-3 inline-block align-[-2px] mr-0.5" strokeWidth={3} aria-hidden="true" />Pronta</span>
                          </div>
                        )}
                      </div>
                      {/* Feedback de qualidade */}
                      {photoQualityTip && (
                        <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-[var(--fn-r-card)] text-xs leading-relaxed" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)", color: "var(--fn-body)" }}>
                          <Warning weight="duotone" className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "oklch(0.82 0.13 85)" }} />
                          {photoQualityTip}
                        </div>
                      )}
                      {/* Botão refazer */}
                      {!isUploading && (
                        <button
                          onClick={() => {
                            setPhotoPreview(null);
                            setPhotoQualityTip(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80 flex items-center justify-center gap-1.5"
                          style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line-strong)", color: "var(--fn-body)" }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          Tirar outra foto
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={openCamera}
                        className="fn-cta-glow w-full px-4 py-3.5 rounded-[var(--fn-r-pill)] text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Tirar foto agora
                      </button>
                      <button
                        onClick={skipPhoto}
                        className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80 flex items-center justify-center gap-1.5"
                        style={{ background: "transparent", border: "1px solid var(--fn-line-strong)", color: "var(--fn-body)" }}
                      >
                        Não posso enviar agora — pular esta etapa
                      </button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Camera ao vivo (overlay full-screen) */}
        {cameraOpen && (
          <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#000" }}>
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[70%] max-w-[280px] aspect-square rounded-full" style={{ border: "2px dashed rgba(255,255,255,0.5)" }} />
              </div>
              <p className="absolute top-6 left-1/2 -translate-x-1/2 text-white/90 text-sm font-medium px-4 py-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.45)" }}>
                Centralize a área que mais te preocupa
              </p>
            </div>
            <div className="flex items-center justify-center gap-10 py-7" style={{ background: "#000" }}>
              <button onClick={closeCamera} className="text-white/80 text-sm font-medium px-4 py-2">
                Cancelar
              </button>
              <button
                onClick={capturePhoto}
                aria-label="Capturar foto"
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
                style={{ background: "rgba(255,255,255,0.18)", border: "3px solid #fff" }}
              >
                <span className="w-14 h-14 rounded-full" style={{ background: "#fff" }} />
              </button>
              <span className="w-[52px]" />
            </div>
          </div>
        )}

        {/* Sem camera / permissao negada (modal) */}
        {cameraError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setCameraError(false)}>
            <div
              className="w-full max-w-sm rounded-[var(--fn-r-card)] p-6 text-center"
              style={{ background: "var(--fn-bg)", border: "1px solid var(--fn-line)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
                <Camera className="w-7 h-7" weight="duotone" style={{ color: "var(--fn-accent)" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--fn-ink)" }}>Não detectamos uma câmera</h3>
              <p className="text-sm mb-6" style={{ color: "var(--fn-muted)" }}>
                Conecte uma câmera e permita o acesso, ou abra esta página no seu celular para usar a câmera dele.
              </p>
              <button
                onClick={openCamera}
                className="fn-cta-glow w-full rounded-[var(--fn-r-pill)] py-3.5 font-bold text-sm mb-3"
                style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
              >
                Tentar de novo
              </button>
              <button
                onClick={() => { setCameraError(false); fileInputRef.current?.click(); }}
                className="w-full rounded-[var(--fn-r-pill)] py-3 font-semibold text-sm mb-2"
                style={{ background: "transparent", border: "1px solid var(--fn-line-strong)", color: "var(--fn-body)" }}
              >
                Enviar foto da galeria
              </button>
              <button onClick={() => setCameraError(false)} className="text-xs mt-1" style={{ color: "var(--fn-muted)" }}>
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="fn-msg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--fn-brand-blue)" }}>
              <Sparkle className="w-4 h-4" weight="fill" style={{ color: "var(--fn-brand-blue-ink)" }} />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full typing-dot" style={{ background: "var(--fn-muted)", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
        </div>
      </div>

      {/* Rodapé do card de conversa (branding + contato) — não deixa "pelado" */}
      {!isSubmitted && (
        <div className="px-4 py-3" style={{ borderTop: "1px solid var(--fn-line)", background: "var(--fn-surface)" }}>
          <div className="max-w-2xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo height={18} />
              <span className="text-[11px] truncate" style={{ color: "var(--fn-muted)" }}>· {franchiseName}</span>
            </div>
            <div className="flex items-center gap-x-4 gap-y-1 flex-wrap justify-end">
          {franchiseAddress && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--fn-muted)" }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {franchiseAddress}
            </span>
          )}
          {franchiseWhatsapp && (
            <a
              href={buildWhatsappUrl(franchiseWhatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#00C1B8] flex items-center gap-1 hover:underline"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
            {!franchiseAddress && !franchiseWhatsapp && (
              <span className="text-[11px]" style={{ color: "var(--fn-muted)" }}>Seus dados estão protegidos</span>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      {showInput && (
        <div className="px-4 py-4" style={{ borderTop: "1px solid var(--fn-line)", background: "var(--fn-bg)" }}>
          <div className="flex gap-2 max-w-2xl mx-auto w-full">
            {stepHistory.length > 0 && (
              <button
                onClick={handleGoBack}
                className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl transition-colors hover:opacity-80"
                style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line-strong)", color: "var(--fn-muted)" }}
                title="Voltar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.replace(/\D/g, "").slice(0, 3))}
              onKeyDown={(e) => e.key === "Enter" && handleTextInput()}
              placeholder="Sua idade..."
              type="text"
              inputMode="numeric"
              maxLength={3}
              className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
              style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line-strong)", color: "var(--fn-ink)" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--fn-accent)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--fn-line-strong)")}
              autoFocus
            />
            <button
              onClick={handleTextInput}
              disabled={!inputValue.trim()}
              className="rounded-xl px-4 font-bold flex items-center justify-center transition-all disabled:opacity-50"
              style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-center mt-2" style={{ color: "var(--fn-muted)" }}>
            Seus dados são protegidos e usados apenas para contato
          </p>
        </div>
      )}
      </div>{/* fim do card de conversa */}
    </div>
  );
}
