/**
 * View da landing rica do funil da franquia (as 8 seções de DESIGN.md).
 * Tema "navy cirúrgica premium", escopado em .funnel-theme.
 *
 * É só apresentação: recebe o `content` (resolvido white-label) + dados de
 * exibição da franquia, e dispara `onStart(name, phone)` quando o visitante
 * envia o card de captura. Toda a lógica de funil (pixel, chat, IA) fica na
 * página FranchiseLanding.
 */

import { useEffect, useRef, useState } from "react";
import {
  ShieldCheck, Clock, Lock, Gift, Check, MagnifyingGlass, Camera, Sparkle,
  CalendarCheck, MapPin, Phone, CaretRight, Star, ArrowRight, IconContext,
} from "@phosphor-icons/react";
import type { LandingContent, LandingTrustSeal, LandingStep } from "./landingContent";
import FunnelWordmark from "./FunnelWordmark";
import { useFunnelTheme } from "./useFunnelTheme";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { FunnelThemeToggle } from "./FunnelThemeToggle";

interface Props {
  content: LandingContent;
  franchiseName: string;
  /** Logo custom da franquia. Sem ele, usa a wordmark vetorial Homenz. */
  logoUrl?: string;
  city?: string;
  state?: string;
  address?: string;
  whatsapp?: string;
  submitting?: boolean;
  /** Exibe campo de e-mail opcional no card de captura (funil da clínica). */
  collectEmail?: boolean;
  maskPhone: (v: string) => string;
  onStart: (name: string, phone: string, email?: string) => void;
  /** Seções extras renderizadas antes do rodapé (ex.: serviços da clínica). */
  children?: React.ReactNode;
}

const TRUST_ICON: Record<LandingTrustSeal["icon"], typeof ShieldCheck> = {
  shield: ShieldCheck, clock: Clock, lock: Lock, gift: Gift, check: Check,
};
const STEP_ICON: Record<LandingStep["icon"], typeof MagnifyingGlass> = {
  search: MagnifyingGlass, camera: Camera, sparkles: Sparkle, calendar: CalendarCheck,
};

/** Divide o headline em [antes, destaque, depois] para colorir o trecho `highlight`. */
function splitHeadline(headline: string, highlight: string): [string, string, string] {
  if (!highlight) return [headline, "", ""];
  const i = headline.indexOf(highlight);
  if (i === -1) return [headline, "", ""];
  return [headline.slice(0, i), highlight, headline.slice(i + highlight.length)];
}

