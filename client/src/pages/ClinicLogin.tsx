import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";
import { AuthShell, AuthField, AuthButton, AuthLink, AUTH } from "./auth/authKit";

const CLINIC_TOKEN_KEY = "clinic_token";

export default function ClinicLogin() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const loginMutation = trpc.auth.loginClinic.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(CLINIC_TOKEN_KEY, data.token);
      localStorage.setItem("homenz_token", data.token);
      toast.success("Login realizado com sucesso!");
      navigate("/painel");
    },
    onError: (err) => toast.error(err.message),
  });

  const registerMutation = trpc.auth.registerClinic.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(CLINIC_TOKEN_KEY, data.token);
      localStorage.setItem("homenz_token", data.token);
      toast.success("Conta criada! Agora configure sua clínica.");
      navigate("/cadastro-clinica");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email: form.email, password: form.password });
    } else {
      if (form.password !== form.confirm) {
        toast.error("As senhas não coincidem");
        return;
      }
      if (form.password.length < 6) {
        toast.error("A senha deve ter pelo menos 6 caracteres");
        return;
      }
      registerMutation.mutate({ name: form.name, email: form.email, password: form.password });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;
  const isLogin = mode === "login";

  return (
    <AuthShell
      variant="centered"
      title={isLogin ? "Entrar na plataforma" : "Criar conta"}
      subtitle={isLogin ? "Acesse o painel da sua clínica" : "Comece a captar leads com IA hoje"}
      footer={
        <div className="space-y-2">
          <p className="text-sm" style={{ color: AUTH.muted }}>
            {isLogin ? "Não tem conta? " : "Já tem conta? "}
            <AuthLink onClick={() => setMode(isLogin ? "register" : "login")}>
              {isLogin ? "Criar agora" : "Entrar"}
            </AuthLink>
          </p>
          {isLogin && (
            <button type="button" onClick={() => navigate("/esqueci-senha")} className="text-xs" style={{ color: AUTH.muted }}>
              Esqueci minha senha
            </button>
          )}
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <AuthField
            id="clinic-name"
            label="Nome completo"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="Seu nome"
            autoComplete="name"
            required
          />
        )}
        <AuthField
          id="clinic-email"
          label="E-mail"
          type="email"
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="seu@email.com"
          autoComplete="email"
          required
        />
        <AuthField
          id="clinic-password"
          label="Senha"
          type="password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          placeholder={isLogin ? "Sua senha" : "Mínimo 6 caracteres"}
          autoComplete={isLogin ? "current-password" : "new-password"}
          required
        />
        {!isLogin && (
          <AuthField
            id="clinic-confirm"
            label="Confirmar senha"
            type="password"
            value={form.confirm}
            onChange={(v) => setForm({ ...form, confirm: v })}
            placeholder="Repita a senha"
            autoComplete="new-password"
            required
          />
        )}
        <AuthButton type="submit" variant="primary" loading={isLoading} className="mt-1">
          {isLoading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
          {!isLoading && <ArrowRight weight="bold" className="w-4 h-4 ml-0.5" />}
        </AuthButton>
      </form>
    </AuthShell>
  );
}
