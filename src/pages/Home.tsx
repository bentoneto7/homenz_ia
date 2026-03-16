import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Scissors, BarChart3, Calendar, Bell, Users, Zap, ChevronRight, Star } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  // SEO: define título e palavras-chave via JS (sobrescreve qualquer valor padrão da plataforma)
  useEffect(() => {
    const SEO_TITLE = "Homenz.ia — Funil de Leads para Clínicas Capilares";
    const SEO_KEYWORDS = "clínica capilar, implante capilar, queda de cabelo, tratamento capilar, diagnóstico capilar, agendamento consulta capilar, funil de leads, tráfego pago clínica";

    document.title = SEO_TITLE;

    // Garantir que a meta keywords existe e está atualizada
    let metaKw = document.querySelector('meta[name="keywords"]') as HTMLMetaElement | null;
    if (!metaKw) {
      metaKw = document.createElement('meta');
      metaKw.setAttribute('name', 'keywords');
      document.head.appendChild(metaKw);
    }
    metaKw.setAttribute('content', SEO_KEYWORDS);

    return () => { document.title = "Homenz.ia"; };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#0A2540]" />
            </div>
            <span className="font-bold text-lg text-gradient-gold">CapilarIA</span>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/painel")} className="gradient-gold text-white border-0">
                Meu Painel
              </Button>
            ) : (
              <>
                <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Entrar
                </a>
                <Button onClick={() => navigate("/cadastro")} className="gradient-gold text-white border-0">
                  Começar grátis
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            15 dias grátis — sem cartão de crédito
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
            Transforme visitantes em{"\ "}
            <span className="text-gradient-gold">consultas agendadas</span>{"\ "}
            com IA
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Funil completo com IA para clínicas capilares. Experimente grátis por 15 dias — sem cartão, sem compromisso. Configure em 5 minutos e comece a captar leads hoje.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/cadastro")}
              className="gradient-gold text-white border-0 text-base px-8 pulse-gold"
            >
              Começar 15 dias grátis
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/c/demo")}
              className="text-base px-8"
            >
              Ver demo do funil
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Sem cartão de crédito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20 px-4 border-t border-border/50">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Como funciona o funil</h2>
            <p className="text-muted-foreground">Do anúncio ao agendamento em 5 etapas</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { step: "01", title: "Landing Page", desc: "Captura nome e WhatsApp com UTMs automáticos", icon: "📱" },
              { step: "02", title: "Chat TypeBot", desc: "Diagnóstico conversacional guiado", icon: "💬" },
              { step: "03", title: "Fotos 360°", desc: "Câmera do celular com marcação de pontos", icon: "📸" },
              { step: "04", title: "Análise IA", desc: "Visualização 3D do resultado + score", icon: "🧠" },
              { step: "05", title: "Agendamento", desc: "Calendário integrado + confirmação automática", icon: "📅" },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-card border border-border rounded-xl p-4 text-center h-full">
                  <div className="text-3xl mb-3">{item.icon}</div>
                  <div className="text-xs font-mono text-primary mb-1">{item.step}</div>
                  <div className="font-semibold text-sm mb-1">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                {item.step !== "05" && (
                  <div className="hidden lg:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10 text-muted-foreground">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Tudo que sua clínica precisa</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <BarChart3 className="w-5 h-5" />,
                title: "Lead Score Automático",
                desc: "IA qualifica cada lead com pontuação 0-100 baseada em nível de calvície, expectativas e histórico.",
              },
              {
                icon: <Calendar className="w-5 h-5" />,
                title: "Agendamento Integrado",
                desc: "Google Agenda ou Cal.com. Horários disponíveis em tempo real, confirmação automática.",
              },
              {
                icon: <Bell className="w-5 h-5" />,
                title: "Notificações em Tempo Real",
                desc: "Alerta a cada etapa do funil: novo lead, fotos enviadas, análise pronta, agendamento.",
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: "Rastreamento de Abandono",
                desc: "Saiba exatamente onde cada lead parou no funil para otimizar com dados reais.",
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: "UTMs Automáticos",
                desc: "Captura utmSource, utmCampaign e referrer automaticamente para rastrear seus anúncios.",
              },
              {
                icon: <Star className="w-5 h-5" />,
                title: "NPS Pós-Consulta",
                desc: "Avaliação automática após cada atendimento. Gera prova social e depoimentos.",
              },
            ].map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-xl p-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">15 dias grátis. Sem cartão. Sem risco.</h2>
          <p className="text-muted-foreground mb-8">
            Cadastre sua clínica agora e experimente o funil completo por 15 dias sem cobrar nada.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/cadastro")}
            className="gradient-gold text-white border-0 text-base px-10"
          >
            Começar 15 dias grátis
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">Sem cartão de crédito. Cancele quando quiser.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded gradient-gold flex items-center justify-center">
              <Scissors className="w-3 h-3 text-[#0A2540]" />
            </div>
            <span className="text-sm font-semibold text-gradient-gold">CapilarIA</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 CapilarIA. Plataforma de captação para clínicas capilares.
          </p>
        </div>
      </footer>
    </div>
  );
}
