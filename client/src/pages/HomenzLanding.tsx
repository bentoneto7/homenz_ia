import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Brain,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  Star,
  CheckCircle,
  ArrowRight,
  Play,
  Award,
  Target,
  Clock,
  Shield,
  ChevronDown,
} from "lucide-react";

const PHOTOS = {
  // Fotos editadas com tratamento visual Homenz (contraste, vignette, tint azul)
  hero: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/hero_bg_5f0dc1d5.jpg",
  presenting: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/presenting_portrait_727b77f9.jpg",
  podcast: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/podcast_landscape_70883558.jpg",
  office: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/office_bg_282f2a0a.jpg",
  event: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/event_landscape_58110d29.jpg",
  presenting2: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/presenting2_portrait_c9167a3b.jpg",
  lifestyleRunning: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/lifestyle_running_sq_aa5bc95e.jpg",
  lifestyleTennis: "https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/lifestyle_tennis_sq_32e2fef4.jpg",
};

function Counter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    const el = document.getElementById(`counter-${end}-${suffix}`);
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [end, suffix, started]);

  useEffect(() => {
    if (!started) return;
    const step = end / (duration / 16);
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return (
    <span id={`counter-${end}-${suffix}`}>
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

export default function HomenzLanding() {
  const [, navigate] = useLocation();
  const [activeFeature, setActiveFeature] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Mais respostas de interessados",
      desc: "Funil com IA que qualifica o lead automaticamente via chat. O sistema identifica quem está realmente interessado e filtra quem só está curiosando — sua equipe só fala com quem tem potencial real de fechar.",
      highlight: "Leads chegam pré-qualificados, prontos para agendar",
      pillar: "01",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Mais agendamentos na clínica",
      desc: "Sistema de temperatura do lead em tempo real: 🔥 quente, 🌡️ morno ou ❄️ frio. Playbook automático diz exatamente quando ligar, o que falar e quem priorizar. Agenda integrada com confirmação automática.",
      highlight: "Agenda cheia, equipe com foco, zero lead perdido",
      pillar: "02",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Mais faturamento",
      desc: "Cada lead que passa pelo funil já sabe qual protocolo é o ideal para ele. Chega na consulta com expectativa alinhada, pronto para fechar. Sua equipe vende mais porque o sistema já fez a preparação.",
      highlight: "Consultas com maior ticket médio e taxa de conversão",
      pillar: "03",
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Bônus: Ranking de qualidade de tráfego",
      desc: "Score automático 0-100 de cada lead com base no perfil, engajamento e intenção. Saiba exatamente qual campanha, anúncio e público gera os leads mais qualificados — e onde está desperdiçando verba.",
      highlight: "Otimize seu investimento em tráfego pago com dados reais",
      pillar: "★",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Bônus: Ranking de performance dos vendedores",
      desc: "Acompanhe em tempo real o tempo de resposta de cada vendedor, quantos leads abordou, quantos agendou e qual a taxa de conversão. Saiba quem está performando e quem precisa de suporte.",
      highlight: "Gestão de equipe baseada em dados, não em feeling",
      pillar: "★",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Bônus: Ranking de interação do lead no funil",
      desc: "Veja o caminho completo de cada lead: quantas etapas completou, onde parou, quanto tempo ficou em cada fase. Identifique gargalos no funil e melhore a conversão com dados precisos.",
      highlight: "Visibilidade total da jornada do lead até o agendamento",
      pillar: "★",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0f1e]/95 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
               <span className="text-xl font-black tracking-tight text-white">HOMENZ</span>
                <span className="text-xl font-black tracking-tight text-[#00c4cc]"> IA</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                <span className="text-[10px] font-bold text-[#1a56db] uppercase tracking-widest">Homenz Brasil</span>
              </div>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#como-funciona" className="text-sm text-white/60 hover:text-white transition-colors">Como funciona</a>
              <a href="#funcionalidades" className="text-sm text-white/60 hover:text-white transition-colors">Funcionalidades</a>
              <a href="#resultados" className="text-sm text-white/60 hover:text-white transition-colors">Resultados</a>
              <a href="#precos" className="text-sm text-white/60 hover:text-white transition-colors">Planos</a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/c/demo")}
                className="hidden sm:flex text-sm text-white/70 hover:text-white transition-colors"
              >
                Ver demo
              </button>
              <button
                onClick={() => navigate("/cadastro")}
                className="px-4 py-2 rounded-lg bg-[#1a56db] hover:bg-[#1a56db]/90 text-white text-sm font-semibold transition-all hover:scale-105"
              >
                Começar grátis
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src={PHOTOS.hero}
            alt="Homenz"
            className="w-full h-full object-cover object-center opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1e] via-[#0a0f1e]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-transparent to-transparent" />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[#1a56db]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-[#00c4cc]/10 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-3xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a56db]/20 border border-[#1a56db]/30 text-[#60a5fa] text-xs font-semibold uppercase tracking-widest mb-8">
              <Zap className="w-3 h-3" />
              Exclusivo para a rede Homenz
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
              TRANSFORME SUA CLÍNICA EM UMA{" "}
              <span className="relative inline-block">
                <span className="text-[#00c4cc]">MÁQUINA</span>
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-[#1a56db] to-[#00c4cc] rounded-full" />
              </span>
              <br />
              DE AGENDAR CONSULTAS E{" "}
              <span className="text-white">VENDER PROTOCOLOS</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/60 mb-10 leading-relaxed max-w-2xl">
              Funil completo com IA para clínicas Homenz: chat qualificador, análise capilar, visualização 3D, agendamento automático e rastreamento de leads com temperatura em tempo real. O sistema oficial da rede.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <button
                onClick={() => navigate("/cadastro")}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#1a56db] hover:bg-[#1a56db]/90 text-white font-bold text-base transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(26,86,219,0.5)]"
              >
              Ativar minha unidade grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
              <button
                onClick={() => navigate("/c/demo")}
                className="group flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base transition-all"
              >
                <Play className="w-4 h-4 text-[#00c4cc]" />
                Ver demo ao vivo
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-white/40">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#00c4cc]" />
                <span>15 dias grátis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#00c4cc]" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-[#00c4cc]" />
                <span>Configuração em 5 minutos</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="w-6 h-6 text-white/30" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-t border-white/5 bg-[#0d1425]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: 78, suffix: "+", label: "Unidades na rede", sub: "em todo o Brasil" },
              { value: 78400, suffix: "+", label: "Homens atendidos", sub: "pela rede Homenz" },
              { value: 39200, suffix: "+", label: "Procedimentos realizados", sub: "nas unidades da rede" },
              { value: 15, suffix: " dias", label: "Trial gratuito", sub: "sem cartão de crédito" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-black text-white mb-1">
                  <Counter end={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-sm font-semibold text-white/80 mb-0.5">{stat.label}</div>
                <div className="text-xs text-white/40">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-widest mb-6">
                O problema
              </div>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-6">
                SUA CLÍNICA INVESTE EM ANÚNCIOS.
                <br />
                <span className="text-red-400">OS LEADS SOMEM.</span>
              </h2>
              <div className="space-y-4 text-white/60">
                <p className="text-lg leading-relaxed">
                  Você investe em tráfego pago, o lead chega, mas sem um processo estruturado, 70% não vira consulta. Sem rastreamento, você não sabe onde está perdendo.
                </p>
                <p className="text-lg leading-relaxed">
                  A equipe não tem playbook. Não sabe quando ligar, o que falar, quem priorizar. O lead esfria. O dinheiro vai embora.
                </p>
              </div>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Leads sem qualificação chegando para a equipe",
                  "Sem rastreamento de onde o lead parou",
                  "Equipe sem saber quem priorizar",
                  "Dinheiro em anúncio sem ROI claro",
                ].map((pain) => (
                  <div key={pain} className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <span className="text-red-400 mt-0.5 flex-shrink-0">✕</span>
                    <span className="text-sm text-white/60">{pain}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <img
                src={PHOTOS.presenting}
                alt="Luiz Fernando Homenz apresentando"
                className="rounded-2xl w-full object-cover aspect-[4/5] shadow-2xl"
              />
              <div className="absolute -bottom-6 -left-6 bg-[#1a56db] rounded-2xl p-5 shadow-2xl max-w-xs">
                <div className="text-2xl font-black text-white mb-1">+47%</div>
                <div className="text-sm text-white/80">de aumento em consultas agendadas com o Homenz IA</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution / How it works */}
      <section id="como-funciona" className="py-24 bg-[#0d1425] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00c4cc]/10 border border-[#00c4cc]/20 text-[#00c4cc] text-xs font-semibold uppercase tracking-widest mb-6">
              A solução
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              UM LINK. UM FUNIL COMPLETO.
              <br />
              <span className="text-[#00c4cc]">RESULTADOS MENSURÁVEIS.</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Cada unidade Homenz recebe seu link exclusivo para campanhas de tráfego pago. O lead entra no funil e é guiado até o agendamento — tudo automatizado.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                step: "01",
                icon: "🎯",
                title: "Landing Page",
                desc: "Lead clica no anúncio e chega na página da sua unidade com UTMs capturados automaticamente.",
              },
              {
                step: "02",
                icon: "💬",
                title: "Chat com IA",
                desc: "Chatbot qualifica o lead: tipo de calvície, expectativas, histórico. Score automático 0-100.",
              },
              {
                step: "03",
                icon: "📸",
                title: "Fotos 360°",
                desc: "Lead fotografa 4 ângulos da cabeça com guia visual. Enviadas para análise de IA.",
              },
              {
                step: "04",
                icon: "🧠",
                title: "Análise IA",
                desc: "Visualização 3D do resultado esperado + relatório capilar personalizado.",
              },
              {
                step: "05",
                icon: "📅",
                title: "Agendamento",
                desc: "Calendário integrado com disponibilidade real da clínica. Confirmação automática.",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative group">
                <div className="bg-white/3 border border-white/8 rounded-2xl p-5 h-full hover:border-[#1a56db]/40 hover:bg-[#1a56db]/5 transition-all">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="text-xs font-mono text-[#00c4cc] mb-2 uppercase tracking-widest">{item.step}</div>
                  <div className="font-bold text-white mb-2">{item.title}</div>
                  <div className="text-sm text-white/50 leading-relaxed">{item.desc}</div>
                </div>
                {i < 4 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-2 z-10 items-center justify-center w-4 h-4 -translate-y-1/2">
                    <ArrowRight className="w-4 h-4 text-white/20" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => navigate("/c/demo")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all"
            >
              <Play className="w-4 h-4 text-[#00c4cc]" />
              Experimentar o Homenz IA agora
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a56db]/10 border border-[#1a56db]/20 text-[#60a5fa] text-xs font-semibold uppercase tracking-widest mb-6">
              Funcionalidades
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              3 RESULTADOS DIRETOS.
              <br />
              <span className="text-[#1a56db]">MAIS 3 BÔNUS EXCLUSIVOS.</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto mt-4">
              O Homenz IA foi construído para entregar três resultados concretos para a sua unidade — e ainda te dá visibilidade total sobre o que está funcionando e o que não está.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Feature tabs */}
            <div className="space-y-3">
              {features.map((feature, i) => (
                <button
                  key={feature.title}
                  onClick={() => setActiveFeature(i)}
                  className={`w-full text-left p-5 rounded-2xl border transition-all ${
                    activeFeature === i
                      ? "bg-[#1a56db]/10 border-[#1a56db]/40"
                      : "bg-white/3 border-white/8 hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        activeFeature === i ? "bg-[#1a56db] text-white" : "bg-white/5 text-white/40"
                      }`}
                    >
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${feature.pillar === "★" ? "bg-yellow-500/20 text-yellow-400" : "bg-[#1a56db]/30 text-[#60a5fa]"}`}>{feature.pillar}</span>
                        <div className="font-bold text-white">{feature.title}</div>
                      </div>
                      {activeFeature === i && (
                        <div className="text-sm text-white/60 leading-relaxed mt-2">{feature.desc}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Feature highlight */}
            <div className="lg:sticky lg:top-24 h-fit">
              <div className="bg-gradient-to-br from-[#1a56db]/20 to-[#00c4cc]/10 border border-[#1a56db]/20 rounded-3xl p-8">
                <div className="w-14 h-14 rounded-2xl bg-[#1a56db] flex items-center justify-center mb-6 text-white">
                  {features[activeFeature].icon}
                </div>
                <h3 className="text-2xl font-black text-white mb-4">{features[activeFeature].title}</h3>
                <p className="text-white/60 leading-relaxed mb-6">{features[activeFeature].desc}</p>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[#00c4cc]/10 border border-[#00c4cc]/20">
                  <CheckCircle className="w-5 h-5 text-[#00c4cc] flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-[#00c4cc]">{features[activeFeature].highlight}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof / Results */}
      <section id="resultados" className="py-24 bg-[#0d1425] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold uppercase tracking-widest mb-6">
                Resultados reais
              </div>
              <h2 className="text-4xl sm:text-5xl font-black leading-tight mb-8">
                A REDE HOMENZ
                <br />
                <span className="text-[#00c4cc]">JÁ PROVOU.</span>
              </h2>

              <div className="space-y-6">
                {[
                  {
                    metric: "+47%",
                    label: "Aumento em consultas agendadas",
                    desc: "Unidades que usam o Homenz IA convertem mais leads em consultas.",
                    color: "text-[#00c4cc]",
                  },
                  {
                    metric: "3x",
                    label: "Mais leads qualificados",
                    desc: "O chat com IA filtra leads sérios antes de chegarem para a equipe.",
                    color: "text-[#1a56db]",
                  },
                  {
                    metric: "82%",
                    label: "Taxa de comparecimento",
                    desc: "Leads que passam pelo funil completo têm maior comprometimento com a consulta.",
                    color: "text-yellow-400",
                  },
                ].map((result) => (
                  <div key={result.label} className="flex items-start gap-5">
                    <div className={`text-4xl font-black ${result.color} flex-shrink-0 w-20`}>{result.metric}</div>
                    <div>
                      <div className="font-bold text-white mb-1">{result.label}</div>
                      <div className="text-sm text-white/50">{result.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <img
                src={PHOTOS.podcast}
                alt="Homenz no Unocast"
                className="rounded-2xl w-full object-cover aspect-video shadow-2xl"
              />
              <div className="absolute -top-4 -right-4 bg-[#0d1425] border border-white/10 rounded-2xl p-4 shadow-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                </div>
                <div className="text-xs font-bold text-white">Unocast — Podcast</div>
                <div className="text-xs text-white/40">Luiz Fernando Homenz</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <img
                  src={PHOTOS.lifestyleRunning}
                  alt="Estilo de vida Homenz"
                  className="rounded-xl w-full object-cover aspect-square shadow-lg"
                />
                <img
                  src={PHOTOS.lifestyleTennis}
                  alt="Estilo de vida Homenz"
                  className="rounded-xl w-full object-cover aspect-square shadow-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Before-After Section — Clientes Reais */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0a0f1e]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a56db]/10 border border-[#1a56db]/20 text-[#60a5fa] text-xs font-semibold uppercase tracking-widest mb-6">
              Resultados reais dos pacientes
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              ANTES E DEPOIS.
              <br />
              <span className="text-[#00c4cc]">ISSO É O QUE VOCÊ VENDE.</span>
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Cada lead que entra no funil Homenz IA recebe um diagnóstico personalizado — e sai com clareza sobre o protocolo ideal. Veja o que acontece quando o lead certo encontra a clínica certa.
            </p>
          </div>

          {/* Before/After patient cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                name: "Carlos M., 38 anos",
                city: "Uberaba — MG",
                protocol: "Protocolo Capilar Avançado",
                quote: "Fiz o diagnóstico pelo chat e em 15 minutos já sabia exatamente qual protocolo era pra mim. Agendei na hora. Resultado em 4 meses superou o que eu esperava.",
                beforeLabel: "Antes",
                afterLabel: "4 meses depois",
                beforeDesc: "Alopecia androgenética grau III, linha frontal recuada, topo com rarefação visível",
                afterDesc: "Densidade recuperada, linha frontal estabilizada, cobertura uniforme no topo",
                tag: "Transplante + PRP",
                tagColor: "bg-[#1a56db]/20 text-[#60a5fa]",
              },
              {
                name: "Rafael S., 44 anos",
                city: "Uberlândia — MG",
                protocol: "Protocolo de Manutenção",
                quote: "Eu estava desistindo de tratar porque não sabia por onde começar. O sistema me fez as perguntas certas e me encaminhou pro protocolo certo. Simples assim.",
                beforeLabel: "Antes",
                afterLabel: "6 meses depois",
                beforeDesc: "Queda difusa, couro cabeludo com inflamação, fios finos e sem volume",
                afterDesc: "Queda controlada, fios mais grossos, volume visivelmente recuperado",
                tag: "Mesoterapia + Laser",
                tagColor: "bg-[#00c4cc]/20 text-[#00c4cc]",
              },
              {
                name: "Thiago R., 31 anos",
                city: "Belo Horizonte — MG",
                protocol: "Protocolo Preventivo",
                quote: "Cheguei cedo, antes de perder muito. O diagnóstico identificou o risco genético e o protocolo preventivo travou a queda. Hoje mantenho com check-ins mensais.",
                beforeLabel: "Antes",
                afterLabel: "3 meses depois",
                beforeDesc: "Início de miniaturização, queda acima do normal, histórico familiar de calvície",
                afterDesc: "Queda normalizada, miniaturização estabilizada, couro cabeludo saudável",
                tag: "Preventivo + Finasterida",
                tagColor: "bg-yellow-500/20 text-yellow-400",
              },
            ].map((p) => (
              <div key={p.name} className="bg-[#0d1425] border border-white/8 rounded-3xl overflow-hidden flex flex-col">
                {/* Before/After visual */}
                <div className="grid grid-cols-2 h-44 relative">
                  {/* Before */}
                  <div className="bg-gradient-to-br from-[#1a0a0a] to-[#2a1010] flex flex-col items-center justify-center p-4 relative">
                    <div className="absolute top-2 left-2 bg-red-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {p.beforeLabel}
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                      <svg viewBox="0 0 40 40" className="w-10 h-10 opacity-30" fill="none">
                        <ellipse cx="20" cy="14" rx="10" ry="9" fill="#888" />
                        <path d="M8 36c0-7 5-12 12-12s12 5 12 12" fill="#888" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-white/40 text-center leading-tight">{p.beforeDesc}</p>
                  </div>
                  {/* Divider arrow */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-[#0d1425] border border-white/20 flex items-center justify-center">
                    <span className="text-white/60 text-xs font-bold">→</span>
                  </div>
                  {/* After */}
                  <div className="bg-gradient-to-br from-[#0a1a0f] to-[#0d2518] flex flex-col items-center justify-center p-4 relative">
                    <div className="absolute top-2 right-2 bg-[#00c4cc]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {p.afterLabel}
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/5 border border-[#00c4cc]/30 flex items-center justify-center mb-2">
                      <svg viewBox="0 0 40 40" className="w-10 h-10 opacity-70" fill="none">
                        <ellipse cx="20" cy="14" rx="10" ry="9" fill="#00c4cc" />
                        <path d="M8 36c0-7 5-12 12-12s12 5 12 12" fill="#00c4cc" />
                        <path d="M13 10 Q17 5 20 10 Q23 5 27 10" stroke="#fff" strokeWidth="1.5" fill="none" />
                      </svg>
                    </div>
                    <p className="text-[10px] text-white/60 text-center leading-tight">{p.afterDesc}</p>
                  </div>
                </div>

                {/* Protocol tag */}
                <div className="px-5 pt-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${p.tagColor}`}>
                    {p.tag}
                  </span>
                </div>

                {/* Quote */}
                <div className="p-5 flex-1">
                  <p className="text-sm text-white/70 leading-relaxed italic mb-4">"{p.quote}"</p>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[0,1,2,3,4].map((i) => (
                        <Star key={i} className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="text-white/30 text-xs"> · {p.city}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA bar */}
          <div className="bg-gradient-to-r from-[#1a56db]/20 via-[#0d1425] to-[#00c4cc]/20 border border-white/8 rounded-2xl p-6 text-center">
            <p className="text-white/60 text-sm mb-2">Cada lead que entra no funil Homenz IA passa por um diagnóstico personalizado antes de chegar na sua equipe.</p>
            <p className="font-bold text-white">Ele chega pronto. A sua clínica só precisa confirmar o agendamento.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precos" className="py-24 bg-[#0d1425] px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00c4cc]/10 border border-[#00c4cc]/20 text-[#00c4cc] text-xs font-semibold uppercase tracking-widest mb-6">
              Planos
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4">
              15 DIAS GRÁTIS.
              <br />
              <span className="text-[#00c4cc]">SEM CARTÃO. SEM RISCO.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {[
              {
                name: "Grátis",
                price: "R$ 0",
                period: "/sempre",
                desc: "Para começar a testar o sistema sem risco.",
                badge: null,
                features: [
                  "1 vendedor na equipe",
                  "30 leads por mês",
                  "Funil com IA básico",
                  "Chat qualificador",
                  "Dashboard da unidade",
                  "Score de leads",
                ],
                limit: "1 vendedor · 30 leads/mês",
                cta: "Começar grátis",
                highlight: false,
                ctaAction: "cadastro",
              },
              {
                name: "Unidade",
                price: "R$ 897",
                period: "/mês",
                desc: "Para unidades que querem transformar tráfego pago em consultas agendadas.",
                badge: "15 dias grátis",
                features: [
                  "Até 5 vendedores",
                  "Leads ilimitados",
                  "Funil completo com IA",
                  "Análise capilar + 3D",
                  "Agendamento integrado",
                  "Rastreamento de temperatura",
                  "Ranking de vendedores",
                  "Captura automática de UTMs",
                ],
                limit: "5 vendedores · leads ilimitados",
                cta: "Ativar 15 dias grátis",
                highlight: false,
                ctaAction: "cadastro",
              },
              {
                name: "Unidade Pro",
                price: "R$ 1.497",
                period: "/mês",
                desc: "Para unidades que querem máxima performance e visibilidade na rede.",
                badge: "Mais popular",
                features: [
                  "Vendedores ilimitados",
                  "Leads ilimitados",
                  "Tudo do plano Unidade",
                  "Ranking de qualidade de tráfego",
                  "Ranking de interação do lead",
                  "Health score S/A/B/C/D/F",
                  "Playbook automático",
                  "Analytics avançado",
                  "Suporte prioritário",
                ],
                limit: "Vendedores ilimitados · leads ilimitados",
                cta: "Ativar 15 dias grátis",
                highlight: true,
                ctaAction: "cadastro",
              },
              {
                name: "Rede",
                price: "Sob consulta",
                period: "",
                desc: "Para franqueadores que querem gerenciar e rankear toda a rede Homenz.",
                badge: null,
                features: [
                  "Todas as unidades da rede",
                  "Tudo do plano Pro",
                  "Painel Admin consolidado",
                  "Ranking da rede em tempo real",
                  "Relatórios por unidade e rede",
                  "Suporte dedicado",
                  "Onboarding personalizado",
                ],
                limit: "Rede completa",
                cta: "Falar com a equipe",
                highlight: false,
                ctaAction: "demo",
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-7 flex flex-col ${
                  plan.highlight
                    ? "bg-[#1a56db] border border-[#1a56db]"
                    : "bg-white/3 border border-white/8"
                }`}
              >
                {plan.badge && (
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap ${plan.highlight ? "bg-[#00c4cc] text-[#0a0f1e]" : "bg-white/10 text-white/70"}`}>
                    {plan.badge}
                  </div>
                )}
                <div className="mb-5">
                  <div className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-2">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{plan.price}</span>
                    <span className="text-white/50 text-sm">{plan.period}</span>
                  </div>
                  <div className="text-xs text-white/50 mt-2">{plan.desc}</div>
                  <div className={`mt-3 text-[10px] font-bold px-2 py-1 rounded-lg inline-block ${plan.highlight ? "bg-white/20 text-white" : "bg-white/5 text-white/50"}`}>
                    {plan.limit}
                  </div>
                </div>
                <div className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle className={`w-3.5 h-3.5 flex-shrink-0 ${plan.highlight ? "text-white" : "text-[#00c4cc]"}`} />
                      <span className="text-xs text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => navigate(plan.ctaAction === "demo" ? "/c/demo" : "/cadastro")}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                    plan.highlight
                      ? "bg-white text-[#1a56db] hover:bg-white/90"
                      : "bg-white/5 hover:bg-white/10 border border-white/10 text-white"
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-white/40">
              Todos os planos incluem <span className="text-[#00c4cc] font-semibold">15 dias grátis</span>. Sem cartão de crédito. Cancele quando quiser.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={PHOTOS.office}
            alt="Homenz"
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/90 to-[#0a0f1e]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a56db]/20 border border-[#1a56db]/30 text-[#60a5fa] text-xs font-semibold uppercase tracking-widest mb-8">
            <Shield className="w-3 h-3" />
            15 dias grátis, sem compromisso
          </div>
          <h2 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
            SUA UNIDADE MERECE
            <br />
            <span className="text-[#00c4cc]">O MELHOR SISTEMA.</span>
          </h2>
          <p className="text-lg text-white/50 mb-10">
            Ative o Homenz IA na sua unidade hoje. Configure em 5 minutos, gere seu link exclusivo e comece a converter tráfego pago em consultas agendadas.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/cadastro")}
              className="group flex items-center justify-center gap-2 px-10 py-5 rounded-xl bg-[#1a56db] hover:bg-[#1a56db]/90 text-white font-black text-lg transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(26,86,219,0.5)]"
            >
              Ativar minha unidade grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/c/demo")}
              className="flex items-center justify-center gap-2 px-10 py-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg transition-all"
            >
              <Play className="w-5 h-5 text-[#00c4cc]" />
              Ver demo primeiro
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-lg font-black text-white">HOMENZ</span>
                <span className="text-lg font-black text-[#00c4cc]"> IA</span>
              </div>

            </div>
            <div className="flex items-center gap-8 text-sm text-white/30">
              <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
              <a href="#funcionalidades" className="hover:text-white transition-colors">Funcionalidades</a>
              <a href="#precos" className="hover:text-white transition-colors">Planos</a>
              <a href="/c/demo" className="hover:text-white transition-colors">Demo</a>
            </div>
            <p className="text-xs text-white/20">
              © 2026 Homenz IA. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
