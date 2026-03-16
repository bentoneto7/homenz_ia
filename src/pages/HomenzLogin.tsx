import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import { toast } from "sonner";
import {
  Eye, EyeOff, Loader2, ArrowRight, Shield, Users,
  ChevronRight, Lock
} from "lucide-react";

// Apenas Franqueado e Vendedor são expostos no login público.
// O acesso de Dono da Rede é interno — disponível em /homenzadm
const DEMO_ACCOUNTS = [
  {
    label: "Franqueado",
    email: "franqueado@homenzuberaba.com.br",
    password: "franq123",
    color: "from-blue-500 to-cyan-500",
    borderColor: "border-blue-200",
    hoverBg: "hover:bg-blue-50",
    badge: "Franqueado",
    badgeBg: "bg-blue-100 text-[#004A9D]",
    icon: Shield,
    description: "Gestão da sua unidade",
    redirect: "/franqueado",
  },
  {
    label: "Vendedor",
    email: "carlos@homenzuberaba.com.br",
    password: "vendedor123",
    color: "from-teal-500 to-emerald-500",
    borderColor: "border-teal-200",
    hoverBg: "hover:bg-teal-50",
    badge: "Vendedor",
    badgeBg: "bg-teal-100 text-[#007A75]",
    icon: Users,
    description: "Seus leads e agendamentos",
    redirect: "/vendedor",
  },
];

export default function HomenzLogin() {
  const [, navigate] = useLocation();
  const { user } = useHomenzAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeDemo, setActiveDemo] = useState<number | null>(null);

  // Redirecionar se já logado
  useEffect(() => {
    if (user) {
      // Franqueado inativo: aguardando pagamento
      if (user.role === "franchisee" && user.active === false) {
        navigate("/aguardando-pagamento");
        return;
      }
      const redirectMap: Record<string, string> = {
        owner: "/homenzadm",
        franchisee: "/franqueado",
        seller: "/vendedor",
      };
      navigate(redirectMap[user.role] ?? "/");
    }
  }, [user, navigate]);

   const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Bem-vindo!", { description: "Redirecionando..." });
      // O redirecionamento ocorre via useEffect acima quando user muda
    } catch (err: unknown) {
      setActiveDemo(null);
      toast.error("Acesso negado", { description: err instanceof Error ? err.message : "Email ou senha incorretos" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demo: typeof DEMO_ACCOUNTS[0], idx: number) => {
    setActiveDemo(idx);
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: demo.email, password: demo.password });
      if (error) throw error;
    } catch (err: unknown) {
      toast.error("Acesso negado", { description: err instanceof Error ? err.message : "Email ou senha incorretos" });
    } finally {
      setActiveDemo(null);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* ── Lado esquerdo: branding ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: "linear-gradient(160deg, #EBF4FF 0%, #F0FAFA 60%, #ffffff 100%)" }}>

        {/* Conteúdo */}
        <div>
          {/* Logo */}
          <div className="mb-14">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663133764902/Cc4dLWyLaks57xa8R6kgEV/homenz-plataforma-logo_0b0261db.png"
              alt="Homenz Plataforma"
              className="h-12"
            />
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h1 className="text-5xl font-black leading-tight mb-4" style={{ color: "#004A9D", fontFamily: "Montserrat, sans-serif" }}>
              Sua clínica<br />
              <span style={{ color: "#00C1B8" }}>no controle.</span>
            </h1>
            <p className="text-[#5A667A] text-lg leading-relaxed max-w-sm">
              Leads qualificados, agendamentos automáticos e ranking da rede — tudo em um painel.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { value: "3x", label: "mais agendamentos" },
              { value: "87%", label: "taxa de resposta" },
              { value: "4.9★", label: "satisfação" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 shadow-sm">
                <p className="text-2xl font-black mb-1" style={{ color: "#004A9D" }}>{stat.value}</p>
                <p className="text-[#5A667A] text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Níveis de acesso — apenas Franqueado e Vendedor são visíveis */}
        <div>
          <p className="text-[#A0AABB] text-xs font-semibold uppercase tracking-widest mb-3">
            Níveis de acesso
          </p>
          <div className="flex gap-2">
            {["Franqueado", "Vendedor"].map((role, i) => (
              <div
                key={role}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E2E8F0] shadow-sm"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${
                  i === 0 ? "bg-[#004A9D]" : "bg-[#00C1B8]"
                }`} />
                <span className="text-[#5A667A] text-xs">{role}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Lado direito: formulário ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-2 mb-10">
            <div className="w-7 h-7 rounded-lg bg-[#004A9D] flex items-center justify-center">
              <span className="text-white font-black text-xs">H</span>
            </div>
            <span className="text-xl font-black text-[#004A9D]">HOMENZ</span>
          </div>

          {/* Cabeçalho */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-[#0A2540] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Entrar</h2>
            <p className="text-[#5A667A] text-sm">Acesse o painel da sua unidade Homenz</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[#5A667A] text-sm font-medium block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                autoComplete="email"
                className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3.5 text-[#0A2540] text-sm placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] focus:ring-2 focus:ring-[#00C1B8]/10 transition-all"
                required
              />
            </div>

            {/* Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[#5A667A] text-sm font-medium">Senha</label>
                <button type="button" className="text-xs text-[#00C1B8] hover:text-[#007A75] transition-colors">
                  Esqueceu?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3.5 pr-12 text-[#0A2540] text-sm placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] focus:ring-2 focus:ring-[#00C1B8]/10 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A0AABB] hover:text-[#5A667A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden bg-[#00C1B8] text-[#0A2540] font-bold py-3.5 rounded-full hover:bg-[#009E96] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {isLoading && activeDemo === null ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Entrar no painel
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-[#A0AABB] text-xs font-medium">Acesso rápido — demo</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          {/* Cards de acesso demo — apenas Franqueado e Vendedor */}
          <div className="space-y-2.5">
            {DEMO_ACCOUNTS.map((demo, idx) => {
              const Icon = demo.icon;
              const isDemoLoading = isLoading && activeDemo === idx;
              return (
                <button
                  key={demo.email}
                  onClick={() => handleDemoLogin(demo, idx)}
                  disabled={isLoading}
                  className={`w-full flex items-center gap-3.5 bg-white border ${demo.borderColor} rounded-2xl px-4 py-3.5 ${demo.hoverBg} transition-all disabled:opacity-60 group text-left shadow-sm`}
                >
                  {/* Ícone */}
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${demo.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[#0A2540] font-semibold text-sm">{demo.label}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${demo.badgeBg}`}>
                        {demo.badge}
                      </span>
                    </div>
                    <p className="text-[#5A667A] text-xs">{demo.description}</p>
                  </div>

                  {/* Seta */}
                  <ChevronRight className="w-4 h-4 text-[#C0CADB] group-hover:text-[#5A667A] group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Link de cadastro */}
          <p className="text-center text-[#5A667A] text-sm mt-6">
            Não tem conta?{" "}
            <button
              onClick={() => navigate("/cadastro")}
              className="text-[#004A9D] font-bold hover:underline"
            >
              Criar conta de franqueado
            </button>
          </p>

          {/* Rodapé */}
          <div className="mt-4 flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="text-[#A0AABB] text-xs hover:text-[#5A667A] transition-colors"
            >
              ← Voltar ao site
            </button>
            <p className="text-[#C0CADB] text-xs">
              Ambiente de demonstração
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
