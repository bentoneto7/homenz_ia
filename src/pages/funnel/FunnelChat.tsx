import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ChevronRight, Sparkles } from "lucide-react";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: { label: string; value: string; emoji?: string }[];
};

type Answers = {
  age?: string;
  hairProblem?: string;
  hairLossType?: string;
  hairLossTime?: string;
  previousTreatments?: string;
  expectations?: string;
};

const FLOW: {
  key: keyof Answers;
  question: string;
  subtext?: string;
  options?: { label: string; value: string; emoji?: string }[];
  inputType?: "text" | "number";
  placeholder?: string;
}[] = [
  {
    key: "age",
    question: "Qual é a sua idade?",
    subtext: "Isso ajuda a entender o estágio do processo capilar e as melhores opções pra você",
    inputType: "number",
    placeholder: "Digite sua idade (ex: 38)",
  },
  {
    key: "hairProblem",
    question: "Como você descreveria o que tá acontecendo com seu cabelo?",
    subtext: "Escolha a opção que mais se encaixa na sua situação",
    options: [
      { label: "Queda progressiva", value: "Queda de cabelo", emoji: "😟" },
      { label: "Calvície avançada", value: "Calvície progressiva", emoji: "😔" },
      { label: "Cabelo fino / rarefeito", value: "Rarefacção capilar", emoji: "🤔" },
      { label: "Entradas na testa", value: "Entradas na testa", emoji: "😕" },
      { label: "Falhas no couro cabeludo", value: "Falhas no couro cabeludo", emoji: "😞" },
    ],
  },
  {
    key: "hairLossType",
    question: "Em qual região você sente mais?",
    subtext: "Isso define qual protocolo Homenz faz mais sentido pra você",
    options: [
      { label: "Frente / Testa", value: "frontal", emoji: "⬆️" },
      { label: "Topo da cabeça", value: "vertex", emoji: "🔝" },
      { label: "Laterais (entradas)", value: "temporal", emoji: "↔️" },
      { label: "Espalhado por toda a cabeça", value: "diffuse", emoji: "🔄" },
      { label: "Área total", value: "total", emoji: "⭕" },
    ],
  },
  {
    key: "hairLossTime",
    question: "Há quanto tempo você percebe isso?",
    subtext: "Quanto antes a gente age, melhores os resultados",
    options: [
      { label: "Menos de 1 ano", value: "Menos de 1 ano", emoji: "🆕" },
      { label: "1 a 3 anos", value: "1 a 3 anos", emoji: "📅" },
      { label: "3 a 5 anos", value: "3 a 5 anos", emoji: "⏳" },
      { label: "Mais de 5 anos", value: "Mais de 5 anos", emoji: "🕰️" },
    ],
  },
  {
    key: "previousTreatments",
    question: "Já tentou algum tratamento antes?",
    subtext: "Sem julgamento nenhum — só queremos entender o seu histórico",
    options: [
      { label: "Nunca fiz nada", value: "Nenhum tratamento anterior", emoji: "🚫" },
      { label: "Minoxidil / remédios", value: "Minoxidil ou medicamentos", emoji: "💊" },
      { label: "Transplante capilar", value: "Transplante capilar", emoji: "🏥" },
      { label: "Micropigmentação", value: "Micropigmentação", emoji: "✏️" },
      { label: "Outros tratamentos", value: "Outros tratamentos", emoji: "🔬" },
    ],
  },
  {
    key: "expectations",
    question: "O que você quer alcançar com o tratamento?",
    subtext: "Isso guia a personalização do seu resultado 3D",
    options: [
      { label: "Disfarcar a calvície no dia a dia", value: "Disfarcar a calvície no dia a dia", emoji: "🎯" },
      { label: "Recuperar minha autoestima", value: "Recuperar a autoestima", emoji: "💪" },
      { label: "Resultado natural e duradouro", value: "Resultado natural e duradouro", emoji: "✨" },
      { label: "Solução rápida sem cirurgia", value: "Solução rápida sem cirurgia", emoji: "⚡" },
    ],
  },
];

const REINFORCEMENTS = [
  "Anotado! ✅",
  "Boa! 💪",
  "Entendido! 📝",
  "Show! ✨",
  "Perfeito! 🎯",
  "Valeu! 👍",
  "Isso ajuda muito! 💡",
];

