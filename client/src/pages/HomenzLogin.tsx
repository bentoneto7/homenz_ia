import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth, type HomenzUser } from "@/hooks/useHomenzAuth";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Dono da Rede",
    email: "admin@homenzbrasil.com.br",
    password: "admin123",
    color: "bg-violet-600",
    badge: "Owner",
    redirect: "/rede",
  },
  {
    label: "Franqueado",
    email: "franqueado@homenzuberaba.com.br",
    password: "franq123",
    color: "bg-blue-600",
    badge: "Franqueado",
    redirect: "/franqueado",
  },
  {
    label: "Vendedor",
    email: "carlos@homenzuberaba.com.br",
    password: "vendedor123",
    color: "bg-teal-600",
    badge: "Vendedor",
    redirect: "/vendedor",
  },
];

export default function HomenzLogin() {
  const [, navigate] = useLocation();
  const { login } = useHomenzAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = trpc.homenz.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user as HomenzUser);
      toast.success(`Bem-vindo, ${data.user.name}!`);
      // Redirecionar conforme role
      const redirectMap: Record<string, string> = {
        owner: "/rede",
        franchisee: "/franqueado",
        seller: "/vendedor",
      };
      navigate(redirectMap[data.user.role] ?? "/");
    },
    onError: (err) => {
      toast.error(err.message || "Email ou senha incorretos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  const handleDemoLogin = (demo: typeof DEMO_ACCOUNTS[0]) => {
    loginMutation.mutate({ email: demo.email, password: demo.password });
  };

  return (
    <div className="min-h-screen bg-[#070d1a] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#14b8a6]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#3b82f6]/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black text-white">Homenz IA</span>
          </div>
          <p className="text-white/50 text-sm">Acesse o painel da sua unidade</p>
        </div>

        {/* Card de login */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
          <h1 className="text-xl font-bold text-white mb-6">Entrar</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/60 text-sm font-medium block mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-[#14b8a6]/60 focus:ring-1 focus:ring-[#14b8a6]/30 transition-all"
                required
              />
            </div>

            <div>
              <label className="text-white/60 text-sm font-medium block mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-white/30 focus:outline-none focus:border-[#14b8a6]/60 focus:ring-1 focus:ring-[#14b8a6]/30 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">ou acesse com demo</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Contas demo */}
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.email}
                onClick={() => handleDemoLogin(demo)}
                disabled={loginMutation.isPending}
                className="w-full flex items-center gap-3 bg-white/3 border border-white/8 rounded-xl px-4 py-3 hover:bg-white/8 transition-colors disabled:opacity-50 text-left"
              >
                <div className={`w-8 h-8 rounded-lg ${demo.color} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-xs font-black">{demo.badge[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{demo.label}</p>
                  <p className="text-white/40 text-xs truncate">{demo.email}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${demo.color}`}>
                  {demo.badge}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Nota de demo */}
        <p className="text-center text-white/20 text-xs mt-4">
          Ambiente de demonstração — dados fictícios
        </p>
      </div>
    </div>
  );
}
