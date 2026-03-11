import { useState } from "react";
import { useLocation } from "wouter";
import {
  Brain,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  Star,
  CheckCircle,
  ArrowRight,
  Target,
  Clock,
  Shield,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  Calendar,
  Thermometer,
  Award,
} from "lucide-react";

// Fotos CDN
const PHOTOS = {
  hairTreatment: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/hero_bg_5f0dc1d5.jpg",
  presenting: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/presenting_portrait_727b77f9.jpg",
  presenting2: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/presenting2_portrait_c9167a3b.jpg",
  event: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/event_landscape_58110d29.jpg",
};

// ─── Hero photo cards (estilo site oficial Homenz) ───
const HERO_CARDS = [
  {
    img: PHOTOS.hairTreatment,
    title: "Queda de Cabelo",
    sub: "PREENCHIMENTO CAPILAR",
  },
  {
    img: PHOTOS.presenting,
    title: "Diagnóstico IA",
    sub: "ANÁLISE 3D PERSONALIZADA",
  },
  {
    img: PHOTOS.event,
    title: "Rede Homenz",
    sub: "FRANQUIAS EM EXPANSÃO",
  },
];

// ─── Features do funil ───
const FEATURES = [
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: "Chat Qualificador IA",
    desc: "O lead responde um diagnóstico guiado por IA antes de chegar na sua equipe. Chega pronto, qualificado e com protocolo indicado.",
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: "Diagnóstico Capilar 3D",
    desc: "Análise visual do grau de calvície com mapeamento de protocolo ideal. O lead vê o resultado e quer agendar na hora.",
  },
  {
    icon: <Thermometer className="w-6 h-6" />,
    title: "Temperatura do Lead",
    desc: "Rastreamento em tempo real: 🔥 quente, 🌡️ morno, ❄️ frio. Sua equipe age no momento certo, sem perder oportunidade.",
  },
  {
    icon: <Calendar className="w-6 h-6" />,
    title: "Agendamento Integrado",
    desc: "Do chat ao calendário em um clique. Sem planilha, sem WhatsApp manual. O sistema agenda e confirma automaticamente.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Analytics do Funil",
    desc: "Taxa de conversão, tempo de resposta, ranking de vendedores. Você vê exatamente onde está perdendo dinheiro.",
  },
  {
    icon: <Award className="w-6 h-6" />,
    title: "Ranking da Rede",
    desc: "Health score da sua unidade (S/A/B/C/D/F) e posição no ranking Homenz. Gamificação que move a equipe.",
  },
];

// ─── Antes/depois capilares ───
const CASES = [
  {
    name: "Carlos M., 38 anos",
    city: "Uberaba — MG",
    beforeLabel: "ANTES",
    afterLabel: "4 MESES DEPOIS",
    tag: "Preenchimento Capilar + PRP",
    tagColor: "bg-[#004A9D] text-white",
    quote: "Fiz o diagnóstico pelo chat e em 15 minutos já sabia exatamente qual protocolo era pra mim. Agendei na hora. Resultado em 4 meses superou o que eu esperava.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-1_55ef2687.png",
  },
  {
    name: "Rafael S., 44 anos",
    city: "Uberlândia — MG",
    beforeLabel: "ANTES",
    afterLabel: "6 MESES DEPOIS",
    tag: "Mesoterapia Capilar + Laser",
    tagColor: "bg-[#00C1B8] text-white",
    quote: "Eu estava desistindo de tratar porque não sabia por onde começar. O sistema me fez as perguntas certas e me encaminhou pro protocolo certo. Simples assim.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-2_1fdad418.png",
  },
  {
    name: "Thiago R., 31 anos",
    city: "Belo Horizonte — MG",
    beforeLabel: "ANTES",
    afterLabel: "3 MESES DEPOIS",
    tag: "Protocolo Preventivo",
    tagColor: "bg-[#F59E0B] text-white",
    quote: "Cheguei cedo, antes de perder muito. O diagnóstico identificou o risco genético e o protocolo preventivo travou a queda. Hoje mantenho com check-ins mensais.",
    image: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/before-after-3_4a0fbbcb.png",
  },
];

