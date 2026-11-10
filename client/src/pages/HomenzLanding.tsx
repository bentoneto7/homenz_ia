import { useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import FunnelWordmark from "./funnel/FunnelWordmark";
import { motion, useReducedMotion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import {
  IconContext,
  Brain,
  TrendUp,
  ChartBar,
  Lightning,
  Star,
  CheckCircle,
  ArrowRight,
  ChatCircleDots,
  CalendarCheck,
  ThermometerSimple,
  Trophy,
  ShieldCheck,
  type Icon,
} from "@phosphor-icons/react";

// Retrato do hero — o mesmo "cara de amarelo" do header dos funis (asset local).
// Reusa a foto e o tratamento emoldurado da landing dos funis na LP de venda.
const HERO_PORTRAIT = "/funnel/hero-homenz.jpg";

// Superfícies sólidas espelhando o tema light do funil (.funnel-theme): faixas chapadas
// alternadas + divisória hairline, no lugar dos degradês azul-bebê. Mesma marca (navy/teal),
// aplicação "sólida/profissional" — superfície chapada + linha nítida, acento contido.
const SURFACE = {
  base: "oklch(0.975 0.012 250)", // off-white frio — base da página (= funil --fn-bg)
  band: "#FFFFFF",                 // faixa branca alternada (= funil --fn-surface)
  line: "oklch(0.25 0.04 258 / 0.12)", // divisória navy 12% (= funil --fn-line)
};

// Wordmark "HOMENZ♂" idêntico ao header do funil. O FunnelWordmark herda as cores/fonte
// do tema .funnel-theme (light); aqui (fora do tema) injetamos as mesmas variáveis.
const FN_WORDMARK_VARS = {
  "--fn-ink": "oklch(0.25 0.045 258)",
  "--fn-accent": "#004A9D",
  "--fn-font-display": '"Clash Display", "Hanken Grotesk", system-ui, sans-serif',
} as CSSProperties;

// ─── Features do funil ───
type Feature = { icon: Icon; title: string; desc: string; featured?: boolean };
const FEATURES: Feature[] = [
  {
    icon: ChatCircleDots,
    title: "Chat Qualificador IA",
    desc: "O lead responde um diagnóstico guiado por IA antes de chegar na sua equipe. Chega pronto, qualificado e com protocolo indicado.",
    featured: true,
  },
  {
    icon: Brain,
    title: "Diagnóstico Capilar 3D",
    desc: "Análise visual do grau de calvície com mapeamento de protocolo ideal. O lead vê o resultado e quer agendar na hora.",
    featured: true,
  },
  {
    icon: ThermometerSimple,
    title: "Temperatura do Lead",
    desc: "Cada lead é classificado em quente, morno ou frio em tempo real. Sua equipe age no momento certo, sem perder oportunidade.",
  },
  {
    icon: CalendarCheck,
    title: "Agendamento Integrado",
    desc: "Do chat ao calendário em um clique. Sem planilha, sem WhatsApp manual. O sistema agenda e confirma automaticamente.",
  },
  {
    icon: ChartBar,
    title: "Analytics do Funil",
    desc: "Taxa de conversão, tempo de resposta, ranking de vendedores. Você vê exatamente onde está perdendo dinheiro.",
  },
  {
    icon: Trophy,
    title: "Ranking da Rede",
    desc: "Health score da sua unidade (S/A/B/C/D/F) e posição no ranking Homenz. Gamificação que move a equipe.",
  },
];

// ─── Antes/depois capilares ───
const CASES = [
  {
    name: "Carlos M., 38 anos",
    city: "Uberaba, MG",
    afterLabel: "4 MESES DEPOIS",
    tag: "Preenchimento Capilar + PRP",
    tagColor: "bg-[#004A9D] text-white",
    quote: "Fiz o diagnóstico pelo chat e em 15 minutos já sabia exatamente qual protocolo era pra mim. Agendei na hora. Resultado em 4 meses superou o que eu esperava.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-1_55ef2687.png",
  },
  {
    name: "Rafael S., 44 anos",
    city: "Uberlândia, MG",
    afterLabel: "6 MESES DEPOIS",
    tag: "Mesoterapia Capilar + Laser",
    tagColor: "bg-[#00C1B8] text-white",
    quote: "Eu estava desistindo de tratar porque não sabia por onde começar. O sistema me fez as perguntas certas e me encaminhou pro protocolo certo. Simples assim.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-2_1fdad418.png",
  },
  {
    name: "Thiago R., 31 anos",
    city: "Belo Horizonte, MG",
    afterLabel: "3 MESES DEPOIS",
    tag: "Protocolo Preventivo",
    tagColor: "bg-[#F59E0B] text-white",
    quote: "Cheguei cedo, antes de perder muito. O diagnóstico identificou o risco genético e o protocolo preventivo travou a queda. Hoje mantenho com check-ins mensais.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-3_4a0fbbcb.png",
  },
];

// ─── Contato comercial (venda 1:1, sem self-service) ───
// ⚠️ TROCAR pelo número comercial oficial da Homenz (formato: DDI+DDD+número).
const SALES_WHATSAPP = "5534990000000";

// ─── Reveal on scroll (motion, respeita reduced-motion) ───
function Reveal({ children, delay = 0, y = 22, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─── Nota 4.9 com contador animado ao entrar ───
function AnimatedRating() {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(reduce ? "4.9" : "4.0");
  useEffect(() => {
    if (reduce) return;
    const controls = animate(4.0, 4.9, {
      duration: 1.1,
      delay: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v.toFixed(1)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="text-sm font-black text-[#0A2540] tabular-nums">{val}</div>;
}

// ─── Card de foto do hero com tilt 3D no hover (motion values, sem re-render) ───
/** Retrato emoldurado do hero — porta a foto + tratamento da landing dos funis (glow radial + moldura
 *  com borda de marca), com leve tilt 3D no desktop. */
function HeroPortrait() {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 220, damping: 20 });
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-7, 7]), { stiffness: 220, damping: 20 });

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { px.set(0); py.set(0); };

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{
        rotateX: reduce ? 0 : rotateX,
        rotateY: reduce ? 0 : rotateY,
        transformPerspective: 1000,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 6px rgba(0,74,157,0.10), 0 24px 60px -28px rgba(0,74,157,0.55)",
      }}
      className="relative z-10 w-[min(74vw,360px)] aspect-[4/5] rounded-2xl overflow-hidden [transform-style:preserve-3d] will-change-transform"
    >
      <img src={HERO_PORTRAIT} alt="Homem com cabelo saudável, paciente Homenz" className="w-full h-full object-cover object-top pointer-events-none" />
      {/* borda interna com gradiente da marca (material premium, mesmo do funil) */}
      <span aria-hidden className="absolute inset-0 rounded-2xl pointer-events-none" style={{ padding: 1, background: "linear-gradient(150deg, rgba(255,255,255,0.5), rgba(0,193,184,0.18) 40%, transparent 70%)", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
    </motion.div>
  );
}

export default function HomenzLanding() {
  const [, navigate] = useLocation();
  const reduceMotion = useReducedMotion();
  // Venda 1:1 (pedido do Bento, 10/06): sem contratação self-service na landing.
  // O cadastro continua existindo só via convite interno (/join?token -> /cadastro).
  const goSales = () =>
    window.open(
      `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent("Olá! Quero conhecer a plataforma Homenz IA para minha clínica.")}`,
      "_blank",
      "noopener,noreferrer"
    );
  // Demo usa o funil OFICIAL da franquia (Supabase, distribui p/ vendedor), não o legado /c/ (TiDB)
  const goDemo = () => navigate("/l/uberaba-demo");

  return (
    <IconContext.Provider value={{ weight: "duotone", size: 24 }}>
      <div className="min-h-[100dvh] font-['Montserrat',sans-serif] antialiased" style={{ background: SURFACE.base }}>
        <style>{`
          @keyframes hlFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
          .hl-float { animation: hlFloat 5s ease-in-out infinite; }
          /* pill liquid-glass: brilho no topo + profundidade embaixo + glow, via box-shadow (nao cobre o texto) */
          .glass-pill {
            border: 1px solid rgba(255,255,255,0.30);
            box-shadow:
              inset 0 1.5px 0 rgba(255,255,255,0.6),
              inset 0 9px 16px -9px rgba(255,255,255,0.55),
              inset 0 -9px 16px -9px rgba(0,0,0,0.20),
              0 2px 4px rgba(0,0,0,0.10),
              0 12px 26px -10px var(--pill-glow, rgba(0,74,157,0.5));
          }
          .glass-pill:hover {
            box-shadow:
              inset 0 1.5px 0 rgba(255,255,255,0.72),
              inset 0 11px 18px -9px rgba(255,255,255,0.66),
              inset 0 -9px 16px -9px rgba(0,0,0,0.22),
              0 4px 8px rgba(0,0,0,0.12),
              0 18px 36px -10px var(--pill-glow, rgba(0,74,157,0.62));
          }
          /* variante pros cards: brilho no topo + profundidade em camadas, sem glow de pill */
          .glass-card {
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.75),
              0 1px 2px rgba(10,37,64,0.04),
              0 16px 34px -18px rgba(10,37,64,0.22);
          }
          .glass-card:hover {
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.85),
              0 2px 6px rgba(10,37,64,0.06),
              0 24px 46px -18px rgba(10,37,64,0.30);
          }
          @media (prefers-reduced-motion: reduce) {
            .hl-float { animation: none; }
          }
        `}</style>

        {/* ── NAV ── */}
        <nav className="sticky top-0 z-50 bg-white/75 backdrop-blur-xl border-b border-[#E2E8F0]/70 shadow-[0_1px_0_rgba(0,74,157,0.04),0_8px_24px_-18px_rgba(0,74,157,0.25)]">
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #004A9D 0%, #00C1B8 100%)" }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-[68px]">
            <div className="flex items-center gap-2.5">
              {/* Wordmark do funil + selo AI da plataforma (LP de venda do SaaS) */}
              <div className="flex items-center gap-1.5">
                <span style={FN_WORDMARK_VARS}>
                  <FunnelWordmark height={30} />
                </span>
                <span className="inline-flex items-center text-[11px] font-black text-white rounded-md px-1.5 py-0.5 leading-none tracking-wide shadow-sm" style={{ background: "linear-gradient(135deg, #004A9D 0%, #00C1B8 100%)" }}>AI</span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-bold text-[#004A9D] border border-[#004A9D]/30 rounded-full px-2 py-0.5 uppercase tracking-widest">Brasil</span>
            </div>
            <div className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#0A2540]">
              {[
                { label: "Como funciona", id: "como-funciona" },
                { label: "Funcionalidades", id: "funcionalidades" },
                { label: "Resultados", id: "resultados" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
                  className="relative py-1 whitespace-nowrap transition-colors hover:text-[#004A9D] after:absolute after:left-0 after:-bottom-0.5 after:h-0.5 after:w-0 after:rounded-full after:bg-[#00C1B8] after:transition-all after:duration-300 hover:after:w-full after:content-['']"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => navigate("/login")} className="glass-pill hidden sm:flex items-center whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold text-[#004A9D] bg-white/70 hover:bg-white transition-all" style={{ "--pill-glow": "rgba(0,74,157,0.18)" } as React.CSSProperties}>
                Logar agora
              </button>
              <button
                onClick={goSales}
                className="glass-pill group flex items-center gap-2 whitespace-nowrap px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-bold text-[13px] sm:text-sm text-white transition-all hover:-translate-y-0.5 active:scale-95"
                style={{ background: "linear-gradient(135deg, #004A9D 0%, #00C1B8 100%)", "--pill-glow": "rgba(0,74,157,0.5)" } as React.CSSProperties}
              >
                Falar com a equipe
                <ArrowRight weight="bold" className="hidden sm:block w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative min-h-[84vh] flex items-center overflow-hidden" style={{ background: SURFACE.base, borderBottom: `1px solid ${SURFACE.line}` }}>
          {/* Fundo estático sutil (mesmo princípio do funil): glows de canto fracos + grid de pontos.
              Sem aurora animada — superfície chapada, sensação sólida/profissional. */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(58% 50% at 94% -10%, rgba(0,74,157,0.11), transparent 64%), radial-gradient(52% 48% at 2% 112%, rgba(0,193,184,0.08), transparent 70%)" }} />
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(rgba(0,74,157,0.05) 1px, transparent 1.4px)", backgroundSize: "22px 22px", maskImage: "radial-gradient(ellipse at 72% 36%, black 4%, transparent 72%)", WebkitMaskImage: "radial-gradient(ellipse at 72% 36%, black 4%, transparent 72%)" }} />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">

              {/* Texto esquerdo */}
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-pill relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 text-[#004A9D] text-xs font-bold uppercase tracking-widest mb-6"
                  style={{ "--pill-glow": "rgba(0,193,184,0.3)" } as React.CSSProperties}
                >
                  <Lightning weight="fill" className="w-3.5 h-3.5 text-[#00C1B8]" style={{ filter: "drop-shadow(0 0 4px rgba(0,193,184,0.6))" }} />
                  Exclusivo para a rede Homenz
                </motion.div>
                <motion.h1
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                  className="font-black text-[#004A9D] leading-[1.02] mb-5 text-balance"
                  style={{ fontSize: "clamp(2.6rem, 6vw, 4.3rem)", letterSpacing: "-0.035em" }}
                >
                  Sua clínica, uma{" "}
                  <span className="relative inline-block whitespace-nowrap">
                    máquina
                    <svg className="absolute left-0 right-0 -bottom-[0.12em] w-full" height="14" viewBox="0 0 200 14" preserveAspectRatio="none" fill="none" aria-hidden="true">
                      <motion.path
                        d="M3 9 Q 48 3, 100 7 T 197 6"
                        stroke="#00C1B8" strokeWidth="5" strokeLinecap="round"
                        initial={{ pathLength: reduceMotion ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.7, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </svg>
                  </span>{" "}
                  de agendar consultas.
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className="text-lg text-[#5A667A] mb-8 max-w-md leading-relaxed"
                >
                  Funil com IA pra rede Homenz: chat qualificador, diagnóstico capilar e agendamento automático. O lead chega pronto. Sua equipe só fecha.
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap gap-3"
                >
                  <button
                    onClick={goSales}
                    className="glass-pill group relative overflow-hidden flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base text-white transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #00C1B8 0%, #009B93 100%)", "--pill-glow": "rgba(0,193,184,0.55)" } as React.CSSProperties}
                  >
                    <span aria-hidden className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out motion-reduce:hidden" style={{ background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)" }} />
                    <span className="relative z-10">Falar com a equipe</span>
                    <ArrowRight weight="bold" className="relative z-10 w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <button
                    onClick={goDemo}
                    className="glass-pill flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base text-[#004A9D] bg-white hover:-translate-y-0.5 transition-all"
                    style={{ "--pill-glow": "rgba(0,74,157,0.22)" } as React.CSSProperties}
                  >
                    Ver demo ao vivo
                  </button>
                </motion.div>
              </div>

              {/* Cards de foto direita */}
              <motion.div
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="relative flex flex-col items-center lg:items-end gap-5 max-w-full"
              >
                <div className="hidden lg:block absolute -inset-8 -z-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 60% 45%, rgba(0,193,184,0.22) 0%, rgba(0,74,157,0.10) 40%, transparent 70%)", filter: "blur(8px)" }} />
                <div className="hl-float hidden lg:flex absolute -left-6 top-10 z-20 items-center gap-2 rounded-2xl bg-white/95 backdrop-blur px-3.5 py-2.5 border border-white/60" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 8px rgba(0,74,157,0.10), 0 16px 32px -12px rgba(0,74,157,0.30)" }}>
                  <span aria-hidden className="absolute inset-0 rounded-2xl pointer-events-none" style={{ padding: 1, background: "linear-gradient(140deg, rgba(0,193,184,0.55), transparent 55%)", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }} />
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} weight="fill" className="w-3.5 h-3.5 text-[#F59E0B]" />
                    ))}
                  </div>
                  <div className="leading-tight">
                    <AnimatedRating />
                    <div className="text-[10px] font-semibold text-[#5A667A]">unidades ativas</div>
                  </div>
                </div>
                <div className="relative z-10 flex justify-center lg:justify-end w-full pt-4 sm:pt-8 pb-6 sm:pb-10 px-1">
                  <HeroPortrait />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── TRUST STRIP ── */}
        <section style={{ background: SURFACE.band, borderBottom: `1px solid ${SURFACE.line}` }}>
          <div className="max-w-5xl mx-auto px-4 py-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-semibold text-[#0A2540]">
            {["15 dias grátis", "Sem cartão de crédito", "Configuração em 5 minutos", "Cancele quando quiser"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle weight="fill" className="w-4 h-4 text-[#00C1B8]" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── MÉTRICAS ── */}
        <section className="py-14" style={{ background: SURFACE.base, borderBottom: `1px solid ${SURFACE.line}` }}>
          <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 divide-x divide-[#E2E8F0]">
            {[
              { value: "+47%", label: "Consultas agendadas", sub: "Média das unidades ativas" },
              { value: "<8min", label: "Tempo de resposta", sub: "Top vendedores da rede" },
              { value: "82%", label: "Taxa de comparecimento", sub: "Leads pelo funil completo" },
              { value: "3x", label: "Mais leads qualificados", sub: "IA filtra antes da equipe" },
            ].map((m, i) => (
              <Reveal key={m.label} delay={i * 0.06} className="text-center px-4">
                <div className="text-4xl font-black text-[#004A9D] mb-1 tabular-nums">{m.value}</div>
                <div className="text-sm font-bold text-[#0A2540]">{m.label}</div>
                <div className="text-xs text-[#5A667A] mt-0.5">{m.sub}</div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── COMO FUNCIONA (timeline conectada) ── */}
        <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: SURFACE.band, borderBottom: `1px solid ${SURFACE.line}` }}>
          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center mb-16">
              <h2 className="text-4xl font-black text-[#004A9D] mb-3">Do lead ao agendamento.<br /><span className="text-[#00C1B8]">Automático.</span></h2>
              <p className="text-[#5A667A] max-w-xl mx-auto">O funil Homenz IA transforma visitantes do seu tráfego pago em consultas confirmadas, sem intervenção manual da sua equipe.</p>
            </Reveal>
            <div className="relative grid md:grid-cols-4 gap-6">
              {/* linha conectora */}
              <div className="hidden md:block absolute top-[42px] left-[12.5%] right-[12.5%] h-0.5 -z-0" style={{ background: "linear-gradient(90deg, #004A9D 0%, #00C1B8 100%)", opacity: 0.35 }} />
              {[
                { step: "01", icon: ChatCircleDots, title: "Lead entra no chat", desc: "O visitante clica no anúncio e cai direto no chat qualificador IA da sua clínica." },
                { step: "02", icon: Brain, title: "Diagnóstico capilar", desc: "A IA faz as perguntas certas, mapeia o grau de calvície e indica o protocolo ideal." },
                { step: "03", icon: CalendarCheck, title: "Agendamento automático", desc: "O lead escolhe data e horário direto no chat. Confirmação automática por WhatsApp." },
                { step: "04", icon: TrendUp, title: "Sua equipe vende", desc: "O vendedor recebe o lead com diagnóstico, protocolo e temperatura. Só precisa fechar." },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 0.1} className="relative z-10">
                  <div className="flex flex-col items-center text-center md:items-start md:text-left">
                    <div className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#004A9D]/25 mb-4" style={{ background: "linear-gradient(135deg, #004A9D 0%, #00C1B8 100%)" }}>
                      <s.icon className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-[#00C1B8] tabular-nums">{s.step}</span>
                      <h3 className="font-black text-[#0A2540]">{s.title}</h3>
                    </div>
                    <p className="text-sm text-[#5A667A] leading-relaxed">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── FUNCIONALIDADES (bento com diversidade) ── */}
        <section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: SURFACE.base, borderBottom: `1px solid ${SURFACE.line}` }}>
          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center mb-16">
              <h2 className="text-4xl font-black text-[#004A9D] mb-3">Tudo que sua clínica precisa.<br /><span className="text-[#00C1B8]">Em um só lugar.</span></h2>
            </Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 0.08}>
                  {f.featured ? (
                    <div className="glass-card h-full rounded-2xl p-6 transition-all hover:-translate-y-1 group relative overflow-hidden" style={{ background: "linear-gradient(160deg, #004A9D 0%, #003a7d 100%)" }}>
                      <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, rgba(0,193,184,0.3) 0%, transparent 70%)" }} />
                      <div className="relative w-12 h-12 rounded-xl bg-[#00C1B8] flex items-center justify-center text-white mb-4">
                        <f.icon className="w-6 h-6" weight="duotone" />
                      </div>
                      <h3 className="relative font-black text-white text-lg mb-2">{f.title}</h3>
                      <p className="relative text-sm text-white/80 leading-relaxed">{f.desc}</p>
                    </div>
                  ) : (
                    <div className="glass-card h-full bg-white rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#004A9D]/30 hover:-translate-y-1 transition-all group">
                      <div className="w-12 h-12 rounded-xl bg-[#004A9D]/10 flex items-center justify-center text-[#004A9D] mb-4 group-hover:bg-[#004A9D] group-hover:text-white transition-all">
                        <f.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-black text-[#0A2540] mb-2">{f.title}</h3>
                      <p className="text-sm text-[#5A667A] leading-relaxed">{f.desc}</p>
                    </div>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── RESULTADOS / ANTES E DEPOIS ── */}
        <section id="resultados" className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: SURFACE.band, borderBottom: `1px solid ${SURFACE.line}` }}>
          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center mb-16">
              <h2 className="text-4xl font-black text-[#004A9D] mb-3">Antes e depois.<br /><span className="text-[#00C1B8]">Isso é o que você vende.</span></h2>
              <p className="text-[#5A667A] max-w-xl mx-auto">Cada lead que entra no funil Homenz IA recebe um diagnóstico personalizado e sai com clareza sobre o protocolo ideal.</p>
            </Reveal>
            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {CASES.map((c, i) => (
                <Reveal key={c.name} delay={i * 0.1}>
                  <div className="glass-card h-full bg-white rounded-3xl overflow-hidden border border-[#E2E8F0] hover:-translate-y-1 transition-all flex flex-col">
                    <div className="relative h-52 overflow-hidden">
                      <img src={c.image} alt={`Antes e depois ${c.name}`} className="w-full h-full object-cover" />
                      <span className="absolute top-2 left-2 bg-[#0A2540]/80 backdrop-blur text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow">Antes</span>
                      <span className="absolute top-2 right-2 bg-[#00C1B8] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow">{c.afterLabel}</span>
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#E2E8F0] flex items-center justify-center shadow-md z-10">
                        <ArrowRight weight="bold" className="w-4 h-4 text-[#004A9D]" />
                      </div>
                    </div>
                    <div className="px-5 pt-4">
                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide ${c.tagColor}`}>{c.tag}</span>
                    </div>
                    <div className="p-5 flex-1">
                      <p className="text-sm text-[#374151] leading-relaxed italic mb-4">"{c.quote}"</p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {[0, 1, 2, 3, 4].map((s) => <Star key={s} weight="fill" className="w-3 h-3 text-[#F59E0B]" />)}
                        </div>
                        <div>
                          <span className="font-bold text-[#0A2540] text-xs">{c.name}</span>
                          <span className="text-[#5A667A] text-xs"> · {c.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Reveal className="bg-[#EBF4FF] border border-[#004A9D]/20 rounded-2xl p-6 text-center">
              <p className="text-[#374151] text-sm mb-1">Cada lead que entra no funil Homenz IA passa por um diagnóstico personalizado antes de chegar na sua equipe.</p>
              <p className="font-bold text-[#004A9D]">Ele chega pronto. A sua clínica só precisa confirmar o agendamento.</p>
            </Reveal>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden" style={{ background: "radial-gradient(72% 90% at 100% 100%, rgba(0,193,184,0.16), transparent 58%), #003A7A" }}>
          <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ background: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1.5px)", backgroundSize: "30px 30px", maskImage: "radial-gradient(ellipse at 50% 50%, black 0%, transparent 75%)", WebkitMaskImage: "radial-gradient(ellipse at 50% 50%, black 0%, transparent 75%)" }} />
          <Reveal className="relative max-w-3xl mx-auto text-center">
            <div className="glass-pill inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-widest mb-8" style={{ "--pill-glow": "rgba(255,255,255,0.3)" } as React.CSSProperties}>
              <ShieldCheck weight="fill" className="w-3.5 h-3.5" />
              Exclusivo para a rede Homenz
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 leading-[1.08]">
              Sua clínica Homenz<br />merece uma agenda cheia.
            </h2>
            <p className="text-white/80 text-lg mb-10">
              Fale com a equipe e veja o funil funcionando na sua unidade.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={goSales}
                className="glass-pill flex items-center gap-2 px-10 py-5 rounded-full bg-[#00C1B8] hover:bg-[#00d4ca] text-white font-bold text-lg transition-all hover:-translate-y-0.5 active:scale-95 group"
                style={{ "--pill-glow": "rgba(0,193,184,0.65)" } as React.CSSProperties}
              >
                Falar com a equipe
                <ArrowRight weight="bold" className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={goDemo}
                className="glass-pill flex items-center gap-2 px-10 py-5 rounded-full bg-white hover:bg-[#EBF4FF] text-[#004A9D] font-bold text-lg transition-all hover:-translate-y-0.5"
                style={{ "--pill-glow": "rgba(255,255,255,0.45)" } as React.CSSProperties}
              >
                Ver demo ao vivo
              </button>
            </div>
          </Reveal>
        </section>

        {/* ── FOOTER ── */}
        <footer className="py-12 px-4 sm:px-6 lg:px-8" style={{ background: SURFACE.band, borderTop: `1px solid ${SURFACE.line}` }}>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-1.5">
                <span style={FN_WORDMARK_VARS}><FunnelWordmark height={24} /></span>
                <span className="inline-flex items-center text-[10px] font-black text-white rounded-md px-1.5 py-0.5 leading-none tracking-wide" style={{ background: "linear-gradient(135deg, #004A9D 0%, #00C1B8 100%)" }}>AI</span>
              </span>
              <p className="text-xs text-[#5A667A] mt-1">Sistema oficial de funil para a rede Homenz Brasil</p>
            </div>
            <div className="flex gap-6 text-sm text-[#5A667A]">
              <button onClick={() => navigate("/login")} className="hover:text-[#004A9D] transition-colors">Login</button>
              <button onClick={goSales} className="hover:text-[#004A9D] transition-colors">Falar com a equipe</button>
              <button onClick={goDemo} className="hover:text-[#004A9D] transition-colors">Demo</button>
            </div>
            <p className="text-xs text-[#5A667A]">© 2026 Homenz Brasil. Todos os direitos reservados.</p>
          </div>
        </footer>

      </div>
    </IconContext.Provider>
  );
}
