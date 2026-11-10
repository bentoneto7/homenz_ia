import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth, type HomenzUser } from "@/hooks/useHomenzAuth";
import { toast } from "sonner";
import { ArrowRight, Storefront, UsersThree, CaretRight, Lock, CircleNotch } from "@phosphor-icons/react";
import { AuthShell, AuthField, AuthButton, AuthLink, AUTH } from "./auth/authKit";

// Apenas Franqueado e Vendedor são expostos no login público.
// O acesso de Dono da Rede é interno — disponível em /homenzadm
const DEMO_ACCOUNTS = [
  {
    label: "Franqueado",
    email: "franqueado@homenzuberaba.com.br",
    password: "franq123",
    icon: Storefront,
    description: "Gestão da sua unidade",
    accent: AUTH.blue,
    accentSoft: "rgba(0,74,157,0.10)",
  },
  {
    label: "Vendedor",
    email: "carlos@homenzuberaba.com.br",
    password: "vendedor123",
    icon: UsersThree,
    description: "Seus leads e agendamentos",
    accent: AUTH.teal,
    accentSoft: "rgba(0,193,184,0.12)",
  },
];

export default function HomenzLogin() {
  const [, navigate] = useLocation();
  const { login, user } = useHomenzAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeDemo, setActiveDemo] = useState<number | null>(null);

  // Redirecionar se já logado
  useEffect(() => {
    if (user) {
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

  const loginMutation = trpc.homenz.login.useMutation({
    onSuccess: (data) => {
      login(data.token, data.user as HomenzUser);
      if (data.user.role === "franchisee" && data.user.active === false) {
        toast.info(`Olá, ${data.user.name}! Seu acesso está aguardando confirmação do pagamento.`);
        setTimeout(() => navigate("/aguardando-pagamento"), 500);
        return;
      }
      toast.success(`Bem-vindo, ${data.user.name}!`, {
        description: "Redirecionando para o painel...",
      });
      const redirectMap: Record<string, string> = {
        owner: "/homenzadm",
        franchisee: "/franqueado",
        seller: "/vendedor",
      };
      setTimeout(() => navigate(redirectMap[data.user.role] ?? "/"), 500);
    },
    onError: (err) => {
      setActiveDemo(null);
      toast.error("Acesso negado", {
        description: err.message || "Email ou senha incorretos",
      });
    },
    onSettled: () => setActiveDemo(null),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  const handleDemoLogin = (demo: typeof DEMO_ACCOUNTS[0], idx: number) => {
    setActiveDemo(idx);
    loginMutation.mutate({ email: demo.email, password: demo.password });
  };

  const submitting = loginMutation.isPending;

  return (
    <AuthShell
      variant="split"
      title="Bem-vindo de volta"
      subtitle="Acesse o painel da sua unidade Homenz"
      brandHeadline={<>A revolução da sua<br />clínica chegou!</>}
      brandSub="Leads qualificados pela IA, agenda em tempo real e o CRM da sua clínica, tudo em um só painel."
      brandProofs={[
        "Funil com IA que qualifica sozinho",
        "Agendamentos e leads em tempo real",
        "Ranking e desempenho da rede",
      ]}
      footer={
        <div className="space-y-4">
          <p className="text-center text-sm" style={{ color: AUTH.muted }}>
            Não tem conta? <AuthLink onClick={() => navigate("/cadastro")}>Criar conta de franqueado</AuthLink>
          </p>
          <div className="flex items-center justify-between">
            <button onClick={() => navigate("/")} className="text-xs transition-colors" style={{ color: AUTH.muted }}>
              ← Voltar ao site
            </button>
            <p className="text-xs" style={{ color: AUTH.lineStrong }}>Ambiente de demonstração</p>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <AuthField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="seu@email.com.br"
          autoComplete="email"
          required
        />
        <AuthField
          id="login-password"
          label="Senha"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          required
          action={
            <button type="button" onClick={() => navigate("/esqueci-senha")} className="text-xs font-semibold" style={{ color: AUTH.blue }}>
              Esqueceu?
            </button>
          }
        />
        <AuthButton type="submit" variant="primary" icon={Lock} loading={submitting && activeDemo === null} className="mt-1">
          {submitting && activeDemo === null ? "Verificando..." : "Entrar no painel"}
          {!(submitting && activeDemo === null) && <ArrowRight weight="bold" className="w-4 h-4 ml-0.5" />}
        </AuthButton>
      </form>

      {/* Divisor */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ background: AUTH.line }} />
        <span className="text-xs font-medium" style={{ color: AUTH.muted }}>Acesso rápido · demonstração</span>
        <div className="flex-1 h-px" style={{ background: AUTH.line }} />
      </div>

      {/* Cards de acesso demo — apenas Franqueado e Vendedor */}
      <div className="space-y-2.5">
        {DEMO_ACCOUNTS.map((demo, idx) => {
          const Icon = demo.icon;
          const isLoading = submitting && activeDemo === idx;
          return (
            <button
              key={demo.email}
              onClick={() => handleDemoLogin(demo, idx)}
              disabled={submitting}
              className="ak-btn w-full flex items-center gap-3.5 rounded-2xl px-4 py-3.5 group text-left disabled:opacity-60"
              style={{ background: AUTH.bg, border: `1px solid ${AUTH.line}` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: demo.accentSoft }}>
                {isLoading ? (
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" style={{ color: demo.accent }} />
                ) : (
                  <Icon weight="bold" className="w-5 h-5" style={{ color: demo.accent }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: AUTH.ink }}>{demo.label}</p>
                <p className="text-xs" style={{ color: AUTH.muted }}>{demo.description}</p>
              </div>
              <CaretRight weight="bold" className="w-4 h-4 group-hover:translate-x-0.5 transition-transform flex-shrink-0" style={{ color: AUTH.lineStrong }} />
            </button>
          );
        })}
      </div>
    </AuthShell>
  );
}