// ─── Planos ───
const PLANS = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "",
    desc: "Para começar a testar o sistema sem risco.",
    limit: "1 vendedor · 30 leads/mês",
    features: ["1 vendedor na equipe", "30 leads por mês", "Funil com IA básico", "Chat qualificador", "Dashboard da unidade", "Score de leads"],
    cta: "Começar grátis",
    ctaAction: "cadastro",
    highlight: false,
    badge: null,
  },
  {
    name: "Unidade",
    price: "R$ 897",
    period: "/mês",
    desc: "Para unidades que querem transformar tráfego pago em consultas agendadas.",
    limit: "5 vendedores · leads ilimitados",
    features: ["Até 5 vendedores", "Leads ilimitados", "Funil completo com IA", "Análise capilar + 3D", "Agendamento integrado", "Rastreamento de temperatura", "Ranking de vendedores", "Captura automática de UTMs"],
    cta: "Ativar 15 dias grátis",
    ctaAction: "cadastro",
    highlight: false,
    badge: "15 DIAS GRÁTIS",
  },
  {
    name: "Unidade Pro",
    price: "R$ 1.497",
    period: "/mês",
    desc: "Para franqueados que querem máxima performance e visibilidade na rede Homenz.",
    limit: "Vendedores ilimitados · leads ilimitados",
    features: [
      "Vendedores ilimitados",
      "Leads ilimitados",
      "Tudo do plano Unidade",
      "IA de diagnóstico capilar 3D",
      "Score de lead 0-100 automático",
      "Temperatura do lead em tempo real",
      "Playbook de ação por etapa",
      "Health score da unidade (S/A/B/C/D/F)",
      "Ranking da rede Homenz em tempo real",
      "Analytics: funil + tempo de resposta",
      "Suporte prioritário via WhatsApp",
    ],
    cta: "Ativar 15 dias grátis",
    ctaAction: "cadastro",
    highlight: true,
    badge: "MAIS POPULAR",
  },
  {
    name: "Rede",
    price: "Sob consulta",
    period: "",
    desc: "Para franqueadores que querem gerenciar e rankear toda a rede Homenz.",
    limit: "Rede completa",
    features: ["Todas as unidades da rede", "Tudo do plano Pro", "Painel Admin consolidado", "Ranking da rede em tempo real", "Relatórios por unidade e rede", "Suporte dedicado", "Onboarding personalizado"],
    cta: "Falar com a equipe",
    ctaAction: "demo",
    highlight: false,
    badge: null,
  },
];

// ─── SVG Calvície (antes) ───
function HairLossSVG() {
  return (
    <svg viewBox="0 0 80 90" className="w-24 h-28" fill="none">
      {/* Cabeça */}
      <ellipse cx="40" cy="45" rx="28" ry="34" fill="#F5D0A9" />
      {/* Topo com calvície visível */}
      <ellipse cx="40" cy="18" rx="20" ry="10" fill="#E8B88A" opacity="0.6" />
      {/* Linha frontal recuada */}
      <path d="M22 28 Q30 22 40 21 Q50 22 58 28" stroke="#8B5E3C" strokeWidth="1.5" fill="none" />
      {/* Cabelo lateral esquerdo */}
      <path d="M13 38 Q15 30 22 28" stroke="#5C3A1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M12 42 Q14 34 20 30" stroke="#5C3A1E" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Cabelo lateral direito */}
      <path d="M67 38 Q65 30 58 28" stroke="#5C3A1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M68 42 Q66 34 60 30" stroke="#5C3A1E" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Rarefação no topo */}
      <path d="M32 24 Q36 20 40 21" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M48 24 Q44 20 40 21" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.5" />
      {/* Olhos */}
      <ellipse cx="31" cy="50" rx="4" ry="3" fill="#3D2B1F" />
      <ellipse cx="49" cy="50" rx="4" ry="3" fill="#3D2B1F" />
      <circle cx="32" cy="49" r="1" fill="white" />
      <circle cx="50" cy="49" r="1" fill="white" />
      {/* Nariz */}
      <path d="M38 56 Q40 59 42 56" stroke="#8B5E3C" strokeWidth="1.2" fill="none" />
      {/* Boca neutra */}
      <path d="M34 65 Q40 68 46 65" stroke="#8B5E3C" strokeWidth="1.5" fill="none" />
      {/* Barba leve */}
      <path d="M26 68 Q28 72 32 74" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M54 68 Q52 72 48 74" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.4" />
    </svg>
  );
}

