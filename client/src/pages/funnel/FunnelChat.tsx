import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ChevronRight, Scissors } from "lucide-react";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  options?: { label: string; value: string }[];
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
  options?: { label: string; value: string }[];
  inputType?: "text" | "number";
  placeholder?: string;
}[] = [
  {
    key: "gender",
    question: "Para começar, qual é o seu gênero? Isso nos ajuda a usar a escala correta de calvície.",
    options: [
      { label: "Masculino", value: "male" },
      { label: "Feminino", value: "female" },
      { label: "Prefiro não informar", value: "other" },
    ],
  },
  {
    key: "age",
    question: "Qual é a sua idade?",
    inputType: "number",
    placeholder: "Ex: 35",
  },
  {
    key: "hairProblem",
    question: "Como você descreveria o seu problema capilar principal?",
    options: [
      { label: "Queda de cabelo", value: "Queda de cabelo" },
      { label: "Calvície progressiva", value: "Calvície progressiva" },
      { label: "Rarefação (cabelo fino)", value: "Rarefação capilar" },
      { label: "Entradas na testa", value: "Entradas na testa" },
      { label: "Falhas no couro cabeludo", value: "Falhas no couro cabeludo" },
    ],
  },
  {
    key: "hairLossType",
    question: "Em qual região você percebe mais a perda?",
    options: [
      { label: "Frente/Testa", value: "frontal" },
      { label: "Topo da cabeça", value: "vertex" },
      { label: "Laterais (entradas)", value: "temporal" },
      { label: "Espalhado por toda a cabeça", value: "diffuse" },
      { label: "Área total", value: "total" },
    ],
  },
  {
    key: "hairLossTime",
    question: "Há quanto tempo você percebe essa situação?",
    options: [
      { label: "Menos de 1 ano", value: "Menos de 1 ano" },
      { label: "1 a 3 anos", value: "1 a 3 anos" },
      { label: "3 a 5 anos", value: "3 a 5 anos" },
      { label: "Mais de 5 anos", value: "Mais de 5 anos" },
    ],
  },
  {
    key: "previousTreatments",
    question: "Você já fez algum tratamento capilar antes?",
    options: [
      { label: "Nunca fiz nenhum", value: "Nenhum tratamento anterior" },
      { label: "Minoxidil/medicamentos", value: "Minoxidil ou medicamentos" },
      { label: "Transplante capilar", value: "Transplante capilar" },
      { label: "Micropigmentação", value: "Micropigmentação" },
      { label: "Outros tratamentos", value: "Outros tratamentos" },
    ],
  },
  {
    key: "expectations",
    question: "O que você espera alcançar com o preenchimento capilar?",
    options: [
      { label: "Disfarçar a calvície no dia a dia", value: "Disfarçar a calvície no dia a dia" },
      { label: "Recuperar a autoestima", value: "Recuperar a autoestima" },
      { label: "Resultado natural e duradouro", value: "Resultado natural e duradouro" },
      { label: "Solução rápida sem cirurgia", value: "Solução rápida sem cirurgia" },
    ],
  },
  {
    key: "howDidYouHear",
    question: "Como você ficou sabendo sobre nós?",
    options: [
      { label: "Instagram / Facebook", value: "Redes sociais" },
      { label: "Google", value: "Google" },
      { label: "Indicação de amigo", value: "Indicação" },
      { label: "YouTube", value: "YouTube" },
      { label: "Outro", value: "Outro" },
    ],
  },
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
  const bottomRef = useRef<HTMLDivElement>(null);

  const updateStep = trpc.leads.updateStep.useMutation();
  const saveChatAnswers = trpc.leads.saveChatAnswers.useMutation({
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate(`/c/${slug}/fotos/${token}`), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const addMessage = (msg: Omit<Message, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: Date.now().toString() + Math.random() }]);
  };

  const showBotMessage = (text: string, options?: Message["options"], delay = 800) => {
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
        text: "Olá! 👋 Vou fazer algumas perguntas rápidas para personalizar sua análise capilar. Leva menos de 2 minutos!",
      });
      setTimeout(() => {
        showBotMessage(FLOW[0].question, FLOW[0].options, 600);
      }, 1000);
    }, 500);
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

    if (nextStep >= FLOW.length) {
      // Finalizar chat
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMessage({
          from: "bot",
          text: "Perfeito! Agora preciso de algumas fotos para gerar sua análise personalizada. Vou te guiar no processo. 📸",
        });
        const finalAnswers = { ...answers, [step.key]: value };
        saveChatAnswers.mutate({
          sessionToken: token ?? "",
          gender: finalAnswers.gender as any,
          age: finalAnswers.age ? parseInt(finalAnswers.age) : undefined,
          hairProblem: finalAnswers.hairProblem,
          hairLossType: finalAnswers.hairLossType as any,
          hairLossTime: finalAnswers.hairLossTime,
          previousTreatments: finalAnswers.previousTreatments,
          expectations: finalAnswers.expectations,
          howDidYouHear: finalAnswers.howDidYouHear,
          chatAnswers: finalAnswers,
        });
      }, 800);
    } else {
      setCurrentStep(nextStep);
      showBotMessage(FLOW[nextStep].question, FLOW[nextStep].options);
    }
  };

  const currentQuestion = FLOW[currentStep];
  const isLastMessageFromBot = messages.length > 0 && messages[messages.length - 1]?.from === "bot";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-full gradient-gold flex items-center justify-center flex-shrink-0">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Diagnóstico Capilar</p>
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              Online agora
            </p>
          </div>
          {/* Progress */}
          <div className="ml-auto flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{Math.min(currentStep, FLOW.length)}/{FLOW.length}</span>
            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full gradient-gold transition-all duration-500"
                style={{ width: `${(Math.min(currentStep, FLOW.length) / FLOW.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-lg mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.from === "bot" && (
                <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                  <Scissors className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.from === "bot"
                    ? "bg-card border border-border text-foreground rounded-tl-sm chat-bubble-left"
                    : "gradient-gold text-white rounded-tr-sm chat-bubble-right"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-full gradient-gold flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <Scissors className="w-3 h-3 text-white" />
              </div>
              <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1 items-center h-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      {!isTyping && !done && isLastMessageFromBot && (
        <div className="sticky bottom-0 bg-background border-t border-border px-4 py-4">
          <div className="max-w-lg mx-auto">
            {currentQuestion?.options ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {currentQuestion.options.map((opt) => (
                  <Button
                    key={opt.value}
                    variant="outline"
                    className="text-left justify-start h-auto py-3 px-4 text-sm"
                    onClick={() => handleAnswer(opt.value, opt.label)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type={currentQuestion?.inputType ?? "text"}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && handleAnswer(inputValue.trim())}
                  placeholder={currentQuestion?.placeholder ?? "Digite sua resposta..."}
                  className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
                />
                <Button
                  onClick={() => inputValue.trim() && handleAnswer(inputValue.trim())}
                  disabled={!inputValue.trim()}
                  className="gradient-gold text-white border-0 px-4"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
