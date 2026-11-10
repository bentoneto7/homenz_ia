import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  CheckCircle, Circle, ArrowRight, RocketLaunch, Globe, UsersThree, ShareNetwork, Lightning, Timer,
} from "@phosphor-icons/react";
import { AUTH } from "./auth/authKit";

const STEPS = [
  {
    id: "landing",
    icon: Globe,
    title: "Criar sua landing page",
    description: "Configure a página de captação da sua clínica com logo, fotos e link de agendamento.",
    cta: "Criar agora",
    path: "/franqueado?tab=landing",
  },
  {
    id: "seller",
    icon: UsersThree,
    title: "Convidar seu vendedor",
    description: "Adicione um vendedor para receber e qualificar os leads gerados pelo funil.",
    cta: "Convidar",
    path: "/franqueado?tab=equipe",
  },
  {
    id: "share",
    icon: ShareNetwork,
    title: "Compartilhar o link do funil",
    description: "Envie o link do diagnóstico capilar para seus contatos e redes sociais.",
    cta: "Ver link",
    path: "/franqueado?tab=funil",
  },
];

export default function BoasVindas() {
  const [, navigate] = useLocation();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [animIn, setAnimIn] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimIn(true), 100);
    return () => clearTimeout(t);
  }, []);

  const toggleStep = (id: string) => {
    setCompletedSteps((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleGoToDashboard = () => navigate("/franqueado");

  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-5 py-12"
      style={{ background: AUTH.surfaceAlt, fontFamily: AUTH.body }}
    >
      <div className={`w-full max-w-2xl transition-all duration-700 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: AUTH.blue, boxShadow: "0 14px 34px -12px rgba(0,74,157,0.55)" }}>
            <RocketLaunch weight="fill" className="w-8 h-8 text-white" />
          </div>
          <h1 className="mb-2 font-semibold" style={{ fontFamily: AUTH.display, color: AUTH.ink, fontSize: "clamp(1.9rem, 4vw, 2.4rem)", letterSpacing: "-0.02em" }}>
            Seus 15 dias grátis começaram!
          </h1>
          <p className="text-lg" style={{ color: AUTH.bodyText }}>
            Complete os primeiros passos para gerar seus primeiros leads ainda hoje.
          </p>
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full" style={{ background: "rgba(0,193,184,0.10)", border: "1px solid rgba(0,193,184,0.26)" }}>
            <Timer weight="fill" className="w-4 h-4" style={{ color: AUTH.teal }} />
            <span className="text-sm font-semibold" style={{ color: AUTH.teal }}>15 dias grátis · Sem cartão de crédito</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold" style={{ color: AUTH.ink }}>Configuração inicial</span>
            <span className="text-sm font-semibold" style={{ color: AUTH.teal }}>{completedSteps.length}/{STEPS.length} concluídos</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden" style={{ background: AUTH.line }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${AUTH.blue}, ${AUTH.tealFill})` }} />
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
                className="rounded-2xl p-5 transition-all duration-300"
                style={{
                  background: done ? "rgba(0,193,184,0.05)" : AUTH.bg,
                  border: `1px solid ${done ? "rgba(0,193,184,0.35)" : AUTH.line}`,
                  boxShadow: AUTH.shadow,
                }}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleStep(step.id)}
                    className="mt-0.5 flex-shrink-0 focus:outline-none"
                    aria-label={done ? "Marcar como não concluído" : "Marcar como concluído"}
                  >
                    {done ? (
                      <CheckCircle weight="fill" className="w-6 h-6" style={{ color: AUTH.tealFill }} />
                    ) : (
                      <Circle className="w-6 h-6 transition-colors" style={{ color: AUTH.lineStrong }} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 rounded-lg" style={{ background: "rgba(0,74,157,0.08)" }}>
                        <Icon weight="bold" className="w-4 h-4" style={{ color: AUTH.blue }} />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: AUTH.muted }}>Passo {idx + 1}</span>
                    </div>
                    <h3 className="font-bold text-base mb-1" style={{ color: done ? AUTH.muted : AUTH.ink, textDecoration: done ? "line-through" : "none" }}>
                      {step.title}
                    </h3>
                    <p className="text-sm mb-3" style={{ color: AUTH.bodyText }}>{step.description}</p>
                    <button
                      onClick={() => navigate(step.path)}
                      className="inline-flex items-center gap-1 text-xs font-bold rounded-full px-4 py-2 transition-colors"
                      style={{ color: AUTH.blue, border: `1px solid ${AUTH.lineStrong}` }}
                    >
                      {step.cta}
                      <ArrowRight weight="bold" className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA principal */}
        <div className="text-center">
          <button
            onClick={handleGoToDashboard}
            className="inline-flex items-center justify-center gap-2 font-bold px-10 py-4 rounded-full text-base text-white transition-all hover:-translate-y-0.5"
            style={{ background: AUTH.blue, boxShadow: "0 14px 34px -12px rgba(0,74,157,0.6)" }}
          >
            <Lightning weight="fill" className="w-5 h-5" />
            Ir para o painel
          </button>
          <p className="text-xs mt-3" style={{ color: AUTH.muted }}>
            Você pode completar esses passos a qualquer momento no painel.
          </p>
        </div>
      </div>
    </div>
  );
}
