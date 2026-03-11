import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Check, Zap, Building2, Network, ArrowLeft, Star, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";

const PLANS = [
  {
    id: "starter" as const,
    name: "Unidade Starter",
    price: "R$ 797",
    period: "/mês",
    description: "Ideal para franquias em fase de lançamento",
    icon: Zap,
    color: "from-blue-500 to-cyan-500",
    borderColor: "border-blue-200",
    highlight: false,
    badge: null,
    features: [
      "Até 100 leads/mês",
      "1 landing page de captação",
      "Funil de diagnóstico capilar IA",
      "Painel do franqueado",
      "Suporte por e-mail",
      "1 vendedor incluído",
    ],
  },
  {
    id: "pro" as const,
    name: "Unidade Pro",
    price: "R$ 1.497",
    period: "/mês",
    description: "Para franquias que querem crescer rápido",
    icon: Building2,
    color: "from-[#004A9D] to-[#00C1B8]",
    borderColor: "border-[#004A9D]",
    highlight: true,
    badge: "Mais popular",
    features: [
      "Leads ilimitados",
      "Landing pages ilimitadas",
      "Funil de diagnóstico capilar IA",
      "Painel do franqueado + vendedores",
      "Distribuição automática de leads",
      "Analytics de conversão por vendedor",
      "Alertas de temperatura de lead",
      "Até 5 vendedores",
      "Suporte prioritário via WhatsApp",
    ],
  },
  {
    id: "network" as const,
    name: "Rede Completa",
    price: "R$ 3.497",
    period: "/mês",
    description: "Para donos de rede com múltiplas franquias",
    icon: Network,
    color: "from-violet-500 to-purple-600",
    borderColor: "border-violet-200",
    highlight: false,
    badge: null,
    features: [
      "Tudo do Pro",
      "Painel do Dono da Rede",
      "Gestão centralizada de franquias",
      "Relatórios consolidados",
      "Vendedores ilimitados",
      "API de integração",
      "Onboarding dedicado",
      "SLA de suporte 4h",
    ],
  },
];

export default function PlanosPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user } = useHomenzAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Email passado via query string para novos cadastros (sem login ainda)
  const emailFromQuery = new URLSearchParams(search).get("email") ?? undefined;
  const isNewUser = new URLSearchParams(search).get("novo") === "1";

  useEffect(() => {
    if (isNewUser) {
      toast.success("Conta criada! Escolha um plano para ativar seu acesso.", {
        duration: 6000,
      });
    }
  }, [isNewUser]);

  const createCheckout = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data: { checkoutUrl: string }) => {
      toast.success("Redirecionando para o pagamento...");
      window.open(data.checkoutUrl, "_blank");
      setLoadingPlan(null);
    },
    onError: (err: { message: string }) => {
      toast.error("Erro ao iniciar pagamento", { description: err.message });
      setLoadingPlan(null);
    },
  });

  const handleSelectPlan = (planId: string) => {
    // Novos cadastros: passar email via query string
    if (!user && !emailFromQuery) {
      toast.info("Faça login ou cadastre-se para assinar um plano");
      navigate("/cadastro");
      return;
    }
    setLoadingPlan(planId);
    createCheckout.mutate({
      planId: planId as "starter" | "pro" | "network",
      origin: window.location.origin,
      email: emailFromQuery,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9]">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#E2E8F0] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-[#5A667A] hover:text-[#0A2540] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#004A9D] flex items-center justify-center">
              <span className="text-white font-black text-sm">H</span>
            </div>
            <div>
              <span className="text-[#004A9D] font-black text-lg leading-none">HOMENZ</span>
              <span className="block text-[#00C1B8] text-[10px] font-semibold tracking-widest uppercase leading-none">Plataforma</span>
            </div>
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <Badge className="mb-4 bg-[#EBF4FF] text-[#004A9D] border-[#B3D4FF] hover:bg-[#EBF4FF]">
          <Star className="w-3 h-3 mr-1" />
          Planos e Preços
        </Badge>
        <h1 className="text-4xl md:text-5xl font-black text-[#0A2540] mb-4 leading-tight">
          Escolha o plano certo<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#004A9D] to-[#00C1B8]">
            para sua franquia
          </span>
        </h1>
        <p className="text-[#5A667A] text-lg max-w-2xl mx-auto">
          Comece com 15 dias grátis. Cancele quando quiser. Sem taxas de instalação.
        </p>
      </section>

      {/* Cards de planos */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-3xl border-2 ${
                  plan.highlight ? "border-[#004A9D] shadow-2xl shadow-blue-100 scale-105" : `${plan.borderColor} shadow-lg`
                } p-8 flex flex-col`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#004A9D] text-white border-0 px-4 py-1 text-xs font-bold shadow-lg">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                {/* Name & Price */}
                <h3 className="text-xl font-black text-[#0A2540] mb-1">{plan.name}</h3>
                <p className="text-[#5A667A] text-sm mb-5">{plan.description}</p>
                <div className="flex items-end gap-1 mb-6">
                  <span className="text-4xl font-black text-[#0A2540]">{plan.price}</span>
                  <span className="text-[#5A667A] text-sm mb-1">{plan.period}</span>
                </div>

                {/* CTA */}
                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loadingPlan === plan.id}
                  className={`w-full mb-6 rounded-xl font-bold py-3 ${
                    plan.highlight
                      ? "bg-[#004A9D] hover:bg-[#003580] text-white shadow-lg shadow-blue-200"
                      : "bg-[#F0F4F8] hover:bg-[#E2E8F0] text-[#0A2540]"
                  }`}
                >
                  {loadingPlan === plan.id ? "Aguarde..." : "Começar 15 dias grátis"}
                </Button>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-[#374151] text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Garantia */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl border border-[#E2E8F0] px-6 py-4 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-[#0A2540] font-bold text-sm">Garantia de 15 dias</p>
              <p className="text-[#5A667A] text-xs">Cancele sem custo dentro do período de teste</p>
            </div>
          </div>
        </div>

        {/* FAQ rápido */}
        <div className="mt-12 max-w-2xl mx-auto">
          <h2 className="text-2xl font-black text-[#0A2540] text-center mb-8">Dúvidas frequentes</h2>
          <div className="space-y-4">
            {[
              {
                q: "Posso mudar de plano depois?",
                a: "Sim! Você pode fazer upgrade ou downgrade a qualquer momento. O valor é ajustado proporcionalmente.",
              },
              {
                q: "O que acontece após os 15 dias grátis?",
                a: "Você será cobrado automaticamente no cartão cadastrado. Pode cancelar antes do fim do período sem custo.",
              },
              {
                q: "Quantos vendedores posso cadastrar?",
                a: "Starter: 1 vendedor. Pro: até 5 vendedores. Rede Completa: ilimitado.",
              },
              {
                q: "Como funciona o suporte?",
                a: "Starter: e-mail em até 48h. Pro: WhatsApp prioritário em até 4h. Rede: SLA de 4h com gerente dedicado.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
                <p className="text-[#0A2540] font-bold text-sm mb-2">{item.q}</p>
                <p className="text-[#5A667A] text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
