/* ────────────────────────────────────────────────────────────────────────────
 * authKit — sistema visual compartilhado das telas de auth/cadastro.
 *
 * Reusa a MESMA linguagem da LP de venda v2 (HomenzLandingV2): corpo CLARO,
 * navy nos títulos, azul Homenz #004A9D como acento, teal #00C1B8 como cor de
 * ação, fontes Clash Display + Hanken Grotesk. Direção escolhida: split com a
 * paleta/fontes v2 mantendo a foto institucional (sem hero do estádio).
 *
 * Componentes:
 *   <AuthShell variant="split" | "centered">  — casca da página
 *   <AuthField />                              — input rotulado (com toggle de senha)
 *   <AuthButton />                             — botão (primary teal / navy / ghost)
 *   <AuthLink />                               — link textual de apoio
 * ──────────────────────────────────────────────────────────────────────────── */
import { useState, type CSSProperties, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Eye, EyeSlash, CircleNotch, type Icon } from "@phosphor-icons/react";
import FunnelWordmark from "../funnel/FunnelWordmark";

// ─── Tokens (paleta light v2) ───
export const AUTH = {
  display: "'Clash Display', 'Hanken Grotesk', system-ui, sans-serif",
  body: "'Hanken Grotesk', system-ui, -apple-system, sans-serif",
  bg: "#FFFFFF",
  surfaceAlt: "#F5F8FC",
  ink: "#0A2540",
  bodyText: "#46566D",
  muted: "#74849A",
  blue: "#004A9D",
  blueDark: "#013D82",
  teal: "#0A8E86",
  tealFill: "#00C1B8",
  tealInk: "#04141F",
  line: "#E4EAF2",
  lineStrong: "#D3DDEA",
  field: "#F6F8FC",
  shadow: "0 1px 2px rgba(10,37,64,0.04), 0 12px 32px -16px rgba(10,37,64,0.18)",
};

// Background do painel de marca: ambiente de clínica capilar premium (gerado no fal, nano-banana-pro).
export const AUTH_BRAND_PHOTO = "/v2/login-bg.jpg";

// Rosto da marca (Luiz). Retrato adaptado no fal (nano-banana-pro) a partir da
// foto enviada pelo cliente — fundo navy, head-and-shoulders. Vazio "" cai no
// placeholder (avatar com inicial).
export const LUIZ_PHOTO = "/v2/luiz.jpg";

// Investidor (Tarek). Mesmo tratamento no fal (fundo navy). Vazio "" cai no placeholder.
export const TAREK_PHOTO = "/v2/tarek.jpg";

// Faixa de boas-vindas no topo do painel de marca: avatar do rosto da marca
// (Luiz) + saudacao + mencao discreta ao investidor (Tarek). Sobria, em "vidro"
// sobre o navy, sem competir com o titulo abaixo.
function LeaderAvatar({ photo, alt, initial }: { photo: string; alt: string; initial: string }) {
  const cls = "w-14 h-14 rounded-full flex-shrink-0";
  return photo ? (
    <img src={photo} alt={alt} className={`${cls} object-cover`} style={{ border: "1.5px solid rgba(0,193,184,0.6)" }} />
  ) : (
    <span
      aria-hidden
      className={`${cls} flex items-center justify-center font-bold`}
      style={{
        background: "linear-gradient(150deg, #00C1B8, #007E78)",
        color: "#04141F",
        border: "1.5px solid rgba(0,193,184,0.6)",
      }}
    >
      {initial}
    </span>
  );
}

function WelcomeStrip() {
  return (
    // Apresentação da LIDERANÇA da marca (não é perfil/login do usuário).
    <div
      className="rounded-2xl px-5 py-4 w-full"
      style={{
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.14)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <span aria-hidden className="h-px w-5 rounded-full" style={{ background: AUTH.tealFill }} />
        <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: AUTH.tealFill }}>
          Liderança Homenz
        </span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LeaderAvatar photo={LUIZ_PHOTO} alt="Luiz, liderança Homenz" initial="L" />
          <p className="text-white font-semibold text-[16px] leading-none">Luiz</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-white font-semibold text-[16px] leading-none">Tarek</p>
          <LeaderAvatar photo={TAREK_PHOTO} alt="Tarek, liderança Homenz" initial="T" />
        </div>
      </div>
    </div>
  );
}

