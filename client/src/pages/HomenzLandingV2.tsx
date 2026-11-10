import { useState, useRef, useEffect, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { motion, useReducedMotion, useInView, useMotionValue, animate, useSpring, useTransform, useScroll } from "framer-motion";
import FunnelWordmark from "./funnel/FunnelWordmark";
import {
  IconContext,
  Lightning,
  ArrowRight,
  ChatCircleDots,
  Brain,
  CalendarCheck,
  TrendUp,
  ThermometerSimple,
  ChartBar,
  Trophy,
  Star,
  Sparkle,
  ShieldCheck,
  CaretRight,
  PaperPlaneTilt,
  SpotifyLogo,
  YoutubeLogo,
  Play,
  MicrophoneStage,
  Sun,
  MoonStars,
  GraduationCap,
  type Icon,
} from "@phosphor-icons/react";

/* ────────────────────────────────────────────────────────────────────────────
 * Homenz IA — Landing de venda B2B (v2)
 *
 * Direção (Refero lock — A Better Lou / abetterlou.com): DARK EDITORIAL.
 *  - Canvas escuro do início ao fim; profundidade vem de FOTOGRAFIA + gradiente,
 *    não de bloco de cor chapada.
 *  - Hero de foto full-bleed com headline editorial sobreposta.
 *  - Gráfico circular "dial" (assinatura do abetterlou — o relógio de idade biológica).
 *  - Pills de raio grande, bordas sutis, NUNCA sombra pesada; acento único.
 *  - Marca Homenz preservada: navy escuro + teal (no lugar do âmbar), Clash Display.
 * ──────────────────────────────────────────────────────────────────────────── */

// ─── Tokens (tema dark) ───
const T = {
  bg: "#070F1C", // canvas mais profundo
  surface: "#0B1A2C", // seções
  elevated: "#102438", // cards
  ink: "#EDF3FA", // títulos
  body: "#A6B6CB", // corpo
  muted: "#647689", // legendas
  teal: "#00C1B8", // acento
  tealInk: "#04141F", // texto sobre teal
  blue: "#46A6E6", // azul secundário (detalhe)
  line: "rgba(255,255,255,0.10)",
  lineStrong: "rgba(255,255,255,0.17)",
};
// Phone do chat: UI clara intencional (contraste de "produto" sobre o dark).
const LIGHTUI = { bg: "#FFFFFF", frost: "#F1F5FA", ink: "#0A2540", body: "#51607A", muted: "#7A8AA0", line: "#E4E9F1" };

// ─── Tema CLARO (corpo da página, abaixo do hero) ───
// Marca Homenz: azul royal #004A9D + teal #00C1B8. SEM azul-bebê chapado (anti-ref do brand doc):
// fundos brancos/cinza-frio neutros; o azul aparece SÓ como acento (botão, número, palavra-chave).
const L = {
  bg: "#FFFFFF", // base branca
  surface: "#F5F8FC", // seção alternada (cinza-frio sutil)
  card: "#FFFFFF", // cards
  ink: "#0A2540", // títulos navy
  body: "#46566D", // corpo (≥7:1 no branco)
  muted: "#74849A", // legendas
  blue: "#004A9D", // azul Homenz — acento de marca
  blueDark: "#013D82",
  teal: "#0A8E86", // teal p/ TEXTO/ícone em claro (contraste); fill usa #00C1B8
  tealFill: "#00C1B8",
  tealInk: "#04141F",
  line: "#E4EAF2",
  lineStrong: "#D3DDEA",
};
const LIGHT_SHADOW = "0 1px 2px rgba(10,37,64,0.04), 0 12px 32px -16px rgba(10,37,64,0.18)";
const LIGHT_SHADOW_LG = "0 2px 6px rgba(10,37,64,0.05), 0 40px 80px -40px rgba(10,37,64,0.28)";

const DISPLAY = "'Clash Display', 'Hanken Grotesk', system-ui, sans-serif";
const BODY = "'Hanken Grotesk', system-ui, -apple-system, sans-serif";

const HERO_PORTRAIT = "/funnel/hero-homenz.jpg";
const HERO_WIDE = "/v2/hero-wide.jpg"; // hero DARK — estádio noturno azulado (fal)
const HERO_WIDE_LIGHT = "/v2/hero-wide-light.jpg"; // hero LIGHT — mesmo estádio de dia c/ haze (fal)
const CURSO_BENTO = "/v2/curso-bento-homenz.jpg"; // card do Bento recolorido na paleta Homenz (fal edit)
const BENTO_PHOTO = ""; // rosto do Bento — vazio = placeholder; aponte o caminho quando tiver a foto
const SALES_WHATSAPP = "5534990000000";

// ─── Paleta por tema (light é o default; dark é o toggle) ───
// Mesmas chaves nos dois — o corpo da página referencia `c.*` e troca tudo de uma vez.
function mkPalette(dark: boolean) {
  return dark
    ? {
        bg: "#070F1C", surfaceAlt: "#0B1A2C", card: "#102438",
        cardBorder: "rgba(255,255,255,0.10)", cardBorderStrong: "rgba(255,255,255,0.17)",
        cardShadow: "0 2px 10px rgba(0,0,0,0.25), 0 40px 80px -44px rgba(0,0,0,0.8)",
        cardShadowLg: "0 2px 10px rgba(0,0,0,0.3), 0 50px 92px -44px rgba(0,0,0,0.85)",
        ink: "#EDF3FA", body: "#A6B6CB", muted: "#647689",
        blue: "#46A6E6", teal: "#00C1B8", tealFill: "#00C1B8", tealInk: "#04141F",
        line: "rgba(255,255,255,0.10)", lineStrong: "rgba(255,255,255,0.17)",
        heroImg: HERO_WIDE, heroImgMobile: "/v2/hero-mobile-dark.jpg", heroText: "#fff", heroSub: "#C8D4E4",
        heroOverlayLeft: "linear-gradient(90deg, rgba(7,15,28,0.86) 0%, rgba(7,15,28,0.46) 34%, rgba(7,15,28,0.06) 60%, transparent 80%)",
        heroVignette: "linear-gradient(180deg, rgba(7,15,28,0.32) 0%, transparent 15%, transparent 50%, rgba(7,15,28,0.82) 84%, #070F1C 100%)",
        heroGlow: "radial-gradient(34% 44% at 80% 18%, rgba(0,193,184,0.16), transparent 70%)",
        heroPillBg: "rgba(255,255,255,0.06)", heroPillText: "#fff", heroPillBorder: "rgba(255,255,255,0.10)",
        heroStripBg: "linear-gradient(180deg, rgba(7,15,28,0.2) 0%, #070F1C 92%)",
        navBg: "rgba(7,15,28,0.72)", navBorder: "rgba(255,255,255,0.10)",
      }
    : {
        bg: "#FFFFFF", surfaceAlt: "#F5F8FC", card: "#FFFFFF",
        cardBorder: "#E4EAF2", cardBorderStrong: "#D3DDEA",
        cardShadow: LIGHT_SHADOW, cardShadowLg: LIGHT_SHADOW_LG,
        ink: "#0A2540", body: "#46566D", muted: "#74849A",
        blue: "#004A9D", teal: "#0A8E86", tealFill: "#00C1B8", tealInk: "#04141F",
        line: "#E4EAF2", lineStrong: "#D3DDEA",
        heroImg: HERO_WIDE_LIGHT, heroImgMobile: "/v2/hero-mobile-light.jpg", heroText: "#0A2540", heroSub: "#46566D",
        heroOverlayLeft: "linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.6) 32%, rgba(255,255,255,0.12) 58%, transparent 78%)",
        heroVignette: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, transparent 16%, transparent 50%, rgba(255,255,255,0.86) 86%, #FFFFFF 100%)",
        heroGlow: "radial-gradient(40% 50% at 80% 12%, rgba(0,193,184,0.10), transparent 72%)",
        heroPillBg: "rgba(0,193,184,0.10)", heroPillText: "#0A2540", heroPillBorder: "rgba(0,193,184,0.24)",
        heroStripBg: "linear-gradient(180deg, rgba(255,255,255,0) 0%, #FFFFFF 70%)",
        navBg: "rgba(255,255,255,0.82)", navBorder: "#E4EAF2",
      };
}
type Palette = ReturnType<typeof mkPalette>;

const WORDMARK_DARK = {
  "--fn-ink": "#FFFFFF",
  "--fn-accent": T.teal,
  "--fn-font-display": DISPLAY,
} as CSSProperties;
const WORDMARK_LIGHT = {
  "--fn-ink": "#0A2540",
  "--fn-accent": "#00C1B8",
  "--fn-font-display": DISPLAY,
} as CSSProperties;

const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const HERO_FEATURES: { icon: Icon; title: string; desc: string }[] = [
  { icon: ShieldCheck, title: "Lead qualificado", desc: "Chega pronto, com diagnóstico e protocolo." },
  { icon: Sparkle, title: "Diagnóstico por IA", desc: "Antes/depois gerado na hora, antes de decidir." },
  { icon: CalendarCheck, title: "Agenda cheia", desc: "Do anúncio ao agendamento, no automático." },
];

const STATS = [
  { value: "<8 min", label: "Tempo de resposta", sub: "Top vendedores da rede" },
  { value: "82%", label: "Comparecimento", sub: "Leads pelo funil completo" },
  { value: "3x", label: "Leads qualificados", sub: "IA filtra antes da equipe" },
];

const STEPS: { n: string; icon: Icon; title: string; desc: string }[] = [
  { n: "01", icon: ChatCircleDots, title: "Lead entra no chat", desc: "O visitante clica no anúncio e cai direto no chat qualificador da sua clínica." },
  { n: "02", icon: Brain, title: "Diagnóstico capilar", desc: "A IA faz as perguntas certas, mapeia o grau de calvície e indica o protocolo." },
  { n: "03", icon: CalendarCheck, title: "Agendamento automático", desc: "O lead escolhe data e horário no chat. Confirmação automática por WhatsApp." },
  { n: "04", icon: TrendUp, title: "Sua equipe vende", desc: "O vendedor recebe o lead com diagnóstico, protocolo e temperatura. Só fecha." },
];

type Feature = { icon: Icon; title: string; desc: string };
const FEATURES: Feature[] = [
  { icon: ChatCircleDots, title: "Chat Qualificador IA", desc: "O lead responde um diagnóstico guiado por IA antes de chegar na sua equipe. Chega pronto e com protocolo indicado." },
  { icon: Brain, title: "Diagnóstico Capilar 3D", desc: "Análise visual do grau de calvície com mapeamento do protocolo ideal. O lead vê o resultado e quer agendar na hora." },
  { icon: ThermometerSimple, title: "Temperatura do Lead", desc: "Cada lead é classificado em quente, morno ou frio em tempo real. Sua equipe age no momento certo." },
  { icon: CalendarCheck, title: "Agendamento Integrado", desc: "Do chat ao calendário em um clique. Sem planilha, sem WhatsApp manual. O sistema agenda e confirma." },
  { icon: ChartBar, title: "Analytics do Funil", desc: "Taxa de conversão, tempo de resposta, ranking de vendedores. Você vê onde está perdendo dinheiro." },
  { icon: Trophy, title: "Ranking da Rede", desc: "Health score da sua unidade (S/A/B/C/D/F) e posição no ranking Homenz. Gamificação que move a equipe." },
];

const CASES = [
  { name: "Carlos M., 38", city: "Uberaba, MG", after: "4 MESES DEPOIS", tag: "Preenchimento + PRP", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-1_55ef2687.png", quote: "Fiz o diagnóstico pelo chat e em 15 minutos já sabia qual protocolo era pra mim. Agendei na hora." },
  { name: "Rafael S., 44", city: "Uberlândia, MG", after: "6 MESES DEPOIS", tag: "Mesoterapia + Laser", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-2_1fdad418.png", quote: "Eu estava desistindo porque não sabia por onde começar. O sistema me encaminhou pro protocolo certo." },
  { name: "Thiago R., 31", city: "Belo Horizonte, MG", after: "3 MESES DEPOIS", tag: "Protocolo Preventivo", image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-3_4a0fbbcb.png", quote: "Cheguei cedo, antes de perder muito. O protocolo preventivo travou a queda. Mantenho com check-ins mensais." },
];

// PODZ — podcast oficial da Homenz. IDs reais do canal @homenz (título queimado na arte da thumb).
const PODZ_YOUTUBE = "https://www.youtube.com/@homenz";
const PODZ_SPOTIFY = "https://open.spotify.com/show/2lKYbVhl9cjpbYui3s2Ko5";
const PODZ_EPISODES = ["Z2npnSYYvLY", "ZsPShfqRm_Q", "W373j2aag6g", "JIzp836cxbw", "QrerfKMnnIc"].map((id, i) => ({
  id,
  ep: String(i + 1).padStart(2, "0"),
  thumb: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
  href: `https://www.youtube.com/watch?v=${id}`,
}));

// ─── Reveal cinematográfico ───
function Reveal({ children, className, delay = 0, y = 26 }: { children: ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y, scale: 0.985, filter: "blur(6px)" }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden className="fixed top-0 left-0 right-0 h-[3px] z-[60] origin-left" style={{ scaleX, background: "linear-gradient(90deg, #00C1B8 0%, #38BDF8 55%, #46A6E6 100%)" }} />;
}

// Marcador de seção — hairline teal + label em caixa normal. Sistema deliberado no lugar
// do eyebrow MAIÚSCULO-tracado repetido (que lê como scaffold de IA).
function SectionTag({ children, color = T.teal }: { children: ReactNode; color?: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 mb-4">
      <span className="h-px w-7 rounded-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <span className="text-[13px] font-semibold tracking-tight" style={{ color }}>{children}</span>
    </div>
  );
}

// ─── Dial circular (assinatura abetterlou: anel de pontos + número central) ───
function CircularDial({ value, label, fill = 0.62, light = false }: { value: string; label: string; fill?: number; light?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const dots = 56;
  const lit = !reduce && inView;
  const dimDot = light ? "rgba(10,37,64,0.12)" : "rgba(255,255,255,0.16)";
  const litColor = light ? L.tealFill : T.teal;
  const pointer = light ? "rgba(10,37,64,0.18)" : "rgba(255,255,255,0.18)";
  const hub = light ? "rgba(10,37,64,0.22)" : "rgba(255,255,255,0.25)";
  return (
    <div ref={ref} className="relative mx-auto" style={{ width: 320, height: 320, maxWidth: "82vw" }}>
      <svg viewBox="0 0 320 320" className="absolute inset-0 w-full h-full">
        {Array.from({ length: dots }).map((_, i) => {
          const a = (i / dots) * Math.PI * 2 - Math.PI / 2;
          const r = 142;
          const cx = 160 + r * Math.cos(a);
          const cy = 160 + r * Math.sin(a);
          const isLit = lit && i / dots < fill;
          const big = i % 7 === 0;
          return (
            <motion.circle
              key={i}
              cx={cx}
              cy={cy}
              r={big ? 2.6 : 1.5}
              fill={isLit ? litColor : dimDot}
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + (i / dots) * 0.9, duration: 0.3 }}
              style={isLit && big ? { filter: "drop-shadow(0 0 5px rgba(0,193,184,0.9))" } : undefined}
            />
          );
        })}
        {/* ponteiro sutil */}
        <line x1="160" y1="160" x2={160 + 120 * Math.cos(fill * Math.PI * 2 - Math.PI / 2)} y2={160 + 120 * Math.sin(fill * Math.PI * 2 - Math.PI / 2)} stroke={pointer} strokeWidth="1" />
        <circle cx="160" cy="160" r="9" fill="none" stroke={hub} strokeWidth="1.5" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-semibold leading-none" style={{ fontFamily: DISPLAY, color: light ? L.ink : T.ink, fontSize: "3.6rem" }}><CountUp value={value} /></div>
        <div className="mt-2 text-[13px]" style={{ color: light ? L.muted : T.muted }}>{label}</div>
      </div>
    </div>
  );
}

// ─── CountUp ───
function CountUp({ value, style }: { value: string; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15%" });
  const m = value.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
  const prefix = m?.[1] ?? "";
  const target = m ? parseFloat(m[2].replace(",", ".")) : 0;
  const suffix = m?.[3] ?? "";
  const isInt = Number.isInteger(target);
  const [display, setDisplay] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!inView || reduce) { setDisplay(target); return; }
    const controls = animate(0, target, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setDisplay(v) });
    return () => controls.stop();
  }, [inView, reduce, target]);
  return <span ref={ref} style={style}>{prefix}{isInt ? Math.round(display) : display.toFixed(1)}{suffix}</span>;
}

