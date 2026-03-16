/**
 * HomenzAdmLogin — Acesso interno exclusivo para Dono da Rede.
 * Rota: /homenzadm
 * Esta página NÃO é linkada no site público — acesso por URL direta apenas.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight, Lock, BarChart3, Shield } from "lucide-react";

export default function HomenzAdmLogin() {
  const [, navigate] = useLocation();
  const { user } = useHomenzAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Se já logado como owner, redirecionar direto
  useEffect(() => {
    if (user?.role === "owner") {
      navigate("/homenzadm");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Verificar role via metadata ou tabela profiles
      const role = data.user?.user_metadata?.role;
      if (role !== "owner") {
        await supabase.auth.signOut();
        toast.error("Acesso restrito", { description: "Esta área é exclusiva para administradores da rede." });
        return;
      }
      toast.success("Bem-vindo!");
      navigate("/homenzadm");
    } catch (err: unknown) {
      toast.error("Acesso negado", { description: err instanceof Error ? err.message : "Credenciais inválidas" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A1628]">
      <div className="w-full max-w-sm mx-4">
        {/* Logo + badge interno */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#004A9D] mb-4 shadow-xl">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "Montserrat, sans-serif" }}>
            HOMENZ ADM
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1a2a45] border border-[#2a3a55]">
            <Shield className="w-3 h-3 text-[#00C1B8]" />
            <span className="text-[#00C1B8] text-xs font-semibold">Acesso Interno</span>
          </div>
        </div>

        {/* Card de login */}
        <div className="bg-[#0f1e35] border border-[#1e3050] rounded-3xl p-8 shadow-2xl">
          <p className="text-[#8899AA] text-sm text-center mb-6">
            Área restrita — Dono da Rede
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[#8899AA] text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@homenzbrasil.com.br"
                autoComplete="email"
                className="w-full bg-[#0A1628] border border-[#1e3050] rounded-xl px-4 py-3 text-white text-sm placeholder-[#3a4a60] focus:outline-none focus:border-[#00C1B8] focus:ring-1 focus:ring-[#00C1B8]/20 transition-all"
                required
              />
            </div>

            <div>
              <label className="text-[#8899AA] text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-[#0A1628] border border-[#1e3050] rounded-xl px-4 py-3 pr-12 text-white text-sm placeholder-[#3a4a60] focus:outline-none focus:border-[#00C1B8] focus:ring-1 focus:ring-[#00C1B8]/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3a4a60] hover:text-[#8899AA] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2 active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Acessar painel
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé discreto */}
        <p className="text-center text-[#2a3a55] text-xs mt-6">
          Homenz Plataforma © {new Date().getFullYear()} — Uso interno
        </p>
      </div>
    </div>
  );
}
