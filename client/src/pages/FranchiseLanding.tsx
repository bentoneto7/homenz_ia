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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/homenz-plataforma-logo_0b0261db.png";

// Helper para extrair dados da franquia do objeto aninhado
function getFranchise(lp: { franchises?: unknown }) {
  const f = lp.franchises as { name?: string; city?: string; state?: string; phone?: string; address?: string; logo_url?: string } | null;
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
  photoUrl?: string;
  chatSummary: string;
}

// ─── Fluxo do Chat ────────────────────────────────────────────────────────────

const CHAT_FLOW = [
  {
    id: "welcome",
    text: "E aí! Sou o assistente da **Homenz**. Vou te ajudar a dar o primeiro passo para recuperar seus cabelos. 💪\n\nPrimeiro, me conta: qual é o principal problema que você está enfrentando com seu cabelo?",
    type: "options" as const,
    options: [
      "Queda excessiva de cabelo",
      "Calvície em progressão",
      "Cabelo muito fino e fraco",
      "Falhas ou entradas",
      "Outro problema",
    ],
  },
  {
    id: "photo",
    text: "Entendido! Para que nossa equipe possa fazer uma avaliação mais precisa antes do seu diagnóstico, você pode enviar uma foto da área que mais te preocupa?\n\n📸 Pode ser uma selfie do topo ou da frente da cabeça.",
    type: "photo-upload" as const,
  },
  {
    id: "name",
    text: "Ótimo! Agora preciso de algumas informações para agendar seu diagnóstico gratuito.\n\nQual é o seu nome completo?",
    type: "input-name" as const,
  },
  {
    id: "age",
    text: "Qual é a sua idade?",
    type: "input-age" as const,
  },
  {
    id: "phone",
    text: "E o seu WhatsApp para contato? Nossa equipe vai entrar em contato para confirmar o melhor horário para você.",
    type: "input-phone" as const,
  },
];

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function FranchiseLanding() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [leadData, setLeadData] = useState<Partial<LeadData>>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [stepHistory, setStepHistory] = useState<Array<{ step: number; messages: ChatMessage[]; leadData: Partial<LeadData> }>>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Dados da franquia (join)
  const franchise = landingPage ? getFranchise(landingPage) : {};
  const franchiseName = franchise.name || `Homenz ${landingPage?.city || ''}`;
  const franchiseLogo = franchise.logo_url || LOGO_URL;
  const franchiseWhatsapp = franchise.phone || '';
  const franchiseAddress = franchise.address || '';
  const franchiseBio = '';

  const submitLeadMutation = trpc.distribution.submitLead.useMutation();

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Iniciar chat quando landing page carrega
  useEffect(() => {
    if (landingPage && messages.length === 0) {
      setTimeout(() => {
        addBotMessage(CHAT_FLOW[0]);
      }, 500);
    }
  }, [landingPage]);

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
      setTimeout(() => {
        addBotMessage(CHAT_FLOW[nextStepIndex]);
      }, 300);
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
    advanceToNextStep(option, { hairProblem: option });
  };

  const handleTextInput = () => {
    if (!inputValue.trim()) return;
    const step = CHAT_FLOW[currentStep];

    if (step.type === "input-name") {
      advanceToNextStep(inputValue, { name: inputValue });
    } else if (step.type === "input-age") {
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
    } else if (step.type === "input-phone") {
      const cleaned = inputValue.replace(/\D/g, "");
      if (cleaned.length < 10) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: "bot",
          text: "Por favor, informe um número de WhatsApp válido com DDD.",
          type: "text",
        }]);
        return;
      }
      advanceToNextStep(inputValue, { phone: inputValue });
    }
    setInputValue("");
  };

  const handlePhotoUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("Foto muito grande. Máximo 10MB.");
      return;
    }

    setIsUploading(true);
    const preview = URL.createObjectURL(file);
    setPhotoPreview(preview);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload-lead-photo", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Erro desconhecido");
        console.error("[upload-lead-photo] Erro HTTP:", response.status, errText);
        throw new Error(`Upload falhou: ${response.status}`);
      }

      const result = await response.json();
      const photoUrl: string | undefined = result.url;

      setIsUploading(false);
      advanceToNextStep("📸 Foto enviada", { photoUrl });
    } catch (err) {
      console.error("[upload-lead-photo] Erro:", err);
      setIsUploading(false);
      setPhotoPreview(null);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: "bot",
        text: "Não consegui enviar a foto. Tente novamente ou clique em \"Pular por agora\".",
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
        text: `Perfeito, **${data.name}**! Estou registrando suas informações e já vou conectar você com nossa equipe da **${franchiseName}**. ✅`,
        type: "text",
      }]);
    }, 800);

    try {
      // Capturar UTMs da URL
      const urlParams = new URLSearchParams(window.location.search);
      
      await submitLeadMutation.mutateAsync({
        landingPageSlug: slug,
        name: data.name,
        phone: data.phone,
        email: undefined,
        age: data.age ? parseInt(data.age) : undefined,
        hairProblem: data.hairProblem,
        photoUrl: data.photoUrl,
        chatSummary: `Problema: ${data.hairProblem}. Foto: ${data.photoUrl ? "Sim" : "Não"}. Idade: ${data.age || "N/A"}.`,
        utmSource: urlParams.get("utm_source") || undefined,
        utmMedium: urlParams.get("utm_medium") || undefined,
        utmCampaign: urlParams.get("utm_campaign") || undefined,
      });

      setTimeout(() => {
        setIsSubmitted(true);
      }, 2000);
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
  const showInput = !isSubmitted && (
    currentStepType === "input-name" ||
    currentStepType === "input-age" ||
    currentStepType === "input-phone"
  );

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (lpLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <img src={LOGO_URL} alt="Homenz" className="h-12 mx-auto mb-6" />
          <div className="flex gap-2 justify-center">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#00C1B8] typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (lpError || !landingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-8">
          <img src={LOGO_URL} alt="Homenz" className="h-12 mx-auto mb-6 object-contain" />
          <h2 className="font-bold text-xl mb-2" style={{ color: "#004A9D" }}>Página não encontrada</h2>
          <p className="text-[#5A667A]">Este link pode estar inativo ou incorreto.</p>
        </div>
      </div>
    );
  }

  // ─── Tela de Sucesso ────────────────────────────────────────────────────────

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
        <div className="max-w-md w-full text-center">
          <img src={franchiseLogo} alt={franchiseName} className="h-12 mx-auto mb-8 object-contain" />
          
          {/* Ícone de sucesso */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(0, 193, 184, 0.1)", border: "2px solid #00C1B8" }}>
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="#00C1B8" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-3" style={{ color: "#004A9D", fontFamily: "Montserrat, sans-serif" }}>
            Diagnóstico Agendado!
          </h1>
          <p className="text-[#5A667A] mb-6 leading-relaxed">
            Nossa equipe da <strong style={{ color: "#00C1B8" }}>{franchiseName}</strong> vai entrar em contato em breve pelo WhatsApp para confirmar o melhor horário para o seu diagnóstico gratuito.
          </p>

          {/* Próximos passos */}
          <div className="rounded-2xl p-5 text-left mb-6 bg-[#EBF4FF] border border-[#C7DEFF]">
            <p className="font-semibold text-sm mb-3 uppercase tracking-wider" style={{ color: "#004A9D" }}>O que acontece agora</p>
            {[
              "Nossa equipe analisa suas informações",
              "Você recebe contato pelo WhatsApp",
              "Agendamos seu diagnóstico gratuito",
              "Você conhece o protocolo ideal para o seu caso",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-white" style={{ background: "#00C1B8" }}>
                  {i + 1}
                </div>
                <p className="text-[#5A667A] text-sm">{step}</p>
              </div>
            ))}
          </div>

          {franchiseWhatsapp && (
            <a
              href={`https://wa.me/55${franchiseWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold mb-4 transition-all hover:opacity-90"
              style={{ background: "#25D366", color: "white" }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Falar pelo WhatsApp
            </a>
          )}
          <p className="text-[#A0AABB] text-xs">
            {franchiseName} · {landingPage.city}/{landingPage.state}
          </p>
        </div>
      </div>
    );
  }

  // ─── Chat Principal ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#E2E8F0] bg-white">
        <img src={franchiseLogo} alt={franchiseName} className="h-8 object-contain" />
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: "#004A9D", fontFamily: "Montserrat, sans-serif" }}>
            {franchiseName}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00C1B8] animate-pulse" />
            <p className="text-[#00C1B8] text-xs">Assistente online</p>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0">
          <Badge className="text-xs" style={{ background: "rgba(0,74,157,0.08)", color: "#004A9D", border: "1px solid rgba(0,74,157,0.2)" }}>
            Diagnóstico Gratuito
          </Badge>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-[#F8FAFC]" style={{ maxHeight: "calc(100vh - 160px)" }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1" style={{ background: "linear-gradient(135deg, #004A9D, #00C1B8)" }}>
                <span className="text-white text-xs font-bold">H</span>
              </div>
            )}
            <div className="max-w-[80%]">
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-white rounded-tr-sm"
                    : "rounded-tl-sm"
                }`}
                style={{
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #004A9D, #0066CC)"
                    : "#ffffff",
                  color: msg.role === "bot" ? "#0A2540" : undefined,
                  border: msg.role === "bot" ? "1px solid #E2E8F0" : "none",
                  boxShadow: msg.role === "bot" ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                }}
                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
              />

              {/* Opções de escolha */}
              {msg.role === "bot" && msg.type === "options" && msg.options && currentStep === 0 && !leadData.hairProblem && (
                <div className="mt-3 space-y-2">
                  {msg.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleOptionSelect(opt)}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] bg-white border border-[#C7DEFF] hover:border-[#004A9D] hover:bg-[#EBF4FF]"
                      style={{ color: "#004A9D" }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Upload de foto */}
              {msg.role === "bot" && msg.type === "photo-upload" && currentStep === 1 && !leadData.photoUrl && !leadData.hairProblem?.includes("Prefiro") && (
                <div className="mt-3 space-y-2">
                  {photoPreview ? (
                    <div className="relative">
                      <img src={photoPreview} alt="Preview" className="w-full max-w-[200px] rounded-xl object-cover" style={{ maxHeight: "150px" }} />
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: "rgba(0,0,0,0.5)" }}>
                          <div className="text-white text-xs">Enviando...</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                        style={{
                          background: "rgba(0,74,157,0.05)",
                          border: "2px dashed rgba(0,74,157,0.3)",
                          color: "#004A9D",
                        }}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Enviar foto
                      </button>
                      <button
                        onClick={skipPhoto}
                        className="w-full px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        Pular por agora
                      </button>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePhotoUpload(file);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #004A9D, #00C1B8)" }}>
              <span className="text-white text-xs font-bold">H</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 bg-white" style={{ border: "1px solid #E2E8F0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              {[0,1,2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full bg-gray-400 typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Rodapé da franquia */}
      {(franchiseAddress || franchiseWhatsapp || franchiseBio) && !isSubmitted && (
        <div className="px-4 py-2 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center gap-x-4 gap-y-1">
          {franchiseAddress && (
            <span className="text-[10px] text-[#A0AABB] flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {franchiseAddress}
            </span>
          )}
          {franchiseWhatsapp && (
            <a
              href={`https://wa.me/55${franchiseWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#00C1B8] flex items-center gap-1 hover:underline"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
          )}
        </div>
      )}

      {/* Input Area */}
      {showInput && (
        <div className="px-4 py-4 border-t border-[#E2E8F0] bg-white">
          <div className="flex gap-2">
            {stepHistory.length > 0 && (
              <button
                onClick={handleGoBack}
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#5A667A] hover:bg-[#EEF2F7] transition-colors"
                title="Voltar"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <Input
              value={inputValue}
              onChange={(e) => {
                const val = currentStepType === "input-phone"
                  ? maskPhone(e.target.value)
                  : e.target.value;
                setInputValue(val);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleTextInput()}
              placeholder={
                currentStepType === "input-name" ? "Seu nome completo..." :
                currentStepType === "input-age" ? "Sua idade..." :
                "(00) 99999-9999"
              }
              type={currentStepType === "input-age" ? "number" : "text"}
              inputMode={currentStepType === "input-phone" ? "numeric" : undefined}
              className="flex-1 rounded-xl border border-[#E2E8F0] text-[#0A2540] placeholder:text-[#A0AABB] focus:border-[#00C1B8] bg-[#F8FAFC]"
              autoFocus
            />
            <Button
              onClick={handleTextInput}
              disabled={!inputValue.trim()}
              className="rounded-xl px-4 font-bold"
              style={{ background: "#00C1B8", color: "white" }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </Button>
          </div>
          <p className="text-[#A0AABB] text-xs text-center mt-2">
            Seus dados são protegidos e usados apenas para contato
          </p>
        </div>
      )}
    </div>
  );
}
