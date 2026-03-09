import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ChevronRight, Scissors, Sparkles } from "lucide-react";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: { label: string; value: string; emoji?: string }[];
};

type Answers = {
  gender?: string;
  age?: string;
  hairProblem?: string;
  hairLossType?: string;
  hairLossTime?: string;
  previousTreatments?: string;
  expectations?: string;
  howDidYouHear?: string;
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
    key: "gender",
    question: "Olá! Para personalizar sua análise, qual é o seu gênero?",
    subtext: "Usamos isso para aplicar a escala de calvície correta",
    options: [
      { label: "Masculino", value: "male", emoji: "👨" },
      { label: "Feminino", value: "female", emoji: "👩" },
      { label: "Prefiro não informar", value: "other", emoji: "🙂" },
    ],
  },
  {
    key: "age",
    question: "Qual é a sua idade?",
    subtext: "Isso nos ajuda a entender o estágio do processo capilar",
    inputType: "number",
    placeholder: "Digite sua idade (ex: 38)",
  },
  {
    key: "hairProblem",
    question: "Como você descreveria o que está acontecendo com seu cabelo?",
    subtext: "Escolha a opção que mais se aproxima da sua situação",
    options: [
      { label: "Queda progressiva", value: "Queda de cabelo", emoji: "😟" },
      { label: "Calvície avançada", value: "Calvície progressiva", emoji: "😔" },
      { label: "Cabelo fino / rarefeito", value: "Rarefação capilar", emoji: "🤔" },
      { label: "Entradas na testa", value: "Entradas na testa", emoji: "😕" },
      { label: "Falhas no couro cabeludo", value: "Falhas no couro cabeludo", emoji: "😞" },
    ],
  },
  {
    key: "hairLossType",
    question: "Em qual região você percebe mais a perda?",
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
    question: "Há quanto tempo você percebe essa situação?",
    subtext: "Isso nos ajuda a estimar o estágio e as possibilidades de resultado",
    options: [
      { label: "Menos de 1 ano", value: "Menos de 1 ano", emoji: "🆕" },
      { label: "1 a 3 anos", value: "1 a 3 anos", emoji: "📅" },
      { label: "3 a 5 anos", value: "3 a 5 anos", emoji: "⏳" },
      { label: "Mais de 5 anos", value: "Mais de 5 anos", emoji: "🕰️" },
    ],
  },
  {
    key: "previousTreatments",
    question: "Você já tentou algum tratamento antes?",
    subtext: "Sem julgamentos — isso nos ajuda a entender o histórico",
    options: [
      { label: "Nunca fiz nenhum", value: "Nenhum tratamento anterior", emoji: "🚫" },
      { label: "Minoxidil / medicamentos", value: "Minoxidil ou medicamentos", emoji: "💊" },
      { label: "Transplante capilar", value: "Transplante capilar", emoji: "🏥" },
      { label: "Micropigmentação", value: "Micropigmentação", emoji: "✏️" },
      { label: "Outros tratamentos", value: "Outros tratamentos", emoji: "🔬" },
    ],
  },
  {
    key: "expectations",
    question: "O que você mais deseja alcançar com o preenchimento?",
    subtext: "Sua resposta guia a personalização do resultado 3D",
    options: [
      { label: "Disfarçar a calvície no dia a dia", value: "Disfarçar a calvície no dia a dia", emoji: "🎯" },
      { label: "Recuperar minha autoestima", value: "Recuperar a autoestima", emoji: "💪" },
      { label: "Resultado natural e duradouro", value: "Resultado natural e duradouro", emoji: "✨" },
      { label: "Solução rápida sem cirurgia", value: "Solução rápida sem cirurgia", emoji: "⚡" },
    ],
  },
  {
    key: "howDidYouHear",
    question: "Última pergunta: como você ficou sabendo sobre nós?",
    options: [
      { label: "Instagram / Facebook", value: "Redes sociais", emoji: "📱" },
      { label: "Google", value: "Google", emoji: "🔍" },
      { label: "Indicação de amigo", value: "Indicação", emoji: "👥" },
      { label: "YouTube", value: "YouTube", emoji: "▶️" },
      { label: "Outro", value: "Outro", emoji: "💬" },
    ],
  },
];

