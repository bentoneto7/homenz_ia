import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { CaretRight, Sparkle, ShieldCheck, Lock, IconContext } from "@phosphor-icons/react";
import { useFunnelTheme } from "./useFunnelTheme";
import { FunnelThemeToggle } from "./FunnelThemeToggle";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: { label: string; value: string }[];
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
  options?: { label: string; value: string }[];
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
      { label: "Queda progressiva", value: "Queda de cabelo" },
      { label: "Calvície avançada", value: "Calvície progressiva" },
      { label: "Cabelo fino / rarefeito", value: "Rarefacção capilar" },
      { label: "Entradas na testa", value: "Entradas na testa" },
      { label: "Falhas no couro cabeludo", value: "Falhas no couro cabeludo" },
    ],
  },
  {
    key: "hairLossType",
    question: "Em qual região você sente mais?",
    subtext: "Isso define qual protocolo Homenz faz mais sentido pra você",
    options: [
      { label: "Frente / Testa", value: "frontal" },
      { label: "Topo da cabeça", value: "vertex" },
      { label: "Laterais (entradas)", value: "temporal" },
      { label: "Espalhado por toda a cabeça", value: "diffuse" },
      { label: "Área total", value: "total" },
    ],
  },
  {
    key: "hairLossTime",
    question: "Há quanto tempo você percebe isso?",
    subtext: "Quanto antes a gente age, melhores os resultados",
    options: [
      { label: "Menos de 1 ano", value: "Menos de 1 ano" },
      { label: "1 a 3 anos", value: "1 a 3 anos" },
      { label: "3 a 5 anos", value: "3 a 5 anos" },
      { label: "Mais de 5 anos", value: "Mais de 5 anos" },
    ],
  },
  {
    key: "previousTreatments",
    question: "Já tentou algum tratamento antes?",
    subtext: "Sem julgamento nenhum, só queremos entender o seu histórico",
    options: [
      { label: "Nunca fiz nada", value: "Nenhum tratamento anterior" },
      { label: "Minoxidil / remédios", value: "Minoxidil ou medicamentos" },
      { label: "Transplante capilar", value: "Transplante capilar" },
      { label: "Micropigmentação", value: "Micropigmentação" },
      { label: "Outros tratamentos", value: "Outros tratamentos" },
    ],
  },
  {
    key: "expectations",
    question: "O que você quer alcançar com o tratamento?",
    subtext: "Isso guia a personalização do seu resultado 3D",
    options: [
      { label: "Disfarçar a calvície no dia a dia", value: "Disfarcar a calvície no dia a dia" },
      { label: "Recuperar minha autoestima", value: "Recuperar a autoestima" },
      { label: "Resultado natural e duradouro", value: "Resultado natural e duradouro" },
      { label: "Solução rápida sem cirurgia", value: "Solução rápida sem cirurgia" },
    ],
  },
];

const REINFORCEMENTS = [
  "Anotado!",
  "Boa!",
  "Entendido!",
  "Show!",
  "Perfeito!",
  "Valeu!",
  "Isso ajuda muito!",
];