// ─── SVG Cabelo Recuperado (depois) ───
function HairFullSVG() {
  return (
    <svg viewBox="0 0 80 90" className="w-24 h-28" fill="none">
      {/* Cabeça */}
      <ellipse cx="40" cy="47" rx="28" ry="34" fill="#F5D0A9" />
      {/* Cabelo cheio no topo */}
      <path d="M14 35 Q16 18 28 13 Q34 10 40 10 Q46 10 52 13 Q64 18 66 35" fill="#5C3A1E" />
      {/* Textura do cabelo */}
      <path d="M18 32 Q20 22 28 16" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M62 32 Q60 22 52 16" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M30 12 Q35 8 40 10" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M50 12 Q45 8 40 10" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.5" />
      {/* Linha frontal definida */}
      <path d="M18 34 Q28 26 40 25 Q52 26 62 34" stroke="#3D2010" strokeWidth="1" fill="none" />
      {/* Brilho no cabelo */}
      <path d="M28 16 Q34 12 40 13" stroke="#8B6040" strokeWidth="1.5" fill="none" opacity="0.6" />
      {/* Olhos */}
      <ellipse cx="31" cy="52" rx="4" ry="3" fill="#3D2B1F" />
      <ellipse cx="49" cy="52" rx="4" ry="3" fill="#3D2B1F" />
      <circle cx="32" cy="51" r="1" fill="white" />
      <circle cx="50" cy="51" r="1" fill="white" />
      {/* Nariz */}
      <path d="M38 58 Q40 61 42 58" stroke="#8B5E3C" strokeWidth="1.2" fill="none" />
      {/* Sorriso */}
      <path d="M34 67 Q40 72 46 67" stroke="#8B5E3C" strokeWidth="1.5" fill="none" />
      {/* Barba */}
      <path d="M26 70 Q28 74 32 76" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.4" />
      <path d="M54 70 Q52 74 48 76" stroke="#8B5E3C" strokeWidth="1" fill="none" opacity="0.4" />
    </svg>
  );
}