// Mensagens de reforço positivo após cada resposta
const REINFORCEMENTS = [
  "Entendido! ✅",
  "Anotado! 📝",
  "Perfeito! 👍",
  "Ótimo! ✨",
  "Compreendido! 💡",
  "Excelente! 🎯",
  "Muito bem! 💪",
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

  const updateStep = trpc.leads.updateStep.useMutation();
  const saveChatAnswers = trpc.leads.saveChatAnswers.useMutation({
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate(`/c/${slug}/fotos/${token}`), 2000);
    },
    onError: (err) => toast.error(err.message),
  });

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

  // Iniciar chat
  useEffect(() => {
    if (!token) return;
    updateStep.mutate({ sessionToken: token, funnelStep: "chat_started" });
    setTimeout(() => {
      addMessage({
        from: "bot",
        text: "Olá! 👋 Sou o assistente do Instituto Capilar Uberaba.",
      });
      setTimeout(() => {
        showBotMessage("Vou fazer 8 perguntas rápidas para personalizar sua análise capilar com IA. Leva menos de 2 minutos! 🚀", undefined, 600);
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
      // Finalizar chat
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
              text: "🎉 Diagnóstico concluído! Agora vou precisar de algumas fotos para gerar sua visualização 3D personalizada.",
            });
            setTimeout(() => {
              showBotMessage("📸 Vou te guiar no processo — é simples e rápido. Preparado?", undefined, 600);
              const finalAnswers = { ...answers, [step.key]: value };
              saveChatAnswers.mutate({
                sessionToken: token ?? "",
                gender: finalAnswers.gender as "male" | "female" | "other" | undefined,
                age: finalAnswers.age ? parseInt(finalAnswers.age) : undefined,
                hairProblem: finalAnswers.hairProblem,
                hairLossType: finalAnswers.hairLossType as "frontal" | "vertex" | "temporal" | "diffuse" | "total" | undefined,
                hairLossTime: finalAnswers.hairLossTime,
                previousTreatments: finalAnswers.previousTreatments,
                expectations: finalAnswers.expectations,
                howDidYouHear: finalAnswers.howDidYouHear,
                chatAnswers: finalAnswers,
              });
            }, 1200);
          }, 700);
        }, 600);
      }, 800);
    } else {
      setCurrentStep(nextStep);
      // Mostrar reforço positivo antes da próxima pergunta
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
  const currentQuestion = FLOW[currentStep];
  const canShowInput = !isTyping && !done && messages.length > 0 && messages[messages.length - 1]?.from === "bot";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center flex-shrink-0">
              <Scissors className="w-4 h-4 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0a0a0a]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-white">Diagnóstico Capilar IA</p>
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Online agora
            </p>
          </div>
          {/* Progress */}
          <div className="ml-auto flex flex-col items-end gap-1">
            <span className="text-xs text-white/40">{progress}% concluído</span>
            <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full gradient-gold transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 duration-300`}
            >
              {msg.from === "bot" && (
                <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Scissors className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.from === "bot"
                    ? "bg-white/5 border border-white/10 text-white rounded-tl-sm"
                    : "gradient-gold text-black font-medium rounded-tr-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-200">
              <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <Scissors className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
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
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-emerald-400">Redirecionando para captura de fotos...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      {canShowInput && (
        <div className="sticky bottom-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10 px-4 py-4 animate-in slide-in-from-bottom-3 duration-300">
          <div className="max-w-lg mx-auto">
            {/* Subtext hint */}
            {currentQuestion?.subtext && (
              <p className="text-xs text-white/30 mb-2 text-center">{currentQuestion.subtext}</p>
            )}

            {currentQuestion?.options ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleAnswer(opt.value, opt.label)}
                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#D4A843]/40 rounded-xl px-4 py-3 text-sm text-white text-left transition-all duration-200 active:scale-[0.98]"
                  >
                    {opt.emoji && <span className="text-base flex-shrink-0">{opt.emoji}</span>}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type={currentQuestion?.inputType ?? "text"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && handleAnswer(inputValue.trim())}
                  placeholder={currentQuestion?.placeholder ?? "Digite sua resposta..."}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-[#D4A843]/60 transition-colors"
                  autoFocus
                />
                <button
                  onClick={() => inputValue.trim() && handleAnswer(inputValue.trim())}
                  disabled={!inputValue.trim()}
                  className="gradient-gold text-black px-4 rounded-xl disabled:opacity-40 transition-opacity"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