// Emoji por opção (só visual — o valor salvo do lead continua limpo)
const OPTION_EMOJI: Record<string, string> = {
  // Problema
  "Queda progressiva": "😟",
  "Calvície avançada": "😣",
  "Cabelo fino / rarefeito": "😬",
  "Entradas na testa": "🙂",
  "Falhas no couro cabeludo": "😕",
  // Região
  "Frente / Testa": "⬆️",
  "Topo da cabeça": "🔝",
  "Laterais (entradas)": "↔️",
  "Espalhado por toda a cabeça": "🌐",
  "Área total": "😰",
  // Tempo
  "Menos de 1 ano": "⏱️",
  "1 a 3 anos": "📅",
  "3 a 5 anos": "🗓️",
  "Mais de 5 anos": "⏳",
  // Tratamentos
  "Nunca fiz nada": "🚫",
  "Minoxidil / remédios": "💊",
  "Transplante capilar": "🏥",
  "Micropigmentação": "🖋️",
  "Outros tratamentos": "🧴",
  // Expectativa
  "Disfarçar a calvície no dia a dia": "🧢",
  "Recuperar minha autoestima": "💪",
  "Resultado natural e duradouro": "🌱",
  "Solução rápida sem cirurgia": "⚡",
};

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
  const { mode, toggle } = useFunnelTheme();

  // Remove o dark mode do painel (shadcn) — o funil tem o próprio tema (.funnel-theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

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

  useEffect(() => {
    if (!token) return;
    updateStep.mutate({ sessionToken: token, funnelStep: "chat_started" });
    setTimeout(() => {
      addMessage({ from: "bot", text: "E aí! Sou o assistente da Homenz." });
      setTimeout(() => {
        showBotMessage("Vou fazer 6 perguntas rápidas pra montar seu diagnóstico capilar personalizado com IA. Menos de 2 minutos.", undefined, 600);
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
              text: "Diagnóstico concluído! Agora preciso de algumas fotos pra gerar sua visualização 3D personalizada com a tecnologia Homenz.",
            });
            setTimeout(() => {
              showBotMessage("Vou te guiar passo a passo, é simples e rápido. Bora?", undefined, 600);
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
    <IconContext.Provider value={{ weight: "duotone" }}>
    <div className="funnel-theme min-h-[100dvh] flex flex-col sm:items-center sm:justify-center sm:p-6">
      {/* Card de conversa: tela cheia no mobile, painel centralizado no desktop (igual ao funil da franquia) */}
      <div
        className="w-full flex flex-col flex-1 min-h-0 sm:flex-none sm:max-w-2xl sm:h-[min(86vh,800px)] sm:rounded-2xl overflow-hidden"
        style={{ background: "var(--fn-bg)", border: "1px solid var(--fn-line)", boxShadow: "0 30px 80px -40px oklch(0.42 0.15 258 / 0.35)" }}
      >

      {/* ── Barra de urgência ── */}
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-center" style={{ background: "oklch(0.62 0.17 28)", color: "oklch(0.99 0.01 28)" }}>
        <span className="relative flex h-2 w-2 flex-shrink-0">
          <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: "oklch(0.99 0.01 28)" }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "oklch(0.99 0.01 28)" }} />
        </span>
        <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wide">Apenas 3 vagas gratuitas disponíveis esta semana</span>
      </div>

      {/* ── Header ── */}
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{ background: "color-mix(in oklab, var(--fn-bg) 88%, transparent)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--fn-line)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--fn-accent)" }}>
              <Sparkle className="w-4 h-4" weight="fill" style={{ color: "var(--fn-accent-ink)" }} />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full" style={{ background: "var(--fn-success)", border: "2px solid var(--fn-bg)" }} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate" style={{ color: "var(--fn-ink)" }}>
              Homenz IA — Diagnóstico Capilar
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--fn-accent)" }}>
              <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: "var(--fn-accent)" }} />
              Online agora
            </p>
          </div>
          {/* Progress + toggle */}
          <div className="ml-auto flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs hidden sm:block" style={{ color: "var(--fn-muted)" }}>{progress}% concluído</span>
              <div className="w-16 sm:w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--fn-line)" }}>
                <div
                  className="h-full transition-all duration-700 ease-out"
                  style={{ width: `${progress}%`, background: "var(--fn-accent)" }}
                />
              </div>
            </div>
            <FunnelThemeToggle mode={mode} onToggle={toggle} />
          </div>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"} fn-msg`}
            >
              {msg.from === "bot" && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1" style={{ background: "var(--fn-accent)" }}>
                  <Sparkle className="w-3 h-3" weight="fill" style={{ color: "var(--fn-accent-ink)" }} />
                </div>
              )}
              <div
                className="max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.from === "bot"
                    ? { background: "var(--fn-surface)", border: "1px solid var(--fn-line)", color: "var(--fn-ink)", borderTopLeftRadius: "0.25rem" }
                    : { background: "var(--fn-accent)", color: "var(--fn-accent-ink)", fontWeight: 500, borderTopRightRadius: "0.25rem" }
                }
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start fn-msg">
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1" style={{ background: "var(--fn-accent)" }}>
                <Sparkle className="w-3 h-3" weight="fill" style={{ color: "var(--fn-accent-ink)" }} />
              </div>
              <div className="px-4 py-3 rounded-2xl" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)", borderTopLeftRadius: "0.25rem" }}>
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: "var(--fn-muted)", animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="flex justify-center py-4 fn-msg">
              <div
                className="flex items-center gap-2 rounded-full px-4 py-2"
                style={{ background: "color-mix(in oklab, var(--fn-accent) 12%, transparent)", border: "1px solid color-mix(in oklab, var(--fn-accent) 30%, transparent)" }}
              >
                <Sparkle className="w-4 h-4" weight="fill" style={{ color: "var(--fn-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--fn-accent)" }}>Redirecionando para captura de fotos...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input area ── */}
      {canShowInput && (
        <div
          className="sticky bottom-0 px-4 py-4 fn-msg"
          style={{ background: "color-mix(in oklab, var(--fn-bg) 88%, transparent)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--fn-line)" }}
        >
          <div className="max-w-lg mx-auto">
            {/* Subtext hint */}
            {lastBotMessage?.options && (
              <p className="text-xs mb-3 text-center" style={{ color: "var(--fn-muted)" }}>
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
                    className="fn-option flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm text-left"
                    style={{ background: "var(--fn-surface)", color: "var(--fn-ink)" }}
                  >
                    {OPTION_EMOJI[opt.label] && (
                      <span className="text-xl leading-none flex-shrink-0" aria-hidden>{OPTION_EMOJI[opt.label]}</span>
                    )}
                    <span className="font-medium flex-1">{opt.label}</span>
                    <CaretRight className="w-4 h-4 flex-shrink-0" weight="bold" style={{ color: "var(--fn-accent)" }} />
                  </button>
                ))}
              </div>
            ) : (
              /* Input de texto livre */
              FLOW[currentStep] && !FLOW[currentStep].options ? (
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode={FLOW[currentStep]?.inputType === "number" ? "numeric" : "text"}
                    value={inputValue}
                    onChange={(e) =>
                      setInputValue(
                        FLOW[currentStep]?.inputType === "number"
                          ? e.target.value.replace(/\D/g, "").slice(0, 3)
                          : e.target.value
                      )
                    }
                    onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && handleAnswer(inputValue.trim())}
                    placeholder={FLOW[currentStep]?.placeholder ?? "Digite sua resposta..."}
                    className="flex-1 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                    style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)", color: "var(--fn-ink)" }}
                    autoFocus
                  />
                  <button
                    onClick={() => inputValue.trim() && handleAnswer(inputValue.trim())}
                    disabled={!inputValue.trim()}
                    className="px-4 rounded-xl disabled:opacity-40 transition-opacity flex items-center justify-center"
                    style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
                  >
                    <CaretRight className="w-5 h-5" weight="bold" />
                  </button>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* ── Footer de confiança ── */}
      <div className="flex items-center justify-center gap-4 px-4 py-2.5 text-[10px] flex-wrap" style={{ borderTop: "1px solid var(--fn-line)", color: "var(--fn-muted)" }}>
        <span className="flex items-center gap-1"><Lock className="w-3 h-3" weight="fill" style={{ color: "var(--fn-accent)" }} /> Dados protegidos</span>
        <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" weight="fill" style={{ color: "var(--fn-accent)" }} /> Análise 100% gratuita</span>
        <span>Sem compromisso</span>
      </div>
      </div>
    </div>
    </IconContext.Provider>
  );
}
