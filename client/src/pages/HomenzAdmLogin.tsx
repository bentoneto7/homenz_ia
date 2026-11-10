/**
 * HomenzAdmLogin — Acesso interno exclusivo para Dono da Rede.
 * Rota: /homenzadm/login
 * Esta página NÃO é linkada no site público — acesso por URL direta apenas.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth, type HomenzUser } from "@/hooks/useHomenzAuth";
import { toast } from "sonner";
import { ArrowRight, Lock, ShieldCheck } from "@phosphor-icons/react";
import { AuthShell, AuthField, AuthButton, AUTH } from "./auth/authKit";

export default function HomenzAdmLogin() {
  const [, navigate] = useLocation();
  const { login, user } = useHomenzAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Se já logado como owner, redirecionar direto
  useEffect(() => {
    if (user?.role === "owner") {
      navigate("/homenzadm");
    }
  }, [user, navigate]);

  const loginMutation = trpc.homenz.login.useMutation({
    onSuccess: (data) => {
      if (data.user.role !== "owner") {
        toast.error("Acesso restrito", {
          description: "Esta área é exclusiva para administradores da rede.",
        });
        return;
      }
      login(data.token, data.user as HomenzUser);
      toast.success(`Bem-vindo, ${data.user.name}!`);
      setTimeout(() => navigate("/homenzadm"), 500);
    },
    onError: (err) => {
      toast.error("Acesso negado", {
        description: err.message || "Credenciais inválidas",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    loginMutation.mutate({ email, password });
  };

  return (
    <AuthShell
      variant="centered"
      maxWidth="max-w-sm"
      title="Acesso interno"
      subtitle="Área restrita · Dono da Rede"
      footer={
        <p className="text-xs" style={{ color: AUTH.lineStrong }}>
          Homenz Plataforma © {new Date().getFullYear()} · Uso interno
        </p>
      }
    >
      <div className="flex justify-center mb-6">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: "rgba(0,74,157,0.08)", color: AUTH.blue, border: `1px solid rgba(0,74,157,0.18)` }}
        >
          <ShieldCheck weight="fill" className="w-3.5 h-3.5" />
          Acesso Interno
        </span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="adm-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="admin@homenzbrasil.com.br"
          autoComplete="email"
          required
        />
        <AuthField
          id="adm-password"
          label="Senha"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
        <AuthButton type="submit" variant="navy" icon={Lock} loading={loginMutation.isPending} className="mt-1">
          {loginMutation.isPending ? "Verificando..." : "Acessar painel"}
          {!loginMutation.isPending && <ArrowRight weight="bold" className="w-4 h-4 ml-0.5" />}
        </AuthButton>
      </form>
    </AuthShell>
  );
}
