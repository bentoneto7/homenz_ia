import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Clock, Rocket, CheckCircle, ArrowRight } from "lucide-react";

export default function AguardandoPagamento() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#004A9D] flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-xl">H</span>
          </div>
          <div className="text-left">
            <span className="text-[#004A9D] font-black text-2xl leading-none block">HOMENZ</span>
            <span className="text-[#00C1B8] text-[10px] font-semibold tracking-widest uppercase leading-none">Plataforma</span>
          </div>
        </div>

        {/* Ícone */}
        <div className="w-20 h-20 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-[#004A9D]" />
        </div>

        <h1 className="text-2xl font-black text-[#0A2540] mb-3">
          Escolha um plano para ativar seu trial
        </h1>
        <p className="text-[#5A667A] mb-8">
          Sua conta foi criada! Escolha um plano para começar seus <strong>15 dias grátis</strong> — sem cartão de crédito.
        </p>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 mb-8 text-left">
          <p className="text-[#0A2540] font-bold text-sm mb-4">Como ativar sua conta:</p>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#00C1B8] flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[#0A2540] font-semibold text-sm">Conta criada</p>
                <p className="text-[#5A667A] text-xs">Seu cadastro foi realizado com sucesso</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#004A9D] flex items-center justify-center flex-shrink-0">
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[#0A2540] font-semibold text-sm">Escolher o plano (sem cartão)</p>
                <p className="text-[#5A667A] text-xs">15 dias grátis — cartão só necessário após o trial</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#E2E8F0] flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
              </div>
              <div>
                <p className="text-[#94A3B8] font-semibold text-sm">Acesso liberado automaticamente</p>
                <p className="text-[#94A3B8] text-xs">Após ativar o trial pelo Stripe</p>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate("/planos")}
          className="w-full bg-[#004A9D] hover:bg-[#003580] text-white rounded-xl font-bold py-3 shadow-lg shadow-blue-200 mb-4"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Começar 15 dias grátis
        </Button>

        <button
          onClick={() => navigate("/login")}
          className="text-[#5A667A] text-sm hover:text-[#004A9D] transition-colors"
        >
          Já ativei, fazer login novamente
        </button>
      </div>
    </div>
  );
}