export default function FranchiseLandingView({
  content, franchiseName, logoUrl, city, state, address, whatsapp,
  submitting, collectEmail, maskPhone, onStart, children,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [activeT, setActiveT] = useState(0);
  const [testimonialsPaused, setTestimonialsPaused] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const { mode, toggle } = useFunnelTheme();

  // Override de tema por franquia (white-label) — só sobrescreve o que vier definido
  const themeStyle: React.CSSProperties = {};
  if (content.theme?.accent) (themeStyle as Record<string, string>)["--fn-accent"] = content.theme.accent;
  if (content.theme?.surface) (themeStyle as Record<string, string>)["--fn-surface"] = content.theme.surface;

  useEffect(() => {
    if (content.testimonials.length < 2 || testimonialsPaused) return;
    const t = setInterval(() => setActiveT((i) => (i + 1) % content.testimonials.length), 5000);
    return () => clearInterval(t);
  }, [content.testimonials.length, testimonialsPaused]);

  const [before, hl, after] = splitHeadline(content.hero.headline, content.hero.highlight);
  const cityState = [city, state].filter(Boolean).join("/");
  // Visual do hero: foto custom da franquia (white-label) ou o retrato Homenz padrão
  const heroPhoto = content.hero.imageUrl || "/funnel/hero-homenz.jpg";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Valida os dois campos juntos: o visitante corrige tudo numa tentativa só
    const next: { name?: string; phone?: string } = {};
    if (!name.trim()) next.name = "Informe seu nome";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Informe um WhatsApp válido com DDD";
    setErrors(next);
    if (next.name || next.phone) return;
    onStart(name.trim(), phone, email.trim() || undefined);
  };

  const scrollToCapture = () =>
    captureRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <IconContext.Provider value={{ weight: "duotone" }}>
    <div className="funnel-theme min-h-[100dvh]" style={themeStyle}>
      {/* ── 1. URGENCY BAR ── */}
      {content.urgency.enabled && (
        <div
          className="flex items-center justify-center gap-2.5 px-4 py-2.5 text-center text-[13px] font-semibold"
          style={{
            background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--fn-accent) 14%, transparent), transparent)",
            color: "var(--fn-ink)",
            borderBottom: "1px solid color-mix(in oklab, var(--fn-accent) 22%, transparent)",
          }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="fn-pulse absolute inline-flex h-full w-full rounded-full" style={{ background: "var(--fn-accent)" }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--fn-accent)" }} />
          </span>
          {content.urgency.text}
        </div>
      )}

      {/* ── 2. HEADER ── */}
      <header className="px-5 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {logoUrl
              ? <img src={logoUrl} alt={franchiseName} className="h-8 object-contain" />
              : <FunnelWordmark height={28} />}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[13px]" style={{ color: "var(--fn-muted)" }}>
              <MapPin className="w-3.5 h-3.5" style={{ color: "var(--fn-accent)" }} />
              <span style={{ color: "var(--fn-body)" }} className="font-medium">{franchiseName}</span>
              {cityState && <><span>·</span><span>{cityState}</span></>}
            </div>
            <FunnelThemeToggle mode={mode} onToggle={toggle} />
          </div>
        </div>
      </header>

      {/* ── 3. HERO + 4. CAPTURE ── copy+card à esquerda, foto à direita (desktop) ── */}
      <section className="px-5 pt-6 pb-12 sm:pt-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Coluna esquerda: copy + card */}
          <div className="text-center lg:text-left">
            {/* Foto do hero (mobile/tablet): retrato contido — nunca esticar além da resolução nativa */}
            <div className="lg:hidden relative mx-auto mb-7 w-[min(60vw,250px)]">
              <div
                className="absolute -inset-8 pointer-events-none"
                style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--fn-accent) 15%, transparent), transparent)" }}
              />
              <div className="relative rounded-[var(--fn-r-card)] overflow-hidden aspect-[4/5]" style={{ border: "1px solid var(--fn-line)" }}>
                <img src={heroPhoto} alt="Homem com cabelo saudável" className="w-full h-full object-cover object-top" />
              </div>
            </div>

            <span
              className="fn-rise fn-rise-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold mb-6"
              style={{ background: "var(--fn-elevated)", color: "var(--fn-body)", border: "1px solid var(--fn-line)" }}
            >
              <Sparkle className="w-3.5 h-3.5" style={{ color: "var(--fn-accent)" }} />
              {content.hero.badge}
            </span>

            <h1
              className="fn-rise fn-rise-2 font-semibold leading-[1.05] mb-5"
              style={{ fontSize: "clamp(2.25rem, 4.6vw, 3.4rem)" }}
            >
              {before}
              {hl && <span style={{ color: "var(--fn-accent)" }}>{hl}</span>}
              {after}
            </h1>

            <p
              className="fn-rise fn-rise-3 text-[17px] leading-relaxed mb-7 max-w-xl mx-auto lg:mx-0"
              style={{ color: "var(--fn-body)" }}
            >
              {content.hero.subtitle}
            </p>

            {/* Card de captura */}
            <div ref={captureRef}>
              <div
                className="fn-rise fn-rise-3 rounded-[var(--fn-r-card)] p-6 sm:p-7 text-left"
                style={{
                  background: "linear-gradient(180deg, color-mix(in oklab, var(--fn-accent) 6%, transparent), transparent 40%), var(--fn-elevated)",
                  border: "1px solid var(--fn-line-strong)",
                  boxShadow: "0 24px 60px -28px color-mix(in oklab, var(--fn-accent) 35%, transparent)",
                }}
              >
              <h2 className="text-xl font-semibold mb-1.5">{content.capture.title}</h2>
              <p className="text-sm mb-5" style={{ color: "var(--fn-muted)" }}>{content.capture.subtitle}</p>

              <form onSubmit={submit} className="space-y-3" noValidate>
                <div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome completo"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    className="w-full rounded-[10px] px-4 py-3 text-sm outline-none transition-colors"
                    style={{ background: "var(--fn-bg)", border: `1px solid ${errors.name ? "var(--fn-danger)" : "var(--fn-line-strong)"}`, color: "var(--fn-ink)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--fn-accent)")}
                    onBlur={(e) => (e.target.style.borderColor = errors.name ? "var(--fn-danger)" : "var(--fn-line-strong)")}
                  />
                  {errors.name && (
                    <p role="alert" className="mt-1.5 text-xs font-medium" style={{ color: "var(--fn-danger)" }}>{errors.name}</p>
                  )}
                </div>
                <div>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--fn-muted)" }} />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                      placeholder="WhatsApp com DDD"
                      autoComplete="tel"
                      aria-invalid={!!errors.phone}
                      className="w-full rounded-[10px] pl-10 pr-4 py-3 text-sm outline-none transition-colors"
                      style={{ background: "var(--fn-bg)", border: `1px solid ${errors.phone ? "var(--fn-danger)" : "var(--fn-line-strong)"}`, color: "var(--fn-ink)" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--fn-accent)")}
                      onBlur={(e) => (e.target.style.borderColor = errors.phone ? "var(--fn-danger)" : "var(--fn-line-strong)")}
                    />
                  </div>
                  {errors.phone && (
                    <p role="alert" className="mt-1.5 text-xs font-medium" style={{ color: "var(--fn-danger)" }}>{errors.phone}</p>
                  )}
                </div>

                {collectEmail && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="E-mail (opcional)"
                    autoComplete="email"
                    className="w-full rounded-[10px] px-4 py-3 text-sm outline-none transition-colors"
                    style={{ background: "var(--fn-bg)", border: "1px solid var(--fn-line-strong)", color: "var(--fn-ink)" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--fn-accent)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--fn-line-strong)")}
                  />
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="fn-cta-glow w-full rounded-[var(--fn-r-pill)] py-4 text-base font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
                >
                  {submitting ? (
                    <>
                      <span
                        className="w-5 h-5 border-2 rounded-full animate-spin"
                        style={{ borderColor: "var(--fn-accent-ink)", borderTopColor: "transparent" }}
                      />
                      Enviando...
                    </>
                  ) : (
                    <>
                      {content.capture.ctaText}
                      <ArrowRight className="w-5 h-5" weight="bold" />
                    </>
                  )}
                </button>
              </form>

              {/* Selos de confiança */}
              <div className="flex items-center justify-center gap-x-5 gap-y-2 flex-wrap mt-5 pt-5" style={{ borderTop: "1px solid var(--fn-line)" }}>
                {content.trust.map((t) => {
                  const Icon = TRUST_ICON[t.icon];
                  return (
                    <span key={t.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fn-muted)" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: "var(--fn-success)" }} />
                      {t.label}
                    </span>
                  );
                })}
              </div>
            </div>
            </div>

            {/* Prova social */}
            {content.socialProof.enabled && (
              <div className="fn-rise fn-rise-4 flex items-center justify-center lg:justify-start gap-3 mt-7">
                <div className="flex -space-x-2.5">
                  {content.socialProof.avatars.slice(0, 4).map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      loading="lazy"
                      className="w-8 h-8 rounded-full object-cover"
                      style={{ border: "2px solid var(--fn-bg)" }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ))}
                </div>
                <p className="text-sm" style={{ color: "var(--fn-muted)" }}>
                  <strong style={{ color: "var(--fn-ink)" }}>+{content.socialProof.count} homens</strong>{" "}
                  {content.socialProof.text}
                </p>
              </div>
            )}
          </div>

          {/* Coluna direita (desktop): retrato em tamanho próximo do nativo, emoldurado */}
          <div className="hidden lg:flex items-center justify-center fn-rise fn-rise-2">
            <div className="relative w-full max-w-[380px]">
              <div
                className="absolute -inset-12 pointer-events-none"
                style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--fn-accent) 13%, transparent), transparent)" }}
              />
              <div className="relative rounded-[var(--fn-r-card)] overflow-hidden aspect-[4/5]" style={{ border: "1px solid var(--fn-line)" }}>
                <img src={heroPhoto} alt="Homem com cabelo saudável" className="w-full h-full object-cover object-top" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. ANTES / DEPOIS (prova visual — só com fotos reais) ── */}
      {content.beforeAfter.length > 0 && (
        <section className="px-5 py-12" style={{ background: "var(--fn-surface)", borderTop: "1px solid var(--fn-line)", borderBottom: "1px solid var(--fn-line)" }}>
          <div className="max-w-5xl mx-auto">
            <h2 className="text-center text-2xl sm:text-3xl font-semibold mb-2">Resultados reais</h2>
            <p className="text-center text-sm mb-8" style={{ color: "var(--fn-muted)" }}>
              Homens atendidos pela {franchiseName}
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {content.beforeAfter.slice(0, 6).map((ba, i) => (
                <figure key={i} className="rounded-[var(--fn-r-card)] overflow-hidden" style={{ border: "1px solid var(--fn-line)" }}>
                  <div className="grid grid-cols-2">
                    {[["Antes", ba.beforeUrl], ["Depois", ba.afterUrl]].map(([label, url]) => (
                      <div key={label} className="relative">
                        <img src={url} alt={label} className="w-full aspect-[3/4] object-cover" />
                        <span
                          className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded"
                          style={{ background: label === "Depois" ? "var(--fn-accent)" : "rgba(0,0,0,0.6)", color: label === "Depois" ? "var(--fn-accent-ink)" : "#fff" }}
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                  {ba.caption && <figcaption className="px-3 py-2 text-xs" style={{ color: "var(--fn-muted)" }}>{ba.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 6. COMO FUNCIONA (sequência real de 4 passos) ── */}
      <section className="px-5 py-14">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-2xl sm:text-3xl font-semibold mb-10">Como funciona</h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8 relative">
            {content.howItWorks.map((step, i) => {
              const Icon = STEP_ICON[step.icon];
              return (
                <li key={i} className="fn-lift text-center lg:text-left">
                  <div className="flex items-center gap-3 mb-3 justify-center lg:justify-start">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: "linear-gradient(145deg, color-mix(in oklab, var(--fn-accent) 18%, transparent), color-mix(in oklab, var(--fn-accent) 6%, transparent))",
                        border: "1px solid color-mix(in oklab, var(--fn-accent) 30%, transparent)",
                        boxShadow: "0 8px 20px -10px color-mix(in oklab, var(--fn-accent) 45%, transparent)",
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: "var(--fn-accent)" }} />
                    </div>
                    <span className="text-sm font-bold" style={{ color: "var(--fn-muted)" }}>0{i + 1}</span>
                  </div>
                  <h3 className="text-base font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--fn-muted)" }}>{step.desc}</p>
                </li>
              );
            })}
          </ol>

          {/* CTA secundário que leva de volta ao card */}
          <div className="text-center mt-12">
            <button
              onClick={scrollToCapture}
              className="fn-cta-glow inline-flex items-center gap-2 rounded-[var(--fn-r-pill)] px-7 py-3.5 text-base font-bold transition-all"
              style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
            >
              {content.capture.ctaText}
              <CaretRight className="w-5 h-5" weight="bold" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 7. DEPOIMENTOS ── */}
      {content.testimonials.length > 0 && (
        <section className="px-5 py-14" style={{ background: "var(--fn-surface)", borderTop: "1px solid var(--fn-line)" }}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-center text-2xl sm:text-3xl font-semibold mb-8">O que dizem os pacientes</h2>
            <div
              className="relative min-h-[160px]"
              onMouseEnter={() => setTestimonialsPaused(true)}
              onMouseLeave={() => setTestimonialsPaused(false)}
            >
              {content.testimonials.map((t, i) => (
                <blockquote
                  key={i}
                  className={`transition-all duration-500 ${i === activeT ? "opacity-100" : "opacity-0 absolute inset-0 pointer-events-none"}`}
                >
                  <div className="flex gap-1 justify-center mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4" weight="fill" style={{ color: "var(--fn-accent)" }} />
                    ))}
                  </div>
                  <p className="text-lg leading-relaxed text-center mb-5" style={{ color: "var(--fn-ink)" }}>
                    "{t.text}"
                  </p>
                  <footer className="flex items-center justify-center gap-3">
                    {t.avatarUrl && (
                      <img
                        src={t.avatarUrl}
                        alt={t.name}
                        loading="lazy"
                        className="w-11 h-11 rounded-full object-cover"
                        style={{ border: "2px solid var(--fn-line-strong)" }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-semibold" style={{ color: "var(--fn-ink)" }}>{t.name}</p>
                      <p className="text-xs" style={{ color: "var(--fn-muted)" }}>{t.age} anos · {t.city}</p>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
            {content.testimonials.length > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                {content.testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveT(i)}
                    aria-label={`Depoimento ${i + 1}`}
                    className="flex h-8 min-w-8 items-center justify-center"
                  >
                    <span
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: i === activeT ? 20 : 6, background: i === activeT ? "var(--fn-accent)" : "var(--fn-line-strong)" }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Seções extras do chamador (ex.: serviços da clínica) */}
      {children}

      {/* ── 8. RODAPÉ (endereço / WhatsApp) ── */}
      <footer className="px-5 py-8" style={{ borderTop: "1px solid var(--fn-line)" }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {logoUrl
              ? <img src={logoUrl} alt={franchiseName} className="h-6 object-contain opacity-90" />
              : <FunnelWordmark height={22} />}
            <span className="text-sm" style={{ color: "var(--fn-muted)" }}>· {franchiseName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs" style={{ color: "var(--fn-muted)" }}>
            {address && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" style={{ color: "var(--fn-accent)" }} />
                {address}{cityState ? `, ${cityState}` : ""}
              </span>
            )}
            {whatsapp && (
              <a
                href={buildWhatsappUrl(whatsapp)}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:underline"
                style={{ color: "var(--fn-success)" }}
              >
                <Phone className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
    </IconContext.Provider>
  );
}