const WORDMARK_DARK = {
  "--fn-ink": "#FFFFFF",
  "--fn-accent": AUTH.tealFill,
  "--fn-font-display": AUTH.display,
} as CSSProperties;
const WORDMARK_LIGHT = {
  "--fn-ink": AUTH.ink,
  "--fn-accent": AUTH.blue,
  "--fn-font-display": AUTH.display,
} as CSSProperties;

// Estilos pontuais (botões + foco) injetados uma vez pela casca.
const AUTH_CSS = `
  .ak-root { font-family: ${AUTH.body}; }
  .ak-btn { transition: transform .18s cubic-bezier(.16,1,.3,1), box-shadow .18s, background-color .18s, border-color .18s; }
  .ak-btn:active:not(:disabled) { transform: translateY(0) scale(.985); }
  .ak-btn:disabled { opacity: .6; cursor: not-allowed; }
  .ak-btn-primary { background: linear-gradient(180deg,#1AD6CD 0%,#00C1B8 60%,#00B2AA 100%); color: ${AUTH.tealInk}; box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 12px 30px -10px rgba(0,193,184,0.55); }
  .ak-btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 20px 44px -10px rgba(0,193,184,0.7); }
  .ak-btn-navy { background: ${AUTH.blue}; color: #fff; box-shadow: 0 10px 26px -12px rgba(0,74,157,0.6); }
  .ak-btn-navy:hover:not(:disabled) { background: ${AUTH.blueDark}; transform: translateY(-2px); }
  .ak-btn-ghost { background: transparent; color: ${AUTH.ink}; border: 1px solid ${AUTH.lineStrong}; }
  .ak-btn-ghost:hover:not(:disabled) { background: ${AUTH.surfaceAlt}; border-color: ${AUTH.blue}; }
  .ak-field { transition: border-color .18s, box-shadow .18s, background-color .18s; }
  .ak-field:focus { outline: none; border-color: ${AUTH.blue}; background: #fff; box-shadow: 0 0 0 3px rgba(0,74,157,0.13); }
  .ak-field::placeholder { color: #9AA8BC; }
  .ak-root a:focus-visible, .ak-root button:focus-visible { outline: 2px solid ${AUTH.tealFill}; outline-offset: 2px; }
`;

function AuthStyles() {
  return <style dangerouslySetInnerHTML={{ __html: AUTH_CSS }} />;
}

