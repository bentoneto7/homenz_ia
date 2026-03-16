/**
 * TrialExpiredGate
 * Tela de bloqueio exibida quando o trial de 15 dias expirou e o franqueado
 * ainda não tem uma assinatura paga ativa.
 */
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Lock, Zap, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PLANS = [
  {
    id: "starter" as const,
    name: "Unidade Starter",
    label: "Ideal para franquias em fase de lançamento",
    features: ["Até 100 leads/mês", "1 landing page", "Funil IA", "Painel do franqueado"],
    highlight: false,
  },
  {
    id: "pro" as const,
    name: "Unidade Pro",
    label: "Para franquias que querem crescer rápido",
    features: ["Leads ilimitados", "Landing pages ilimitadas", "Funil IA", "Até 5 vendedores", "Suporte WhatsApp"],
    highlight: true,
    badge: "Mais popular",
  },
  {
    id: "network" as const,
    name: "Rede Completa",
    label: "Para donos de rede com múltiplas franquias",
    features: ["Tudo do Pro", "Painel da Rede", "Relatórios consolidados", "SLA 4h"],
    highlight: false,
  },
];

export default function TrialExpiredGate() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: "starter" | "pro" | "network") => {
    setLoadingPlan(planId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ planId, origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar checkout");
      toast.success("Redirecionando para o checkout...");
      window.open(data.checkoutUrl, "_blank");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar checkout");
    } finally {
      setLoadingPlan(null);
    }
  };;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A2540] via-[#0d2d4a] to-[#0A2540] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 border border-white/20 mb-5">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">
            Seu período gratuito encerrou
          </h1>
          <p className="text-white/70 text-lg max-w-xl mx-auto">
            Seus 15 dias de teste chegaram ao fim. Escolha um plano para continuar gerando leads e acessar o painel.
          </p>
        </div>

        {/* Cards de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl p-6 border transition-all duration-200 ${
                plan.highlight
                  ? "bg-white border-white shadow-2xl scale-[1.03]"
                  : "bg-white/10 border-white/20 hover:bg-white/15"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-[#00C4A0] to-[#0A9E84] text-white text-xs font-black px-4 py-1 rounded-full shadow">
                    {plan.badge}
                  </span>
                </div>
              )}

              <h3 className={`font-black text-lg mb-1 ${plan.highlight ? "text-[#0A2540]" : "text-white"}`}>
                {plan.name}
              </h3>
              <p className={`text-sm mb-5 ${plan.highlight ? "text-[#5A667A]" : "text-white/60"}`}>
                {plan.label}
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-[#00C4A0]" : "text-[#00C4A0]"}`} />
                    <span className={`text-sm ${plan.highlight ? "text-[#0A2540]" : "text-white/80"}`}>{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full font-bold rounded-xl py-3 flex items-center justify-center gap-2 ${
                  plan.highlight
                    ? "bg-gradient-to-r from-[#0A2540] to-[#1a3a5c] text-white hover:opacity-90"
                    : "bg-white/20 text-white border border-white/30 hover:bg-white/30"
                }`}
                disabled={loadingPlan === plan.id}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Assinar agora
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <p className="text-center text-white/40 text-sm">
          Pagamento seguro via Stripe · Cancele quando quiser · Sem taxas de instalação
        </p>
      </div>
    </div>
  );
}