export default function FunnelChat() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [done, setDone] = useState(false);
  const [reinforcementIdx, setReinforcementIdx] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Garantir tema claro no funil público (remove dark mode se ativo)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    return () => {};
  }, []);

  const updateStep = {
    mutate: async ({ sessionToken, step }: { sessionToken: string; step: string }) => {
      await supabase.from("leads").update({ funnel_step: step }).eq("session_token", sessionToken);
    },
  };
  const saveChatAnswers = {
    isPending: false,
    mutate: async (payload: Record<string, unknown>) => {
      const { sessionToken, answers, ...rest } = payload as { sessionToken: string; answers: unknown; [key: string]: unknown };
      await supabase.from("leads").update({ chat_answers: answers, funnel_step: "chat_done", ...rest }).eq("session_token", sessionToken);
      onSuccess(payload);
    },
  };;

  const addMessage = (msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }]);
  };

  const showBotMessage = (text: string, options?: Message["options"], delay = 900) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMessage({ from: "bot", text, options });
    }, delay);
  };

  useEffect(() => {
    if (!token) return;
    updateStep.mutate({ sessionToken: token, funnelStep: "chat_started" });
    setTimeout(() => {
      addMessage({ from: "bot", text: "E aí! 👋 Sou o assistente da Homenz." });
      setTimeout(() => {
        showBotMessage("Vou fazer 6 perguntas rápidas pra montar seu diagnóstico capilar personalizado com IA. Menos de 2 minutos! 🚀", undefined, 600);
        setTimeout(() => {
          showBotMessage(FLOW[0].question, FLOW[0].options, 800);
        }, 1800);
      }, 800);
    }, 400);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleAnswer = (value: string, label?: string) => {
    const step = FLOW[currentStep];
    const displayLabel = label ?? value;

    addMessage({ from: "user", text: displayLabel });
    setAnswers((prev) => ({ ...prev, [step.key]: value }));
    setInputValue("");

    const nextStep = currentStep + 1;
    const reinforcement = REINFORCEMENTS[reinforcementIdx % REINFORCEMENTS.length];
    setReinforcementIdx((i) => i + 1);

    if (nextStep >= FLOW.length) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({ from: "bot", text: reinforcement });
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            addMessage({
              from: "bot",
              text: "🎉 Diagnóstico concluído! Agora preciso de algumas fotos pra gerar sua visualização 3D personalizada com a tecnologia Homenz.",
            });
            setTimeout(() => {
              showBotMessage("📸 Vou te guiar passo a passo — é simples e rápido. Bora?", undefined, 600);
              const finalAnswers = { ...answers, [step.key]: value };
              saveChatAnswers.mutate({
                sessionToken: token ?? "",
                gender: "male" as "male" | "female" | "other" | undefined,
                age: finalAnswers.age ? parseInt(finalAnswers.age) : undefined,
                hairProblem: finalAnswers.hairProblem,
                hairLossType: finalAnswers.hairLossType as "frontal" | "vertex" | "temporal" | "diffuse" | "total" | undefined,
                hairLossTime: finalAnswers.hairLossTime,
                previousTreatments: finalAnswers.previousTreatments,
                expectations: finalAnswers.expectations,
                chatAnswers: finalAnswers,
              });
            }, 1200);
          }, 700);
        }, 600);
      }, 800);
    } else {
      setCurrentStep(nextStep);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({ from: "bot", text: reinforcement });
        setTimeout(() => {
          showBotMessage(FLOW[nextStep].question, FLOW[nextStep].options, 600);
        }, 400);
      }, 600);
    }
  };

  const progress = Math.round((Math.min(currentStep, FLOW.length) / FLOW.length) * 100);
  const lastBotMessage = [...messages].reverse().find(m => m.from === "bot");
  const canShowInput = !isTyping && !done && !!lastBotMessage;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex flex-col">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-[#E2E8F0] px-4 py-3 shadow-sm">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-[#004A9D] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#00C1B8] rounded-full border-2 border-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-[#0A2540]" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Homenz IA — Diagnóstico Capilar
            </p>
            <p className="text-xs text-[#00C1B8] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00C1B8] inline-block animate-pulse" />
              Online agora
            </p>
          </div>
          {/* Progress */}
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className="text-xs text-[#5A667A]">{progress}% concluído</span>
            <div className="w-20 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#004A9D] to-[#00C1B8] transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
            >
              {msg.from === "bot" && (
                <div className="w-7 h-7 rounded-full bg-[#004A9D] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.from === "bot"
                    ? "bg-white border border-[#E2E8F0] text-[#0A2540] rounded-tl-sm shadow-sm"
                    : "bg-[#004A9D] text-white font-medium rounded-tr-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-200">
              <div className="w-7 h-7 rounded-full bg-[#004A9D] flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white border border-[#E2E8F0] px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-[#004A9D]/40 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="flex justify-center py-4 animate-in fade-in duration-500">
              <div className="flex items-center gap-2 bg-[#00C1B8]/10 border border-[#00C1B8]/30 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-[#00C1B8]" />
                <span className="text-sm text-[#00C1B8] font-medium">Redirecionando para captura de fotos...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      {canShowInput && (
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-[#E2E8F0] px-4 py-4 animate-in slide-in-from-bottom-3 duration-300 shadow-[0_-4px_16px_rgba(0,74,157,0.06)]">
          <div className="max-w-lg mx-auto">
            {/* Subtext hint */}
            {lastBotMessage?.options && (
              <p className="text-xs text-[#5A667A] mb-3 text-center">
                {FLOW[currentStep]?.subtext ?? ""}
              </p>
            )}

            {/* Opções de resposta */}
            {lastBotMessage?.options ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {lastBotMessage.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value, opt.label)}
                    className="flex items-center gap-2 bg-white hover:bg-[#EBF4FF] border border-[#E2E8F0] hover:border-[#004A9D]/40 rounded-xl px-4 py-3 text-sm text-[#0A2540] text-left transition-all duration-200 active:scale-[0.98] shadow-sm"
                  >
                    {opt.emoji && <span className="text-base flex-shrink-0">{opt.emoji}</span>}
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Input de texto livre */
              FLOW[currentStep] && !FLOW[currentStep].options ? (
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type={FLOW[currentStep]?.inputType ?? "text"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && handleAnswer(inputValue.trim())}
                    placeholder={FLOW[currentStep]?.placeholder ?? "Digite sua resposta..."}
                    className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#0A2540] placeholder-[#A0AABB] outline-none focus:border-[#004A9D] transition-colors"
                    autoFocus
                  />
                  <button
                    onClick={() => inputValue.trim() && handleAnswer(inputValue.trim())}
                    disabled={!inputValue.trim()}
                    className="bg-[#004A9D] hover:bg-[#003d85] text-white px-4 rounded-xl disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
