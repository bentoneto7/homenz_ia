/**
 * Landing pública do funil da CLÍNICA (/c/:slug, banco TiDB).
 *
 * Usa a mesma view rica do funil da franquia (FranchiseLandingView) para
 * manter as duas landings visualmente idênticas; muda só o conteúdo (copy da
 * clínica) e o fluxo: aqui o lead vira sessionToken e segue pro chat
 * (/c/:slug/chat/:token), em vez do round-robin de vendedores.
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Scissors, CheckCircle, IconContext } from "@phosphor-icons/react";
import FranchiseLandingView from "./FranchiseLandingView";
import { DEFAULT_CONTENT, type LandingContent } from "./landingContent";

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    referrer: document.referrer || undefined,
  };
}

const accentTint = "color-mix(in oklab, var(--fn-accent) 12%, transparent)";
const accentLine = "color-mix(in oklab, var(--fn-accent) 30%, transparent)";

export default function ClinicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [submitted, setSubmitted] = useState(false);
  const [leadName, setLeadName] = useState("");

  // Escassez determinística: estável dentro da semana (F5 não muda), renova a cada semana.
  const spotsLeft = useMemo(() => {
    const week = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const seed = `${slug ?? ""}-${week}`;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return (Math.abs(h) % 4) + 2;
  }, [slug]);

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const { data: clinic, isLoading, error } = trpc.clinic.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug, retry: false }
  );

  const createLead = trpc.leads.create.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setTimeout(() => {
        navigate(`/c/${slug}/chat/${data.sessionToken}`);
      }, 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  // Remove o dark mode do painel (shadcn) — o funil tem o próprio tema (.funnel-theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  if (isLoading) {
    return (
      <div className="funnel-theme min-h-[100dvh] flex items-center justify-center">
        <div className="text-center">
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: "var(--fn-accent)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--fn-muted)" }}>Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <IconContext.Provider value={{ weight: "duotone" }}>
        <div className="funnel-theme min-h-[100dvh] flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: accentTint, border: `1px solid ${accentLine}` }}
            >
              <Scissors className="w-8 h-8" style={{ color: "var(--fn-accent)" }} />
            </div>
            <h2 className="font-bold text-xl mb-2" style={{ color: "var(--fn-ink)" }}>Clínica não encontrada</h2>
            <p className="text-sm mb-6" style={{ color: "var(--fn-muted)" }}>
              O link que você acessou pode estar desatualizado. Entre em contato com a clínica para obter o link correto.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-colors"
              style={{ border: "1px solid var(--fn-line-strong)", color: "var(--fn-accent)" }}
            >
              Voltar
            </button>
          </div>
        </div>
      </IconContext.Provider>
    );
  }

  if (submitted) {
    return (
      <IconContext.Provider value={{ weight: "duotone" }}>
        <div className="funnel-theme min-h-[100dvh] flex items-center justify-center px-4">
          <div
            className="text-center max-w-sm w-full rounded-[var(--fn-r-card)] p-8"
            style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: accentTint, border: `1px solid ${accentLine}` }}
            >
              <CheckCircle className="w-10 h-10" weight="fill" style={{ color: "var(--fn-accent)" }} />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--fn-ink)" }}>
              Perfeito, {leadName.split(" ")[0]}!
            </h2>
            <p style={{ color: "var(--fn-muted)" }}>Iniciando seu diagnóstico personalizado...</p>
            <div className="flex justify-center mt-4">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--fn-accent)", borderTopColor: "transparent" }} />
            </div>
          </div>
        </div>
      </IconContext.Provider>
    );
  }

  // Mesma estrutura da landing da franquia; muda só o copy (fluxo da clínica)
  const content: LandingContent = {
    ...DEFAULT_CONTENT,
    urgency: {
      enabled: true,
      text: `Apenas ${spotsLeft} vagas disponíveis esta semana em ${clinic.city} · Análise 100% gratuita`,
    },
    hero: {
      badge: "Análise gratuita com IA",
      headline: "Veja como você vai ficar após o preenchimento capilar, antes de decidir",
      highlight: "antes de decidir",
      subtitle: "Faça uma avaliação capilar especializada e veja uma simulação realista do seu resultado. Grátis, rápido e sem compromisso.",
    },
    socialProof: { ...DEFAULT_CONTENT.socialProof, text: "já viram o resultado este mês" },
    capture: {
      title: "Comece agora, leva 5 minutos",
      subtitle: "Sem cartão de crédito. Sem compromisso. Resultado na hora.",
      ctaText: "Ver minha simulação, grátis",
    },
    trust: [
      { icon: "shield", label: "Dados protegidos" },
      { icon: "clock", label: "5 minutos" },
      { icon: "gift", label: "100% gratuito" },
    ],
    howItWorks: [
      { icon: "search", title: "Diagnóstico", desc: "Chat personalizado, sem constrangimento" },
      { icon: "camera", title: "Suas fotos", desc: "Análise real da área que te preocupa" },
      { icon: "sparkles", title: "Sua simulação", desc: "Veja seu antes e depois na hora" },
      { icon: "calendar", title: "Agendamento", desc: "Consulta gratuita com especialista" },
    ],
    beforeAfter: [],
  };

  const services = Array.isArray(clinic.services) ? (clinic.services as unknown[]) : [];

  return (
    <FranchiseLandingView
      content={content}
      franchiseName={clinic.name}
      city={clinic.city ?? undefined}
      state={clinic.state ?? undefined}
      address={clinic.address ?? undefined}
      whatsapp={clinic.whatsapp || clinic.phone || undefined}
      submitting={createLead.isPending}
      collectEmail
      maskPhone={maskPhone}
      onStart={(name, phone, email) => {
        setLeadName(name);
        createLead.mutate({
          clinicSlug: slug ?? "",
          name,
          phone,
          email,
          ...getUTMParams(),
        });
      }}
    >
      {services.length > 0 && (
        <section className="px-5 py-6" style={{ background: "var(--fn-surface)", borderTop: "1px solid var(--fn-line)" }}>
          <div className="max-w-5xl mx-auto">
            <h3 className="text-center text-sm font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--fn-muted)" }}>
              Serviços disponíveis
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {services.map((s, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 text-xs rounded-full font-medium"
                  style={{ background: accentTint, color: "var(--fn-accent)", border: `1px solid ${accentLine}` }}
                >
                  {String(s)}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </FranchiseLandingView>
  );
}