// ─── Painel de marca (lado esquerdo do split) ───
function BrandPanel({
  headline,
  sub,
  proofs,
}: {
  headline: ReactNode;
  sub?: string;
  proofs?: string[];
}) {
  return (
    <div
      className="hidden lg:flex lg:w-[44%] relative overflow-hidden"
      style={{ background: "linear-gradient(155deg, #00284F 0%, #004A9D 56%, #013D82 100%)" }}
    >
      <img
        src={AUTH_BRAND_PHOTO}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center opacity-90"
      />
      {/* overlay navy mais forte à esquerda (texto) e leve à direita (clínica aparece) */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(100deg, rgba(0,26,52,0.93) 0%, rgba(0,40,79,0.72) 48%, rgba(0,58,116,0.34) 100%)" }}
      />
      {/* reforço vertical p/ wordmark (topo) e selo (base) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,26,52,0.55) 0%, transparent 22%, transparent 72%, rgba(0,26,52,0.66) 100%)" }}
      />
      <div
        className="absolute -bottom-32 -left-24 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,193,184,0.26), transparent 70%)" }}
      />
      <div className="relative z-10 flex flex-col justify-between p-12 xl:p-14 w-full">
        <div className="space-y-7">
          <div style={WORDMARK_DARK}>
            <FunnelWordmark height={30} />
          </div>
          <WelcomeStrip />
        </div>
        <div>
          <h1
            className="text-white font-semibold leading-[1.05] mb-5"
            style={{ fontFamily: AUTH.display, fontSize: "clamp(2.2rem, 3vw, 3rem)", letterSpacing: "-0.02em" }}
          >
            {headline}
          </h1>
          {sub && <p className="text-white/70 text-base leading-relaxed max-w-sm mb-8">{sub}</p>}
          {proofs && proofs.length > 0 && (
            <ul className="space-y-3.5">
              {proofs.map((t) => (
                <li key={t} className="flex items-center gap-3 text-white/85 text-sm">
                  <span
                    aria-hidden
                    className="inline-flex w-5 h-5 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ background: "rgba(0,193,184,0.16)", color: AUTH.tealFill }}
                  >
                    <svg viewBox="0 0 16 16" width="11" height="11" fill="none"><path d="M3 8.5l3 3 7-7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-white/45 text-xs">Plataforma oficial da rede Homenz Brasil</p>
      </div>
    </div>
  );
}

// ─── Casca da página ───
export function AuthShell({
  variant = "split",
  title,
  subtitle,
  brandHeadline,
  brandSub,
  brandProofs,
  children,
  footer,
  maxWidth = "max-w-md",
}: {
  variant?: "split" | "centered";
  title: ReactNode;
  subtitle?: string;
  brandHeadline?: ReactNode;
  brandSub?: string;
  brandProofs?: string[];
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}) {
  const header = (
    <div className="mb-7">
      <h2
        className="font-semibold leading-tight mb-1.5"
        style={{ fontFamily: AUTH.display, color: AUTH.ink, fontSize: "clamp(1.7rem, 3.4vw, 2.1rem)", letterSpacing: "-0.02em" }}
      >
        {title}
      </h2>
      {subtitle && <p className="text-sm" style={{ color: AUTH.muted }}>{subtitle}</p>}
    </div>
  );

  if (variant === "centered") {
    return (
      <div className="ak-root min-h-[100dvh] flex items-center justify-center px-5 py-10" style={{ background: AUTH.surfaceAlt }}>
        <AuthStyles />
        <div className={`w-full ${maxWidth}`}>
          <div className="flex justify-center mb-8" style={WORDMARK_LIGHT}>
            <FunnelWordmark height={28} />
          </div>
          <div className="rounded-3xl p-8 sm:p-9" style={{ background: AUTH.bg, border: `1px solid ${AUTH.line}`, boxShadow: AUTH.shadow }}>
            {header}
            {children}
          </div>
          {footer && <div className="mt-6 text-center">{footer}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="ak-root min-h-[100dvh] flex" style={{ background: AUTH.bg }}>
      <AuthStyles />
      <BrandPanel headline={brandHeadline ?? title} sub={brandSub} proofs={brandProofs} />
      <div className="w-full lg:w-[56%] flex items-center justify-center p-6 sm:p-10 lg:p-12">
        <div className={`w-full ${maxWidth}`}>
          <div className="flex lg:hidden mb-9" style={WORDMARK_LIGHT}>
            <FunnelWordmark height={28} />
          </div>
          {header}
          {children}
          {footer && <div className="mt-6">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Campo rotulado ───
export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  action,
  icon: IconCmp,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  action?: ReactNode;
  icon?: Icon;
}) {
  const [show, setShow] = useState(false);
  const isPwd = type === "password";
  const effectiveType = isPwd ? (show ? "text" : "password") : type;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-semibold" style={{ color: AUTH.ink }}>{label}</label>
        {action}
      </div>
      <div className="relative">
        {IconCmp && (
          <IconCmp className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px]" style={{ color: AUTH.muted }} />
        )}
        <input
          id={id}
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className={`ak-field w-full rounded-xl py-3.5 text-sm ${IconCmp ? "pl-11" : "pl-4"} ${isPwd ? "pr-12" : "pr-4"}`}
          style={{ background: AUTH.field, border: `1px solid ${AUTH.line}`, color: AUTH.ink }}
        />
        {isPwd && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: AUTH.muted }}
          >
            {show ? <EyeSlash className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Botão ───
export function AuthButton({
  children,
  type = "button",
  onClick,
  disabled,
  loading,
  variant = "primary",
  icon: IconCmp,
  className = "",
}: {
  children: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "navy" | "ghost";
  icon?: Icon;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`ak-btn ak-btn-${variant} w-full rounded-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 ${className}`}
    >
      {loading ? (
        <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
      ) : (
        IconCmp && <IconCmp weight="bold" className="w-4 h-4" />
      )}
      {children}
    </button>
  );
}

// ─── Link textual de apoio ───
export function AuthLink({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="font-bold hover:underline" style={{ color: AUTH.blue }}>
      {children}
    </button>
  );
}

// Helper de navegação (atalho usado pelas telas).
export function useNav() {
  const [, navigate] = useLocation();
  return navigate;
}