export default function HomenzLanding() {
  const [, navigate] = useLocation();
  const [heroSlide, setHeroSlide] = useState(0);

  return (
    <div className="min-h-screen font-['Montserrat',sans-serif]" style={{ background: "linear-gradient(160deg, #e8f4f8 0%, #f0f8ff 30%, #ffffff 60%, #f8fffe 100%)" }}>

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <span className="text-[#004A9D] font-black text-xl tracking-tight">HOMENZ <span className="text-[#00C1B8]">IA</span></span>
            <span className="hidden sm:inline-block text-[10px] font-bold text-[#004A9D] border border-[#004A9D]/30 rounded-full px-2 py-0.5 uppercase tracking-widest">Homenz Brasil</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-[#004A9D]">
            <button onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-[#00C1B8] transition-colors">Como funciona</button>
            <button onClick={() => document.getElementById("funcionalidades")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-[#00C1B8] transition-colors">Funcionalidades</button>
            <button onClick={() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-[#00C1B8] transition-colors">Resultados</button>
            <button onClick={() => document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-[#00C1B8] transition-colors">Planos</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-[#004A9D] hover:text-[#00C1B8] transition-colors">
              Logar agora
            </button>
            <button
              onClick={() => navigate("/cadastro")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, #004A9D 0%, #00C1B8 100%)" }}
            >
              Começar grátis
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Decoração de fundo — sem foto, só formas geométricas suaves */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute right-0 top-0 w-[55%] h-full opacity-10" style={{ background: "radial-gradient(ellipse at 80% 40%, #004A9D 0%, transparent 70%)" }} />
          <div className="absolute left-1/4 bottom-0 w-96 h-96 rounded-full opacity-5" style={{ background: "#00C1B8" }} />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Texto esquerdo */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004A9D]/10 border border-[#004A9D]/20 text-[#004A9D] text-xs font-bold uppercase tracking-widest mb-6">
                <Zap className="w-3 h-3 text-[#00C1B8]" />
                Exclusivo para a rede Homenz
              </div>
              <h1 className="text-5xl sm:text-6xl font-black text-[#004A9D] leading-tight mb-4">
                Transforme sua<br />
                clínica em uma<br />
                <span className="text-[#00C1B8]">máquina</span> de<br />
                agendar consultas.
              </h1>
              <p className="text-lg text-[#5A667A] mb-8 max-w-md">
                Funil completo com IA para clínicas Homenz: chat qualificador, diagnóstico capilar, agendamento automático e rastreamento de leads em tempo real.
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={() => navigate("/cadastro")}
                  className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base text-white transition-all hover:opacity-90 active:scale-95 shadow-lg"
                  style={{ background: "linear-gradient(135deg, #00C1B8 0%, #009B93 100%)" }}
                >
                  Agendar demonstração
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate("/c/demo")}
                  className="flex items-center gap-2 px-8 py-4 rounded-full font-bold text-base text-[#004A9D] bg-white border-2 border-[#004A9D]/20 hover:border-[#004A9D]/50 transition-all"
                >
                  Ver demo ao vivo
                </button>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-[#5A667A]">
                {["15 dias grátis", "Sem cartão de crédito", "Configuração em 5 min"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-[#00C1B8]" />
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cards de foto direita — estilo site oficial */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="flex gap-3 items-end">
                {HERO_CARDS.map((card, i) => (
                  <div
                    key={card.title}
                    className="relative rounded-2xl overflow-hidden shadow-xl flex-shrink-0 cursor-pointer transition-all duration-300"
                    style={{
                      width: i === 0 ? 180 : i === 1 ? 160 : 140,
                      height: i === 0 ? 420 : i === 1 ? 380 : 340,
                      transform: i === 1 ? "translateY(-20px)" : i === 2 ? "translateY(-10px)" : "none",
                    }}
                    onClick={() => setHeroSlide(i)}
                  >
                    <img src={card.img} alt={card.title} className="w-full h-full object-cover" />
                    {/* Legenda — gradiente apenas na parte inferior do card */}
                    <div className="absolute bottom-0 left-0 right-0 p-4" style={{ background: "linear-gradient(to top, rgba(0,74,157,0.92) 0%, transparent 100%)" }}>
                      <div className="text-white font-black text-sm leading-tight">{card.title}</div>
                      <div className="text-[#00C1B8] text-[10px] font-bold uppercase tracking-wider mt-0.5">{card.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Navegação */}
              <div className="absolute bottom-4 right-0 flex items-center gap-3">
                <button onClick={() => setHeroSlide((p) => (p - 1 + HERO_CARDS.length) % HERO_CARDS.length)} className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#004A9D] hover:bg-[#004A9D] hover:text-white transition-all shadow-sm">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-[#5A667A]">0{heroSlide + 1} / 0{HERO_CARDS.length}</span>
                <button onClick={() => setHeroSlide((p) => (p + 1) % HERO_CARDS.length)} className="w-8 h-8 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#004A9D] hover:bg-[#004A9D] hover:text-white transition-all shadow-sm">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MÉTRICAS ── */}
      <section className="py-12 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { value: "+47%", label: "Consultas agendadas", sub: "Média das unidades ativas" },
            { value: "<8min", label: "Tempo de resposta", sub: "Top vendedores da rede" },
            { value: "82%", label: "Taxa de comparecimento", sub: "Leads pelo funil completo" },
            { value: "3x", label: "Mais leads qualificados", sub: "IA filtra antes da equipe" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-3xl font-black text-[#004A9D] mb-1">{m.value}</div>
              <div className="text-sm font-bold text-[#0A2540]">{m.label}</div>
              <div className="text-xs text-[#5A667A] mt-0.5">{m.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004A9D]/10 border border-[#004A9D]/20 text-[#004A9D] text-xs font-bold uppercase tracking-widest mb-4">
              Como funciona
            </div>
            <h2 className="text-4xl font-black text-[#004A9D] mb-3">Do lead ao agendamento.<br /><span className="text-[#00C1B8]">Automático.</span></h2>
            <p className="text-[#5A667A] max-w-xl mx-auto">O funil Homenz IA transforma visitantes do seu tráfego pago em consultas confirmadas — sem intervenção manual da sua equipe.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", icon: <MessageCircle className="w-6 h-6" />, title: "Lead entra no chat", desc: "O visitante clica no anúncio e cai direto no chat qualificador IA da sua clínica." },
              { step: "02", icon: <Brain className="w-6 h-6" />, title: "Diagnóstico capilar", desc: "A IA faz as perguntas certas, mapeia o grau de calvície e indica o protocolo ideal." },
              { step: "03", icon: <Calendar className="w-6 h-6" />, title: "Agendamento automático", desc: "O lead escolhe data e horário direto no chat. Confirmação automática por WhatsApp." },
              { step: "04", icon: <TrendingUp className="w-6 h-6" />, title: "Sua equipe vende", desc: "O vendedor recebe o lead com diagnóstico, protocolo e temperatura. Só precisa fechar." },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl font-black text-[#004A9D]/10">{s.step}</span>
                  <div className="w-10 h-10 rounded-xl bg-[#004A9D]/10 flex items-center justify-center text-[#004A9D]">{s.icon}</div>
                </div>
                <h3 className="font-black text-[#0A2540] mb-2">{s.title}</h3>
                <p className="text-sm text-[#5A667A] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ── */}
      <section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00C1B8]/10 border border-[#00C1B8]/20 text-[#00C1B8] text-xs font-bold uppercase tracking-widest mb-4">
              Funcionalidades
            </div>
            <h2 className="text-4xl font-black text-[#004A9D] mb-3">Tudo que sua clínica precisa.<br /><span className="text-[#00C1B8]">Em um só lugar.</span></h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#F8FAFC] rounded-2xl p-6 border border-[#E2E8F0] hover:border-[#004A9D]/30 hover:shadow-md transition-all group">
                <div className="w-12 h-12 rounded-xl bg-[#004A9D]/10 flex items-center justify-center text-[#004A9D] mb-4 group-hover:bg-[#004A9D] group-hover:text-white transition-all">
                  {f.icon}
                </div>
                <h3 className="font-black text-[#0A2540] mb-2">{f.title}</h3>
                <p className="text-sm text-[#5A667A] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RESULTADOS / ANTES E DEPOIS ── */}
      <section id="resultados" className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(180deg, #f0f8ff 0%, #ffffff 100%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004A9D]/10 border border-[#004A9D]/20 text-[#004A9D] text-xs font-bold uppercase tracking-widest mb-4">
              Resultados reais dos pacientes
            </div>
            <h2 className="text-4xl font-black text-[#004A9D] mb-3">Antes e depois.<br /><span className="text-[#00C1B8]">Isso é o que você vende.</span></h2>
            <p className="text-[#5A667A] max-w-xl mx-auto">Cada lead que entra no funil Homenz IA recebe um diagnóstico personalizado — e sai com clareza sobre o protocolo ideal.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {CASES.map((c) => (
              <div key={c.name} className="bg-white rounded-3xl overflow-hidden border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow flex flex-col">
                {/* Antes/Depois visual — foto real */}
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={c.image}
                    alt={`Antes e depois ${c.name}`}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow">{c.beforeLabel}</span>
                  <span className="absolute top-2 right-2 bg-[#00C1B8] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow">{c.afterLabel}</span>
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-[#E2E8F0] flex items-center justify-center shadow-md z-10">
                    <span className="text-[#004A9D] text-sm font-black">→</span>
                  </div>
                </div>
                {/* Tag protocolo */}
                <div className="px-5 pt-4">
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide ${c.tagColor}`}>{c.tag}</span>
                </div>
                {/* Quote */}
                <div className="p-5 flex-1">
                  <p className="text-sm text-[#374151] leading-relaxed italic mb-4">"{c.quote}"</p>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[0,1,2,3,4].map((i) => <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                    </div>
                    <div>
                      <span className="font-bold text-[#0A2540] text-xs">{c.name}</span>
                      <span className="text-[#5A667A] text-xs"> · {c.city}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-[#EBF4FF] border border-[#004A9D]/20 rounded-2xl p-6 text-center">
            <p className="text-[#374151] text-sm mb-1">Cada lead que entra no funil Homenz IA passa por um diagnóstico personalizado antes de chegar na sua equipe.</p>
            <p className="font-bold text-[#004A9D]">Ele chega pronto. A sua clínica só precisa confirmar o agendamento.</p>
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#004A9D]/10 border border-[#004A9D]/20 text-[#004A9D] text-xs font-bold uppercase tracking-widest mb-4">
              Planos
            </div>
            <h2 className="text-4xl font-black text-[#004A9D] mb-3">15 dias grátis.<br /><span className="text-[#00C1B8]">Sem cartão. Sem risco.</span></h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 flex flex-col border transition-all ${
                  plan.highlight
                    ? "border-[#004A9D] shadow-xl"
                    : "border-[#E2E8F0] bg-[#F8FAFC] hover:border-[#004A9D]/30 hover:shadow-md"
                }`}
                style={plan.highlight ? { background: "linear-gradient(160deg, #004A9D 0%, #003580 100%)" } : {}}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${plan.highlight ? "bg-[#00C1B8] text-white" : "bg-[#004A9D] text-white"}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-5">
                  <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? "text-white/70" : "text-[#5A667A]"}`}>{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${plan.highlight ? "text-white" : "text-[#0A2540]"}`}>{plan.price}</span>
                    <span className={`text-sm ${plan.highlight ? "text-white/70" : "text-[#5A667A]"}`}>{plan.period}</span>
                  </div>
                  <div className={`text-xs mt-2 ${plan.highlight ? "text-white/80" : "text-[#5A667A]"}`}>{plan.desc}</div>
                  <div className={`mt-3 text-[10px] font-bold px-2 py-1 rounded-lg inline-block ${plan.highlight ? "bg-white/20 text-white" : "bg-white border border-[#E2E8F0] text-[#5A667A]"}`}>
                    {plan.limit}
                  </div>
                </div>
                <div className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${plan.highlight ? "text-[#00C1B8]" : "text-[#00C1B8]"}`} />
                      <span className={`text-xs ${plan.highlight ? "text-white" : "text-[#374151]"}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(plan.ctaAction === "demo" ? "/c/demo" : "/cadastro")}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-[#00C1B8] text-white hover:bg-[#009B93]"
                      : "bg-[#004A9D] text-white hover:bg-[#003580]"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          {/* Bloco de ROI */}
          <div className="bg-[#F0F8FF] border border-[#004A9D]/20 rounded-2xl p-6 max-w-3xl mx-auto">
            <h3 className="text-lg font-black text-[#004A9D] mb-2 text-center">O plano Pro se paga com 1 protocolo a mais por mês.</h3>
            <p className="text-sm text-[#5A667A] text-center mb-5">
              Um protocolo de preenchimento capilar custa em média R$ 2.500. Com o Homenz IA, sua equipe aborda o lead certo, na hora certa. Um agendamento a mais por mês já cobre o investimento.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: "💰", value: "R$ 2.500", label: "Ticket médio do protocolo" },
                { icon: "⚡", value: "1 consulta", label: "A mais por mês" },
                { icon: "✅", value: "ROI positivo", label: "Já no 1º mês" },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="font-black text-[#004A9D] text-sm">{item.value}</div>
                  <div className="text-xs text-[#5A667A]">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-[#5A667A]">
              Todos os planos incluem <span className="text-[#00C1B8] font-semibold">15 dias grátis</span>. Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 px-4 sm:px-6 lg:px-8" style={{ background: "linear-gradient(135deg, #004A9D 0%, #003580 60%, #00C1B8 100%)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-white text-xs font-bold uppercase tracking-widest mb-8">
            <Shield className="w-3 h-3" />
            15 dias grátis, sem compromisso
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
            Sua clínica Homenz<br />merece uma agenda cheia.
          </h2>
          <p className="text-white/80 text-lg mb-10">
            Ative agora e veja o funil funcionando em menos de 5 minutos.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/cadastro")}
              className="flex items-center gap-2 px-10 py-5 rounded-full bg-[#00C1B8] hover:bg-[#009B93] text-white font-bold text-lg transition-all shadow-xl group"
            >
              Ativar minha unidade grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/c/demo")}
              className="flex items-center gap-2 px-10 py-5 rounded-full bg-white hover:bg-[#EBF4FF] text-[#004A9D] font-bold text-lg transition-all"
            >
              Ver demo primeiro
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-white border-t border-[#E2E8F0] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-[#004A9D] font-black text-lg">HOMENZ <span className="text-[#00C1B8]">IA</span></span>
            <p className="text-xs text-[#5A667A] mt-1">Sistema oficial de funil para a rede Homenz Brasil</p>
          </div>
          <div className="flex gap-6 text-sm text-[#5A667A]">
            <button onClick={() => navigate("/login")} className="hover:text-[#004A9D] transition-colors">Login</button>
            <button onClick={() => navigate("/cadastro")} className="hover:text-[#004A9D] transition-colors">Cadastro</button>
            <button onClick={() => navigate("/c/demo")} className="hover:text-[#004A9D] transition-colors">Demo</button>
          </div>
          <p className="text-xs text-[#5A667A]">© 2026 Homenz Brasil. Todos os direitos reservados.</p>
        </div>
      </footer>

    </div>
  );
}
