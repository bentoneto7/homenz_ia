/**
 * JoinInvite — Página de aceite de convite para vendedores Homenz
 * 
 * Fluxo:
 * 1. Usuário acessa /join?token=xxx
 * 2. Sistema verifica o token via trpc.homenz.getInviteInfo
 * 3. Usuário preenche nome, email e senha
 * 4. Sistema cria a conta via trpc.homenz.registerWithInvite
 * 5. Usuário é redirecionado para o painel do vendedor
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import { useLocation } from "wouter";
import {
  Building2, UserCheck, CheckCircle, XCircle, RefreshCw,
  Eye, EyeOff, Loader2, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_ROUTES: Record<string, string> = {
  franchisee: "/franqueado",
  seller: "/vendedor",
  owner: "/homenzadm",
};

export default function JoinInvite() {
  const [, navigate] = useLocation();
  const { login } = useHomenzAuth();
  const [token, setToken] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  // Verificar convite
  const [inviteInfo, setInviteInfo] = useState<Record<string, unknown> | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<Error | null>(null);
  useEffect(() => {
    if (!token) return;
    setCheckingInvite(true);
    supabase.from("invites").select("*, franchises(name, city, state)").eq("token", token).eq("used", false).maybeSingle()
      .then(({ data, error: sbError }) => {
        if (sbError || !data) setInviteError(new Error("Convite inválido ou expirado"));
        else setInviteInfo(data);
        setCheckingInvite(false);
      });
  }, [token]);

  // Registrar com convite
  const [registerPending, setRegisterPending] = useState(false);
  const registerMutation = {
    isPending: registerPending,
    mutate: async (payload: Record<string, unknown>) => {
      setRegisterPending(true);
      try {
        const { email, password, name, phone } = payload as Record<string, string>;
        const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { name, role: "seller" } } });
        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Usuário não criado");
        await supabase.from("sellers").insert({ user_id: authData.user.id, franchise_id: (inviteInfo as Record<string, unknown>)?.franchise_id, name, email, phone, active: true });
        await supabase.from("invites").update({ used: true, used_at: new Date().toISOString() }).eq("token", token);
        onRegisterSuccess();
      } catch (err: unknown) {
        onRegisterError(err instanceof Error ? err : new Error("Erro ao criar conta"));
      } finally { setRegisterPending(false); }
    },
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !name || !email || !password) return;
    registerMutation.mutate({ token, name, email, password, phone: phone || undefined });
  };

  // ── Estados de carregamento e erro ──────────────────────────────────────────

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#0A2540] mb-2">Link inválido</h1>
          <p className="text-[#5A667A] text-sm mb-6">Nenhum token de convite encontrado na URL.</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (checkingInvite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#00C1B8]" />
      </div>
    );
  }

  if (inviteError || !inviteInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#0A2540] mb-2">Convite inválido</h1>
          <p className="text-[#5A667A] text-sm mb-6">
            {inviteError?.message || "Este convite não existe, expirou ou já foi utilizado."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] to-white flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[#0A2540] mb-2">Conta criada!</h1>
          <p className="text-[#5A667A] text-sm mb-2">
            Você agora tem acesso como <strong>{inviteInfo.role === "seller" ? "Vendedor" : "Franqueado"}</strong>.
          </p>
          <p className="text-[#A0AABB] text-xs">Redirecionando para o painel...</p>
        </div>
      </div>
    );
  }

  const isSellerInvite = inviteInfo.role === "seller";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
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

        {/* Card principal */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8">
          {/* Header do convite */}
          <div className="text-center mb-6">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
              isSellerInvite ? "bg-teal-50" : "bg-blue-50"
            }`}>
              {isSellerInvite
                ? <UserCheck className="w-8 h-8 text-[#007A75]" />
                : <Building2 className="w-8 h-8 text-[#004A9D]" />
              }
            </div>
            <h1 className="text-2xl font-black text-[#0A2540] mb-1" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Você foi convidado!
            </h1>
            <p className="text-[#5A667A] text-sm">
              Para se tornar <strong>{isSellerInvite ? "Vendedor" : "Franqueado"}</strong>
              {inviteInfo.franchiseName && ` da franquia ${inviteInfo.franchiseName}`}
            </p>
          </div>

          {/* Formulário de cadastro */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[#5A667A] text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Nome completo *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] text-sm placeholder-[#C0CADB] focus:outline-none focus:border-[#004A9D] focus:ring-2 focus:ring-[#004A9D]/10 transition-all"
              />
            </div>

            <div>
              <label className="text-[#5A667A] text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Email *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] text-sm placeholder-[#C0CADB] focus:outline-none focus:border-[#004A9D] focus:ring-2 focus:ring-[#004A9D]/10 transition-all"
              />
            </div>

            <div>
              <label className="text-[#5A667A] text-xs font-semibold uppercase tracking-wider block mb-1.5">
                WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] text-sm placeholder-[#C0CADB] focus:outline-none focus:border-[#004A9D] focus:ring-2 focus:ring-[#004A9D]/10 transition-all"
              />
            </div>

            <div>
              <label className="text-[#5A667A] text-xs font-semibold uppercase tracking-wider block mb-1.5">
                Senha *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 pr-12 text-[#0A2540] text-sm placeholder-[#C0CADB] focus:outline-none focus:border-[#004A9D] focus:ring-2 focus:ring-[#004A9D]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#C0CADB] hover:text-[#5A667A] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending || !name || !email || !password}
              className="w-full bg-[#004A9D] hover:bg-[#003580] text-white font-bold py-3.5 rounded-full transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2 active:scale-[0.98] shadow-lg shadow-blue-200"
            >
              {registerMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Criar conta e acessar
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-[#A0AABB] text-xs mt-4">
            Já tem uma conta?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-[#004A9D] font-semibold hover:underline"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
