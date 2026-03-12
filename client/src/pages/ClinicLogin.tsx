import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Scissors, Eye, EyeOff } from "lucide-react";

const CLINIC_TOKEN_KEY = "clinic_token";

export default function ClinicLogin() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const loginMutation = trpc.auth.loginClinic.useMutation({
    onSuccess: (data) => {
      localStorage.setItem(CLINIC_TOKEN_KEY, data.token);
      // Também salvar como homenz_token para o httpBatchLink enviar no header
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A2540]">
      <div className="w-full max-w-md mx-auto px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C9A84C] to-[#E8C96A] flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-[#0A2540]" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {mode === "login" ? "Entrar na Plataforma" : "Criar Conta"}
          </h1>
          <p className="text-white/60 mt-1 text-sm">
            {mode === "login"
              ? "Acesse o painel da sua clínica"
              : "Comece a captar leads com IA hoje"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Nome completo
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Senha
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === "register" && (
              <div>
                <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                  Confirmar senha
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repita a senha"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#C9A84C] to-[#E8C96A] text-[#0A2540] font-semibold hover:opacity-90 border-0 h-11"
            >
              {isLoading
                ? "Aguarde..."
                : mode === "login"
                ? "Entrar"
                : "Criar conta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {mode === "login" ? "Não tem conta?" : "Já tem conta?"}{" "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
                className="text-[#0A2540] font-semibold hover:underline"
              >
                {mode === "login" ? "Criar agora" : "Entrar"}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          Plataforma Homenz · Diagnóstico Capilar com IA
        </p>
      </div>
    </div>
  );
}
