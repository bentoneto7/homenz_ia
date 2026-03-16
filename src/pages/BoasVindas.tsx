import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Rocket,
  Globe,
  Users,
  Share2,
  Zap,
  Timer,
} from "lucide-react";

const STEPS = [
  {
    id: "landing",
    icon: Globe,
    title: "Criar sua landing page",
    description: "Configure a página de captação da sua clínica com logo, fotos e link de agendamento.",
    cta: "Criar agora",
    path: "/franqueado?tab=landing",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  {
    id: "seller",
    icon: Users,
    title: "Convidar seu vendedor",
    description: "Adicione um vendedor para receber e qualificar os leads gerados pelo funil.",
    cta: "Convidar",
    path: "/franqueado?tab=equipe",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    id: "share",
    icon: Share2,
    title: "Compartilhar o link do funil",
    description: "Envie o link do diagnóstico capilar para seus contatos e redes sociais.",
    cta: "Ver link",
    path: "/franqueado?tab=funil",
    color: "text-purple-600",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
];

export default function BoasVindas() {
  const [, navigate] = useLocation();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    // Animação de entrada
    const t = setTimeout(() => setAnimIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGoToDashboard = () => {
    navigate("/franqueado");
  };

  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex items-center justify-center px-4 py-12">
      <div
        className={`w-full max-w-2xl transition-all duration-700 ${
          animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0A2540] to-[#00C4A0] mb-5 shadow-lg">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-[#0A2540] mb-2">
            Seus 15 dias grátis começaram!
          </h1>
          <p className="text-[#5A667A] text-lg">
            Complete os primeiros passos para gerar seus primeiros leads ainda hoje.
          </p>

          {/* Trial badge */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#00C4A0]/10 border border-[#00C4A0]/30 rounded-full">
            <Timer className="w-4 h-4 text-[#00C4A0]" />
            <span className="text-sm font-semibold text-[#00C4A0]">
              15 dias grátis · Sem cartão de crédito
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#0A2540]">
              Configuração inicial
            </span>
            <span className="text-sm font-semibold text-[#00C4A0]">
              {completedSteps.length}/{STEPS.length} concluídos
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0A2540] to-[#00C4A0] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="space-y-4 mb-8">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const done = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                className={`rounded-2xl border-2 p-5 transition-all duration-300 ${
                  done
                    ? "border-[#00C4A0]/40 bg-[#00C4A0]/5"
                    : `${step.border} bg-white`
                } shadow-sm hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  {/* Step number / check */}
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="mt-0.5 flex-shrink-0 focus:outline-none"
                    aria-label={done ? "Marcar como não concluído" : "Marcar como concluído"}
                  >
                    {done ? (
                      <CheckCircle2 className="w-6 h-6 text-[#00C4A0]" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-300 hover:text-[#00C4A0] transition-colors" />
                    )}
                  </button>

                  {/* Icon + content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`p-1.5 rounded-lg ${step.bg}`}>
                        <Icon className={`w-4 h-4 ${step.color}`} />
                      </div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Passo {idx + 1}
                      </span>
                    </div>
                    <h3
                      className={`font-bold text-base mb-1 transition-colors ${
                        done ? "text-gray-400 line-through" : "text-[#0A2540]"
                      }`}
                    >
                      {step.title}
                    </h3>
                    <p className="text-sm text-[#5A667A] mb-3">{step.description}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs font-semibold border-2 ${step.border} ${step.color} hover:${step.bg}`}
                      onClick={() => navigate(step.path)}
                    >
                      {step.cta}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA principal */}
        <div className="text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] hover:from-[#0d2d4a] hover:to-[#1e4570] text-white font-bold px-10 py-4 rounded-xl text-base shadow-lg"
            onClick={handleGoToDashboard}
          >
            <Zap className="w-5 h-5 mr-2" />
            Ir para o painel
          </Button>
          <p className="text-xs text-gray-400 mt-3">
            Você pode completar esses passos a qualquer momento no painel.
          </p>
        </div>
      </div>
    </div>
  );
}