// ─── Antes/depois "gerado por IA" ───
function AIBeforeAfter({ src, alt, delay = 0 }: { src: string; alt: string; delay?: number }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12%" });
  const reveal = !reduce && inView;
  return (
    <div ref={ref} className="relative overflow-hidden">
      <motion.div
        initial={reduce ? false : { clipPath: "inset(0 100% 0 0)", filter: "blur(10px) saturate(0.55)" }}
        animate={reveal ? { clipPath: "inset(0 0% 0 0)", filter: "blur(0px) saturate(1)" } : undefined}
        transition={{ clipPath: { duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }, filter: { duration: 1.25, delay, ease: "easeOut" } }}
      >
        <motion.img key={src} src={src} alt={alt} className="w-full object-cover block" style={{ aspectRatio: "16/10" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay }} />
      </motion.div>
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute top-0 bottom-0 w-[2px] pointer-events-none z-10"
          style={{ background: T.teal, boxShadow: "0 0 22px 5px rgba(0,193,184,0.65)" }}
          initial={{ left: "0%", opacity: 0 }}
          animate={reveal ? { left: ["0%", "100%"], opacity: [0, 1, 1, 0] } : undefined}
          transition={{ duration: 1.1, delay, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}

// ─── Mini-demo do chat IA (phone claro sobre o dark) ───
type ChatMsg = { from: "bot" | "user"; text: string };
type ChatStep = { kind: "bot"; text: string } | { kind: "opts"; options: string[] } | { kind: "pick"; text: string };
const CHAT_SCRIPT: ChatStep[] = [
  { kind: "bot", text: "Olá! Vou avaliar seu caso em 2 minutos. 👋" },
  { kind: "bot", text: "Qual é a sua principal preocupação?" },
  { kind: "opts", options: ["Entradas na testa", "Queda progressiva", "Calvície avançada"] },
  { kind: "pick", text: "Entradas na testa" },
  { kind: "bot", text: "Entendi. Há quanto tempo você percebe?" },
  { kind: "opts", options: ["Menos de 1 ano", "1 a 3 anos", "Mais de 3 anos"] },
  { kind: "pick", text: "1 a 3 anos" },
  { kind: "bot", text: "Perfeito! Já tenho seu perfil. Vamos ver seu resultado por IA? ✨" },
];

function ChatBubble({ m }: { m: ChatMsg }) {
  const bot = m.from === "bot";
  return (
    <motion.div className={`flex ${bot ? "justify-start" : "justify-end"}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
      <div className="max-w-[82%] rounded-2xl px-3.5 py-2 text-[13px] leading-snug" style={bot ? { background: "#fff", color: LIGHTUI.ink, border: `1px solid ${LIGHTUI.line}`, borderTopLeftRadius: 4 } : { background: T.teal, color: T.tealInk, borderTopRightRadius: 4, fontWeight: 600 }}>
        {m.text}
      </div>
    </motion.div>
  );
}

function ChatDemo({ light = false }: { light?: boolean }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-18%" });
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [opts, setOpts] = useState<string[] | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [cycle, setCycle] = useState(0);

  const fullMsgs: ChatMsg[] = CHAT_SCRIPT.flatMap((s) => (s.kind === "bot" ? [{ from: "bot", text: s.text } as ChatMsg] : s.kind === "pick" ? [{ from: "user", text: s.text } as ChatMsg] : []));

  useEffect(() => {
    if (reduce) { setMsgs(fullMsgs); setOpts(null); setTyping(false); return; }
    if (!inView) return;
    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((res) => { timers.push(window.setTimeout(res, ms)); });
    (async () => {
      setMsgs([]); setOpts(null); setPicked(null); setTyping(false);
      await wait(400);
      for (const step of CHAT_SCRIPT) {
        if (cancelled) return;
        if (step.kind === "bot") {
          setTyping(true);
          await wait(820);
          if (cancelled) return;
          setTyping(false);
          setMsgs((mm) => [...mm, { from: "bot", text: step.text }]);
          await wait(520);
        } else if (step.kind === "opts") {
          setOpts(step.options);
          await wait(1150);
        } else {
          setPicked(step.text);
          await wait(440);
          if (cancelled) return;
          setOpts(null); setPicked(null);
          setMsgs((mm) => [...mm, { from: "user", text: step.text }]);
          await wait(640);
        }
      }
      await wait(2800);
      if (!cancelled) setCycle((c) => c + 1);
    })();
    return () => { cancelled = true; timers.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduce, cycle]);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[348px]">
      <div className="absolute -inset-8 -z-10 pointer-events-none" style={{ background: `radial-gradient(closest-side, rgba(0,193,184,${light ? 0.16 : 0.22}), transparent 72%)` }} />
      <div className="rounded-[26px] overflow-hidden" style={{ background: "#fff", border: `1px solid ${light ? L.lineStrong : LIGHTUI.line}`, boxShadow: light ? LIGHT_SHADOW_LG : "0 40px 80px -40px rgba(0,0,0,0.7)" }}>
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: `1px solid ${LIGHTUI.line}` }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: LIGHTUI.ink }}>
            <Sparkle weight="fill" className="w-4 h-4" style={{ color: T.teal }} />
          </div>
          <div>
            <div className="text-[13px] font-bold leading-none" style={{ color: LIGHTUI.ink }}>Homenz · Avaliação</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
              <span className="text-[11px]" style={{ color: LIGHTUI.body }}>online agora</span>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 h-[362px] overflow-hidden flex flex-col justify-end gap-2.5" style={{ background: LIGHTUI.frost }}>
          {msgs.map((m, i) => <ChatBubble key={`${cycle}-${i}`} m={m} />)}
          {typing && (
            <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="rounded-2xl px-3.5 py-3 flex items-center gap-1" style={{ background: "#fff", border: `1px solid ${LIGHTUI.line}`, borderTopLeftRadius: 4 }}>
                {[0, 1, 2].map((i) => <span key={i} className="v2-typing w-1.5 h-1.5 rounded-full" style={{ background: "#9AA6B8", animationDelay: `${i * 0.16}s` }} />)}
              </div>
            </motion.div>
          )}
          {opts && (
            <div className="space-y-1.5 pt-0.5">
              {opts.map((o) => (
                <motion.div key={o} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="rounded-xl px-3.5 py-2 text-[13px] font-semibold flex items-center justify-between" style={{ background: o === picked ? T.teal : "#fff", color: o === picked ? T.tealInk : LIGHTUI.ink, border: `1px solid ${o === picked ? T.teal : LIGHTUI.line}` }}>
                  <span>{o}</span>
                  <CaretRight weight="bold" className="w-3.5 h-3.5" style={{ opacity: 0.45 }} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderTop: `1px solid ${LIGHTUI.line}` }}>
          <div className="flex-1 rounded-full px-3.5 py-2 text-[13px]" style={{ background: LIGHTUI.frost, color: LIGHTUI.muted }}>Digite sua resposta…</div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: T.teal }}>
            <PaperPlaneTilt weight="fill" className="w-4 h-4" style={{ color: T.tealInk }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Botões (pill, dark) ───
function PrimaryCTA({ children, onClick, size = "md" }: { children: ReactNode; onClick: () => void; size?: "md" | "lg" }) {
  return (
    <button onClick={onClick} className={`v2-cta v2-cta-primary inline-flex items-center justify-center gap-2 rounded-full font-bold ${size === "lg" ? "px-8 py-4 text-[16px]" : "px-7 py-3.5 text-[15px]"}`} style={{ color: T.tealInk }}>
      {children}
      <ArrowRight weight="bold" className="v2-cta-arrow w-4 h-4" />
    </button>
  );
}
function GhostCTA({ children, onClick, size = "md", light = false }: { children: ReactNode; onClick: () => void; size?: "md" | "lg"; light?: boolean }) {
  return (
    <button onClick={onClick} className={`v2-cta-ghost inline-flex items-center justify-center gap-2 rounded-full font-bold ${size === "lg" ? "px-8 py-4 text-[16px]" : "px-7 py-3.5 text-[15px]"}`} style={{ color: light ? "#0A2540" : "#fff", background: light ? "rgba(10,37,64,0.03)" : "transparent", border: `1px solid ${light ? "rgba(10,37,64,0.16)" : T.lineStrong}` }}>
      {children}
    </button>
  );
}

// Chip de ícone circular (estilo abetterlou). `light` p/ usar sobre faixa clara.
function CircleIcon({ icon: Ico, light = false }: { icon: Icon; light?: boolean }) {
  return (
    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ border: `1px solid ${light ? "rgba(10,37,64,0.14)" : T.lineStrong}`, background: light ? "rgba(0,193,184,0.07)" : "rgba(255,255,255,0.03)" }}>
      <Ico className="w-5 h-5" style={{ color: light ? "#0A8E86" : T.teal }} />
    </div>
  );
}

// Card padrão de recurso. Ícone+título inline (compacto) no mobile; empilhado no desktop.
function FeatureCard({ f, c }: { f: Feature; c: Palette }) {
  const Ico = f.icon;
  return (
    <div className="v2-lcard h-full rounded-2xl p-5 sm:p-6" style={{ background: c.card, border: `1px solid ${c.cardBorder}`, boxShadow: c.cardShadow }}>
      <div className="flex items-center gap-3.5 sm:block">
        <div className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center sm:mb-5" style={{ background: "rgba(0,193,184,0.10)", border: `1px solid rgba(0,193,184,0.22)` }}>
          <Ico className="w-5 h-5" style={{ color: c.teal }} />
        </div>
        <h3 className="text-[16px] font-bold sm:mb-2" style={{ color: c.ink }}>{f.title}</h3>
      </div>
      <p className="mt-3 sm:mt-0 text-[14px] leading-relaxed" style={{ color: c.body }}>{f.desc}</p>
    </div>
  );
}

// Card DESTAQUE — maior, com prévia viva do chat (quebra o grid idêntico).
function FeatureCardLarge({ f, c }: { f: Feature; c: Palette }) {
  const Ico = f.icon;
  return (
    <div className="v2-lcard relative h-full rounded-2xl p-7 sm:p-8 overflow-hidden flex flex-col" style={{ background: c.card, border: `1px solid ${c.cardBorderStrong}`, boxShadow: c.cardShadowLg }}>
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(72% 80% at 90% 2%, rgba(0,193,184,0.08), transparent 60%)" }} />
      <div className="relative flex items-start justify-between">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(0,193,184,0.12)", border: `1px solid rgba(0,193,184,0.3)` }}>
          <Ico className="w-7 h-7" style={{ color: c.teal }} />
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: "rgba(0,193,184,0.12)", color: c.teal, border: `1px solid rgba(0,193,184,0.28)` }}>
          <span className="v2-livedot w-1.5 h-1.5 rounded-full" style={{ background: c.tealFill }} /> Mais usado
        </span>
      </div>
      <h3 className="relative mt-6 font-bold tracking-[-0.01em]" style={{ color: c.ink, fontSize: "clamp(1.25rem, 2vw, 1.6rem)", lineHeight: 1.1 }}>{f.title}</h3>
      <p className="relative mt-3 text-[15px] leading-relaxed max-w-md" style={{ color: c.body }}>{f.desc}</p>
      <div className="relative mt-auto pt-7 flex flex-col gap-2">
        <div className="self-start max-w-[78%] rounded-2xl rounded-tl-sm px-3.5 py-2 text-[12.5px]" style={{ background: c.surfaceAlt, color: c.body, border: `1px solid ${c.cardBorder}` }}>Há quanto tempo você nota a queda?</div>
        <div className="self-end max-w-[70%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-[12.5px] font-semibold" style={{ background: c.tealFill, color: c.tealInk }}>Mais ou menos 1 ano</div>
      </div>
    </div>
  );
}

export default function HomenzLandingV2() {
  const [, navigate] = useLocation();
  const reduceMotion = useReducedMotion();

  // Tema: light é o default; o toggle na navbar alterna p/ dark (estádio noturno + paleta escura).
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("homenz-v2-theme") === "dark"; } catch { return false; }
  });
  const c = mkPalette(dark);
  const light = !dark;
  const toggleTheme = () => setDark((d) => {
    const next = !d;
    try { localStorage.setItem("homenz-v2-theme", next ? "dark" : "light"); } catch { /* noop */ }
    return next;
  });

  const goSales = () =>
    window.open(`https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent("Olá! Quero conhecer a plataforma Homenz IA para minha clínica.")}`, "_blank");
  const goDemo = () => navigate("/l/uberaba-demo");

  // Parallax do hero (foto e texto em camadas).
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: heroP } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroPhotoY = useTransform(heroP, [0, 1], [0, 90]);
  const heroPhotoScale = useTransform(heroP, [0, 1], [1.05, 1.18]);
  const heroTextY = useTransform(heroP, [0, 1], [0, -60]);
  const heroOverlayOpacity = useTransform(heroP, [0, 1], [1, 0.55]);

  const navLinks = [
    { label: "Como funciona", id: "como-funciona" },
    { label: "HomenzClub", id: "homenz-club" },
    { label: "Recursos", id: "recursos" },
    { label: "Resultados", id: "resultados" },
    { label: "Podcast", id: "podcast" },
  ];

  return (
    <IconContext.Provider value={{ weight: "duotone" }}>
      <div style={{ background: c.bg, color: c.body, fontFamily: BODY }} className={`v2-root ${dark ? "v2-dark" : "v2-light"} min-h-[100dvh] antialiased overflow-x-hidden`}>
        <style>{`
          .v2-card { transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .3s, background-color .3s; }
          .v2-card:hover { transform: translateY(-5px); border-color: rgba(0,193,184,0.45); background: rgba(0,193,184,0.04); }
          .v2-iconchip { transition: border-color .3s, background-color .3s; }
          .v2-card:hover .v2-iconchip { border-color: rgba(0,193,184,0.5); background: rgba(0,193,184,0.1); }
          .v2-lcard { transition: transform .3s cubic-bezier(.16,1,.3,1), border-color .3s, box-shadow .3s; }
          .v2-lcard:hover { transform: translateY(-5px); border-color: rgba(0,193,184,0.5); box-shadow: 0 2px 8px rgba(10,37,64,0.06), 0 34px 64px -30px rgba(10,37,64,0.32); }
          .v2-podbtn.v2-light { background: #fff; border-color: #E4EAF2; color: #0A2540; box-shadow: 0 1px 2px rgba(10,37,64,0.04), 0 10px 24px -14px rgba(10,37,64,0.18); }
          .v2-podbtn.v2-light:hover { transform: translateY(-2px); border-color: rgba(29,185,84,0.6); background: rgba(29,185,84,0.06); box-shadow: 0 14px 30px -16px rgba(29,185,84,0.4); }
          .v2-podbtn-yt.v2-light:hover { border-color: rgba(255,0,51,0.5); background: rgba(255,0,51,0.05); box-shadow: 0 14px 30px -16px rgba(255,0,51,0.36); }
          .v2-cta-arrow { transition: transform .2s cubic-bezier(.16,1,.3,1); }
          .v2-cta:hover .v2-cta-arrow { transform: translateX(4px); }
          .v2-cta-primary { background: linear-gradient(180deg,#1AD6CD 0%,#00C1B8 60%,#00B2AA 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), 0 14px 34px -10px rgba(0,193,184,0.6); transition: transform .2s, box-shadow .2s; }
          .v2-cta-primary:hover { transform: translateY(-2px); box-shadow: inset 0 1px 0 rgba(255,255,255,0.5), 0 22px 48px -10px rgba(0,193,184,0.8); }
          .v2-cta-primary:active { transform: translateY(0) scale(.985); }
          .v2-cta-ghost { transition: transform .2s, background-color .2s, border-color .2s; }
          .v2-cta-ghost:hover { transform: translateY(-2px); background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.3); }
          .v2-nav-link { transition: color .2s; }
          .v2-dark .v2-nav-link:hover { color: #fff; }
          .v2-light .v2-nav-link:hover { color: #0A2540; }
          .v2-themebtn { transition: background-color .2s, border-color .2s, color .2s; }
          /* mobile/tablet: foto vertical em largura cheia, proporção natural, ancorada embaixo — homem INTEIRO, sem corte lateral, rosto acima do strip */
          .v2-heroimg { position: absolute; left: 0; right: 0; bottom: 150px; width: 100%; height: auto; object-fit: cover; }
          @media (min-width: 1024px) { .v2-heroimg { inset: 0; bottom: auto; width: 100%; height: 100%; object-position: center; } }
          .v2-window { box-shadow: 0 2px 10px rgba(0,0,0,0.25), 0 44px 84px -46px rgba(0,0,0,0.8); }
          .v2-root a:focus-visible, .v2-root button:focus-visible { outline: 2px solid #00C1B8; outline-offset: 3px; }
          @keyframes v2bounce { 0%,80%,100% { transform: translateY(0); opacity:.5 } 40% { transform: translateY(-4px); opacity:1 } }
          .v2-typing { animation: v2bounce 1.1s ease-in-out infinite; }
          @keyframes v2live { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:.4; transform:scale(.82) } }
          .v2-livedot { animation: v2live 1.6s ease-in-out infinite; }

          /* PODZ — botões YT/Spotify */
          .v2-podbtn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color: #EDF3FA; transition: transform .28s cubic-bezier(.16,1,.3,1), background-color .28s, border-color .28s, box-shadow .28s; }
          .v2-podbtn:hover { transform: translateY(-2px); border-color: rgba(29,185,84,0.55); background: rgba(29,185,84,0.10); box-shadow: 0 14px 32px -14px rgba(29,185,84,0.55); }
          .v2-podbtn-yt:hover { border-color: rgba(255,0,51,0.5); background: rgba(255,0,51,0.10); box-shadow: 0 14px 32px -14px rgba(255,0,51,0.5); }
          .v2-eq { display: inline-flex; align-items: flex-end; gap: 2px; height: 15px; }
          .v2-eq i { width: 2.5px; border-radius: 2px; background: #1DB954; transform-origin: bottom; animation: v2eq .9s ease-in-out infinite; }
          .v2-eq i:nth-child(1) { height: 45%; animation-delay: 0s }
          .v2-eq i:nth-child(2) { height: 95%; animation-delay: .16s }
          .v2-eq i:nth-child(3) { height: 60%; animation-delay: .32s }
          .v2-eq i:nth-child(4) { height: 100%; animation-delay: .48s }
          @keyframes v2eq { 0%,100% { transform: scaleY(.32) } 50% { transform: scaleY(1) } }
          .v2-podbtn:hover .v2-eq i { animation-duration: .5s; }
          .v2-ytplay { position: relative; display: inline-flex; }
          .v2-ytplay::before { content: ''; position: absolute; inset: -5px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255,0,51,0.5), transparent); opacity: 0; }
          .v2-podbtn-yt:hover .v2-ytplay::before { animation: v2pulse 1.2s ease-out infinite; }
          @keyframes v2pulse { 0% { transform: scale(.75); opacity: .65 } 100% { transform: scale(1.6); opacity: 0 } }

          /* PODZ — carrossel de episódios */
          .v2-podrail { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.22) transparent; scroll-padding-left: 1.25rem; -webkit-overflow-scrolling: touch; }
          .v2-podrail::-webkit-scrollbar { height: 6px; }
          .v2-podrail::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 99px; }
          .v2-podcard { box-shadow: 0 22px 54px -26px rgba(0,0,0,0.75); transition: transform .35s cubic-bezier(.16,1,.3,1); }
          .v2-podcard:hover { transform: translateY(-5px); }
          .v2-podimg { transition: transform .55s cubic-bezier(.16,1,.3,1); }
          .v2-podcard:hover .v2-podimg { transform: scale(1.06); }
          .v2-podplay { box-shadow: 0 10px 26px rgba(0,0,0,0.45); transition: transform .3s cubic-bezier(.16,1,.3,1); }
          .v2-podcard:hover .v2-podplay { transform: scale(1.1); }

          @media (prefers-reduced-motion: reduce) {
            .v2-card:hover, .v2-lcard:hover, .v2-cta-primary:hover, .v2-cta-ghost:hover, .v2-podbtn:hover, .v2-podcard:hover, .v2-podcard:hover .v2-podimg, .v2-podcard:hover .v2-podplay { transform: none; }
            .v2-typing, .v2-eq i, .v2-podbtn-yt:hover .v2-ytplay::before, .v2-livedot { animation: none; }
          }
        `}</style>
        <ScrollProgress />

        {/* ───────────────── NAV (translúcida, fixa, tema-aware) ───────────────── */}
        <header className="sticky top-0 z-50" style={{ background: c.navBg, backdropFilter: "blur(14px)", borderBottom: `1px solid ${c.navBorder}` }}>
          <nav className="max-w-6xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span style={dark ? WORDMARK_DARK : WORDMARK_LIGHT}><FunnelWordmark height={28} /></span>
              <span className="inline-flex items-center text-[10px] font-black rounded px-1.5 py-0.5 leading-none tracking-wide" style={{ background: c.tealFill, color: c.tealInk }}>AI</span>
            </div>
            <div className="hidden lg:flex items-center gap-8 text-[14px] font-semibold" style={{ color: c.body }}>
              {navLinks.map((i) => (
                <button key={i.id} onClick={() => document.getElementById(i.id)?.scrollIntoView({ behavior: "smooth" })} className="v2-nav-link">
                  {i.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button onClick={toggleTheme} aria-label={dark ? "Mudar para modo claro" : "Mudar para modo escuro"} className="v2-themebtn w-9 h-9 rounded-full flex items-center justify-center" style={{ background: dark ? "rgba(255,255,255,0.06)" : "rgba(10,37,64,0.05)", border: `1px solid ${c.navBorder}`, color: c.body }}>
                {dark ? <Sun weight="fill" className="w-[18px] h-[18px]" /> : <MoonStars weight="fill" className="w-[18px] h-[18px]" />}
              </button>
              <button onClick={() => navigate("/login")} className="v2-nav-link hidden sm:inline text-[14px] font-semibold" style={{ color: c.body }}>
                Entrar
              </button>
              <button onClick={goSales} className="v2-cta-primary inline-flex items-center gap-1.5 rounded-full px-4 sm:px-5 py-2.5 text-[13px] sm:text-[14px] font-bold" style={{ color: T.tealInk }}>
                Falar com a equipe
              </button>
            </div>
          </nav>
        </header>

        {/* ───────────────── HERO (foto full-bleed — estádio noturno (dark) ou diurno (light)) ───────────────── */}
        <section ref={heroRef} className="relative isolate flex flex-col overflow-hidden min-h-[114svh] md:min-h-[82svh] lg:min-h-[calc(100svh-68px)]">
          {/* foto full-bleed ATRÁS do texto. Celular/tablet (<1024) = VERTICAL; desktop (≥1024) = wide */}
          <motion.div className="absolute inset-0 z-0" style={{ scale: reduceMotion ? 1 : heroPhotoScale }}>
            <motion.div className="w-full h-full" style={{ y: reduceMotion ? 0 : heroPhotoY }}>
              {/* celular/tablet usam a foto VERTICAL (homem composto p/ portrait); só o desktop usa a wide */}
              <picture>
                <source media="(min-width: 1024px)" srcSet={c.heroImg} />
                <img src={c.heroImgMobile} alt="Homem confiante, paciente Homenz" className="v2-heroimg" />
              </picture>
            </motion.div>
            <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ background: c.heroOverlayLeft }} />
            <div className="hidden lg:block absolute inset-0 pointer-events-none" style={{ background: c.heroVignette }} />
            {/* celular/tablet: véu de leve no topo (legibilidade do texto) + dissolve suave na base — homem ancorado embaixo */}
            <div className="lg:hidden absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(180deg, ${c.bg} 0%, transparent 20%, transparent 80%, ${c.bg} 98%)` }} />
          </motion.div>
          {/* glow teal + grão */}
          <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: c.heroGlow }} />
          <div aria-hidden className="absolute inset-0 z-0 pointer-events-none opacity-[0.06] mix-blend-soft-light" style={{ backgroundImage: NOISE, backgroundSize: "180px 180px" }} />

          {/* copy — celular/tablet no TOPO (homem embaixo); desktop centraliza à esquerda */}
          <div className="relative z-10 flex-1 flex items-start lg:items-center">
            <motion.div style={{ y: reduceMotion ? 0 : heroTextY }} className="max-w-6xl mx-auto w-full px-5 sm:px-8 pt-9 pb-8 lg:py-16">
              <div className="max-w-2xl">
                <Reveal>
                  <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider mb-7" style={{ background: c.heroPillBg, color: c.heroPillText, border: `1px solid ${c.heroPillBorder}` }}>
                    <Lightning weight="fill" className="w-3.5 h-3.5" style={{ color: c.tealFill }} />
                    Exclusivo para a rede Homenz
                  </span>
                </Reveal>
                <Reveal delay={0.08}>
                  <h1 className="font-semibold tracking-[-0.03em]" style={{ fontFamily: DISPLAY, color: c.heroText, fontSize: "clamp(2.15rem, 7vw, 4.6rem)", lineHeight: 1.02 }}>
                    Sua clínica, uma máquina de agendar consultas.
                  </h1>
                </Reveal>
                <Reveal delay={0.16}>
                  <p className="mt-6 text-[17px] sm:text-[19px] leading-relaxed max-w-lg" style={{ color: c.heroSub }}>
                    Funil com IA pra rede Homenz: chat qualificador, diagnóstico capilar e agendamento automático. O lead chega pronto. Sua equipe só fecha.
                  </p>
                </Reveal>
                <Reveal delay={0.24}>
                  <div className="mt-9 flex flex-wrap gap-3">
                    <PrimaryCTA onClick={goSales} size="lg">Falar com a equipe</PrimaryCTA>
                    <GhostCTA onClick={goDemo} size="lg" light={light}>Ver demo ao vivo</GhostCTA>
                  </div>
                </Reveal>
              </div>
            </motion.div>
          </div>

          {/* strip inferior: 3 provas com ícone circular */}
          <div className="relative z-10 border-t-0 lg:border-t lg:border-solid" style={{ borderTopColor: c.line, background: c.heroStripBg }}>
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-7 grid lg:grid-cols-3 gap-5 lg:gap-7">
              {HERO_FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={0.3 + i * 0.08}>
                  <div className="flex items-start gap-3.5">
                    <CircleIcon icon={f.icon} light={light} />
                    <div className="max-w-[62%] lg:max-w-none">
                      <div className="text-[15px] font-bold mb-0.5" style={{ color: c.teal }}>{f.title}</div>
                      <div className="text-[13px] leading-snug" style={{ color: c.body }}>{f.desc}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── MÉTRICAS + DIAL ───────────────── */}
        <section className="relative" style={{ background: c.bg }}>
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <div className="grid lg:grid-cols-2 gap-14 items-center">
              <div>
                <Reveal>
                  <SectionTag color={c.blue}>Resultados da rede</SectionTag>
                  <h2 className="font-semibold tracking-[-0.025em] text-balance" style={{ fontFamily: DISPLAY, color: c.ink, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.05 }}>
                    Números que a clínica sente no caixa.
                  </h2>
                  <p className="mt-4 text-[16px] leading-relaxed max-w-md" style={{ color: c.body }}>
                    A média das unidades que rodam o funil completo. Não é promessa, é o que a rede entrega.
                  </p>
                </Reveal>
                <div className="mt-10 grid grid-cols-3 gap-x-5">
                  {STATS.map((s, i) => (
                    <Reveal key={s.label} delay={i * 0.06}>
                      <div className="font-semibold leading-none" style={{ fontFamily: DISPLAY, color: c.blue, fontSize: "clamp(1.7rem, 3.4vw, 2.4rem)" }}><CountUp value={s.value} /></div>
                      <div className="mt-2 text-[13px] font-bold" style={{ color: c.ink }}>{s.label}</div>
                      <div className="mt-0.5 text-[12px]" style={{ color: c.muted }}>{s.sub}</div>
                    </Reveal>
                  ))}
                </div>
              </div>
              <Reveal delay={0.1}>
                <CircularDial value="+47%" label="consultas agendadas" fill={0.62} light={light} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────────────── COMO FUNCIONA (timeline + chat ao vivo) ───────────────── */}
        <section id="como-funciona" className="relative" style={{ background: c.surfaceAlt, borderTop: `1px solid ${c.line}` }}>
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <Reveal>
              <SectionTag color={c.blue}>Como funciona</SectionTag>
              <h2 className="font-semibold tracking-[-0.025em] text-balance max-w-2xl" style={{ fontFamily: DISPLAY, color: c.ink, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.04 }}>
                Do anúncio ao agendamento, no automático.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed max-w-xl" style={{ color: c.body }}>
                O funil transforma tráfego pago em consultas confirmadas, sem intervenção manual da sua equipe.
              </p>
            </Reveal>
            <div className="mt-14 grid lg:grid-cols-[1fr_0.82fr] gap-12 lg:gap-16 items-center">
              <div>
                {STEPS.map((s, i) => {
                  const last = i === STEPS.length - 1;
                  return (
                    <Reveal key={s.n} delay={i * 0.06}>
                      <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <CircleIcon icon={s.icon} light={light} />
                          {!last && <div className="w-px flex-1 my-2" style={{ background: c.lineStrong }} />}
                        </div>
                        <div className={last ? "pb-1" : "pb-7"}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold" style={{ fontFamily: DISPLAY, color: c.teal, fontSize: "0.95rem" }}>{s.n}</span>
                            <h3 className="text-[16px] font-bold" style={{ color: c.ink }}>{s.title}</h3>
                          </div>
                          <p className="text-[14px] leading-relaxed" style={{ color: c.body }}>{s.desc}</p>
                        </div>
                      </div>
                    </Reveal>
                  );
                })}
              </div>
              <Reveal delay={0.1}>
                <div className="flex justify-center mb-4">
                  <span className="inline-flex items-center gap-1.5 text-[12px] font-bold" style={{ color: c.teal }}>
                    <span className="v2-livedot w-1.5 h-1.5 rounded-full" style={{ background: c.tealFill }} /> Demonstração ao vivo
                  </span>
                </div>
                <ChatDemo light={light} />
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────────────── HOMENZ CLUB (central de treinamento — theme-aware) ───────────────── */}
        <section id="homenz-club" className="relative overflow-hidden" style={{ background: c.surfaceAlt, borderTop: `1px solid ${c.line}` }}>
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(54% 64% at 84% 16%, ${dark ? "rgba(0,193,184,0.16)" : "rgba(0,193,184,0.07)"}, transparent 70%)` }} />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <div className="grid lg:grid-cols-[0.9fr_1fr] gap-12 lg:gap-16 items-center">
              {/* texto */}
              <div>
                <Reveal>
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider mb-6" style={{ background: "rgba(0,193,184,0.12)", color: c.teal, border: "1px solid rgba(0,193,184,0.30)" }}>
                    <GraduationCap weight="fill" className="w-4 h-4" /> HomenzClub
                  </span>
                  <h2 className="font-semibold tracking-[-0.025em] text-balance" style={{ fontFamily: DISPLAY, color: c.ink, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.04 }}>
                    Treinamento de marketing pra rede inteira.
                  </h2>
                  <p className="mt-4 text-[17px] leading-relaxed max-w-xl" style={{ color: c.body }}>
                    Uma central de cursos e estratégias avançadas de marketing digital pra toda a rede Homenz e seus colaboradores. Cada unidade aprende a vender mais, com método e acompanhamento.
                  </p>
                  <ul className="mt-7 space-y-3">
                    {["Cursos de tráfego e conversão pensados pra clínicas", "Estratégias prontas pra cada unidade aplicar", "Acesso liberado pra toda a equipe da franquia"].map((t) => (
                      <li key={t} className="flex items-center gap-3 text-[15px]" style={{ color: c.body }}>
                        <span className="inline-flex w-5 h-5 rounded-full items-center justify-center flex-shrink-0" style={{ background: "rgba(0,193,184,0.16)", color: c.teal }}>
                          <svg viewBox="0 0 16 16" width="11" height="11" fill="none"><path d="M3 8.5l3 3 7-7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </span>
                        {t}
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center gap-3 mt-8 pt-7" style={{ borderTop: `1px solid ${c.line}` }}>
                    {BENTO_PHOTO ? (
                      <img src={BENTO_PHOTO} alt="Bento Neto" className="w-12 h-12 rounded-full object-cover flex-shrink-0" style={{ border: "1.5px solid rgba(0,193,184,0.5)" }} />
                    ) : (
                      <span aria-hidden className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(150deg,#00C1B8,#0A8E86)", color: "#04141F" }}>
                        <GraduationCap weight="fill" className="w-6 h-6" />
                      </span>
                    )}
                    <div className="leading-tight">
                      <p className="font-semibold text-[15px]" style={{ color: c.ink }}>Com Bento Neto</p>
                      <p className="text-xs" style={{ color: c.muted }}>Especialista em marketing digital</p>
                    </div>
                  </div>
                </Reveal>
              </div>
              {/* mockup: janela do navegador homenzclub.com.br (clara nos 2 temas — é um print de site) */}
              <Reveal delay={0.1}>
                <div className="relative pb-10 sm:pb-0">
                  <div className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: `1px solid ${c.cardBorder}`, boxShadow: dark ? "0 45px 90px -35px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.22)" : "0 40px 80px -32px rgba(10,37,64,0.26), 0 2px 8px rgba(10,37,64,0.10)" }}>
                    {/* chrome do navegador — barra realista + link (a parte que funcionou) */}
                    <div className="flex items-center gap-2 px-4 py-3" style={{ background: "#ECEFF3", borderBottom: "1px solid #DFE4EA" }}>
                      <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F57" }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: "#FEBC2E" }} />
                      <span className="w-3 h-3 rounded-full" style={{ background: "#28C840" }} />
                      <div className="ml-3 flex-1 flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium truncate" style={{ background: "#fff", color: "#5A667A", border: "1px solid #E2E7EC" }}>
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.7 7.2V5.1a3.3 3.3 0 0 1 6.6 0v2.1M3.7 7.2h8.6a.9.9 0 0 1 .9.9v4.7a.9.9 0 0 1-.9.9H3.7a.9.9 0 0 1-.9-.9V8.1a.9.9 0 0 1 .9-.9Z" stroke="#9AA4B2" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        homenzclub.com.br
                      </div>
                    </div>
                    {/* conteúdo — capa do treino (Bento recolorido na paleta) */}
                    <div className="relative aspect-video">
                      <img src={CURSO_BENTO} alt="Treinamento HomenzClub com Bento Neto" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <button type="button" aria-label="Assistir a aula" className="relative grid place-items-center rounded-full transition-transform duration-300 hover:scale-[1.06]" style={{ width: 74, height: 74, background: "#fff", boxShadow: "0 20px 48px -12px rgba(0,0,0,0.55)" }}>
                          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginLeft: 3 }}><path d="M7 4.8v14.4a1 1 0 0 0 1.5.87l12-7.2a1 1 0 0 0 0-1.74l-12-7.2A1 1 0 0 0 7 4.8Z" fill="#00C1B8"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ───────────────── RECURSOS (bento) ───────────────── */}
        <section id="recursos" className="relative" style={{ background: c.bg, borderTop: `1px solid ${c.line}` }}>
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <Reveal>
              <SectionTag color={c.blue}>A plataforma</SectionTag>
              <h2 className="font-semibold tracking-[-0.025em] text-balance max-w-2xl" style={{ fontFamily: DISPLAY, color: c.ink, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.04 }}>
                Tudo que a clínica precisa, num só lugar.
              </h2>
            </Reveal>
            {/* Bento — um destaque grande + par empilhado + linha de três (sem grid idêntico) */}
            <div className="mt-12 grid lg:grid-cols-2 gap-5">
              <Reveal>
                <FeatureCardLarge f={FEATURES[0]} c={c} />
              </Reveal>
              <div className="grid gap-5">
                {[FEATURES[1], FEATURES[2]].map((f, i) => (
                  <Reveal key={f.title} delay={0.06 + i * 0.06}>
                    <FeatureCard f={f} c={c} />
                  </Reveal>
                ))}
              </div>
            </div>
            <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[FEATURES[3], FEATURES[4], FEATURES[5]].map((f, i) => (
                <Reveal key={f.title} delay={i * 0.06}>
                  <FeatureCard f={f} c={c} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── ANTES/DEPOIS ───────────────── */}
        <section id="resultados" className="relative" style={{ background: c.surfaceAlt, borderTop: `1px solid ${c.line}` }}>
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <Reveal>
              <SectionTag color={c.blue}>O que a clínica vende</SectionTag>
              <h2 className="font-semibold tracking-[-0.025em] text-balance max-w-2xl" style={{ fontFamily: DISPLAY, color: c.ink, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.04 }}>
                O antes e depois. Gerado por IA, na hora.
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed max-w-xl" style={{ color: c.body }}>
                Cada lead recebe uma prévia do próprio resultado antes de decidir. É o que faz ele agendar.
              </p>
            </Reveal>
            <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {CASES.map((cs, i) => (
                <Reveal key={cs.name} delay={i * 0.08}>
                  <div className="rounded-2xl overflow-hidden h-full flex flex-col" style={{ background: c.card, border: `1px solid ${c.line}`, boxShadow: c.cardShadow }}>
                    <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ borderBottom: `1px solid ${c.line}` }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F57" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FEBC2E" }} />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#28C840" }} />
                      <span className="ml-2.5 text-[11px] font-semibold" style={{ color: c.muted }}>Diagnóstico Homenz IA</span>
                    </div>
                    <AIBeforeAfter src={cs.image} alt={`Antes e depois de ${cs.name}`} delay={i * 0.18} />
                    <div className="p-5 flex flex-col flex-1">
                      <span className="inline-flex self-start rounded-full px-2.5 py-1 text-[11px] font-bold mb-3" style={{ background: "rgba(0,193,184,0.12)", color: c.teal, border: `1px solid rgba(0,193,184,0.3)` }}>{cs.tag}</span>
                      <p className="text-[14px] leading-relaxed mb-4" style={{ color: c.body }}>“{cs.quote}”</p>
                      <div className="mt-auto pt-3" style={{ borderTop: `1px solid ${c.line}` }}>
                        <div className="text-[14px] font-bold" style={{ color: c.ink }}>{cs.name}</div>
                        <div className="text-[12px]" style={{ color: c.muted }}>{cs.city} · {cs.after}</div>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── PODZ — podcast oficial (carrossel + botões YT/Spotify) ───────────────── */}
        <section id="podcast" className="relative" style={{ background: c.bg, borderTop: `1px solid ${c.line}` }}>
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <Reveal>
              <div className="text-center">
                <span className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-black uppercase tracking-[0.22em] mb-6" style={{ background: "rgba(0,193,184,0.08)", color: c.ink, border: `1px solid rgba(0,193,184,0.22)` }}>
                  <MicrophoneStage weight="fill" className="w-3.5 h-3.5" style={{ color: c.teal }} />
                  PODZ
                </span>
                <h2 className="font-semibold tracking-[-0.025em] text-balance mx-auto max-w-2xl" style={{ fontFamily: DISPLAY, color: c.ink, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.04 }}>
                  O Podcast do Homem de Sucesso
                </h2>
                <p className="mt-4 text-[17px] leading-relaxed max-w-xl mx-auto" style={{ color: c.body }}>
                  Histórias reais de franqueados e especialistas que constroem autoridade na maior rede de estética masculina da América Latina.
                </p>
                <div className="mt-8 flex flex-wrap gap-3 justify-center">
                  <a href={PODZ_SPOTIFY} target="_blank" rel="noopener noreferrer" className={`v2-podbtn ${light ? "v2-light" : ""} inline-flex items-center gap-3 rounded-full pl-4 pr-5 py-3 text-[14px] font-bold`}>
                    <span className="v2-eq" aria-hidden><i /><i /><i /><i /></span>
                    <SpotifyLogo weight="fill" className="w-5 h-5" style={{ color: "#1DB954" }} />
                    Ouvir no Spotify
                  </a>
                  <a href={PODZ_YOUTUBE} target="_blank" rel="noopener noreferrer" className={`v2-podbtn v2-podbtn-yt ${light ? "v2-light" : ""} inline-flex items-center gap-2.5 rounded-full pl-4 pr-5 py-3 text-[14px] font-bold`}>
                    <span className="v2-ytplay" aria-hidden><YoutubeLogo weight="fill" className="w-5 h-5" style={{ color: "#FF0033" }} /></span>
                    Assistir no YouTube
                  </a>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="v2-podrail mt-14 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory">
                {PODZ_EPISODES.map((e) => (
                  <a key={e.id} href={e.href} target="_blank" rel="noopener noreferrer" className="v2-podcard relative shrink-0 snap-start rounded-2xl overflow-hidden" style={{ width: "min(82vw, 420px)", aspectRatio: "16 / 9", border: `1px solid ${c.line}`, boxShadow: c.cardShadow }}>
                    <img src={e.thumb} alt={`Episódio ${e.ep} do PODZ`} loading="lazy" className="v2-podimg absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(4,22,47,0) 38%, rgba(4,22,47,0.5) 100%)" }} />
                    <span className="absolute top-3 left-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider" style={{ background: "rgba(4,22,47,0.6)", color: "#fff", backdropFilter: "blur(6px)", border: `1px solid rgba(255,255,255,0.18)` }}>EP {e.ep}</span>
                    <span className="v2-podplay absolute inset-0 m-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.94)" }}>
                      <Play weight="fill" className="w-5 h-5 ml-0.5" style={{ color: "#0A2540" }} />
                    </span>
                  </a>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────────────── CTA FINAL (banda AZUL Homenz — clímax, igual nos 2 temas) ───────────────── */}
        <section className="relative overflow-hidden" style={{ background: "linear-gradient(158deg, #0A5BB8 0%, #004A9D 54%, #013A7C 100%)" }}>
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(54% 74% at 50% -10%, rgba(0,193,184,0.28), transparent 62%)" }} />
          <div aria-hidden className="absolute inset-0 pointer-events-none opacity-[0.06] mix-blend-soft-light" style={{ backgroundImage: NOISE, backgroundSize: "180px 180px" }} />
          <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider mb-7" style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: `1px solid rgba(255,255,255,0.22)` }}>
                <ShieldCheck weight="fill" className="w-3.5 h-3.5" style={{ color: "#5FE9E0" }} />
                Exclusivo para a rede Homenz
              </span>
              <h2 className="font-semibold tracking-[-0.025em] text-balance mx-auto" style={{ fontFamily: DISPLAY, color: "#fff", fontSize: "clamp(2.2rem, 4.5vw, 3.4rem)", lineHeight: 1.04 }}>
                Sua clínica Homenz merece uma agenda cheia.
              </h2>
              <p className="mt-5 text-[18px] leading-relaxed max-w-xl mx-auto" style={{ color: "rgba(237,243,250,0.74)" }}>
                Fale com a equipe e veja o funil funcionando na sua unidade.
              </p>
              <div className="mt-9 flex flex-wrap gap-3 justify-center">
                <button onClick={goSales} className="v2-cta v2-cta-primary inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-bold" style={{ color: T.tealInk }}>
                  Falar com a equipe
                  <ArrowRight weight="bold" className="v2-cta-arrow w-4 h-4" />
                </button>
                <button onClick={goDemo} className="v2-cta-ghost inline-flex items-center gap-2 rounded-full px-8 py-4 text-[16px] font-bold" style={{ background: "rgba(255,255,255,0.04)", color: "#fff", border: `1px solid ${T.lineStrong}` }}>
                  Ver demo ao vivo
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ───────────────── FOOTER (tema-aware) ───────────────── */}
        <footer style={{ background: c.bg, borderTop: `1px solid ${c.line}` }}>
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <span style={dark ? WORDMARK_DARK : WORDMARK_LIGHT}><FunnelWordmark height={24} /></span>
              <span className="inline-flex items-center text-[10px] font-black rounded px-1.5 py-0.5 leading-none tracking-wide" style={{ background: c.tealFill, color: c.tealInk }}>AI</span>
            </div>
            <div className="flex items-center gap-6 text-[14px] font-semibold" style={{ color: c.body }}>
              <button onClick={() => navigate("/login")} className="py-3 -my-3 v2-nav-link">Entrar</button>
              <button onClick={goSales} className="py-3 -my-3 v2-nav-link">Falar com a equipe</button>
              <button onClick={goDemo} className="py-3 -my-3 v2-nav-link">Demo</button>
            </div>
            <div className="text-[13px]" style={{ color: c.muted }}>© {new Date().getFullYear()} Homenz</div>
          </div>
        </footer>
      </div>
    </IconContext.Provider>
  );
}
