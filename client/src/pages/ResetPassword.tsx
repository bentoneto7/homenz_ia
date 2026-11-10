import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { CheckCircle, Warning, ArrowRight } from "@phosphor-icons/react";
import { useLocation } from "wouter";
import { AuthShell, AuthField, AuthButton, AUTH } from "./auth/authKit";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Extrair token da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Erro ao redefinir senha. O link pode ter expirado.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Link inválido. Solicite um novo link de recuperação.");
      return;
    }
    if (newPassword.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    resetMutation.mutate({ token, newPassword });
  };

  if (!token && !success) {
    return (
      <AuthShell variant="centered" title="Link inválido" subtitle="Este link de recuperação é inválido ou já foi utilizado.">
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <Warning weight="fill" className="w-12 h-12" style={{ color: "#D97706" }} />
          <AuthButton variant="primary" onClick={() => navigate("/esqueci-senha")}>
            Solicitar novo link
            <ArrowRight weight="bold" className="w-4 h-4 ml-0.5" />
          </AuthButton>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell variant="centered" title="Nova senha" subtitle="Escolha uma nova senha para sua conta.">
      {success ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <CheckCircle weight="fill" className="w-12 h-12" style={{ color: AUTH.tealFill }} />
          <div>
            <p className="font-semibold" style={{ color: AUTH.ink }}>Senha redefinida com sucesso!</p>
            <p className="text-sm mt-1" style={{ color: AUTH.muted }}>Você já pode fazer login com sua nova senha.</p>
          </div>
          <AuthButton variant="primary" onClick={() => navigate("/login-clinica")} className="mt-1">
            Ir para o login
            <ArrowRight weight="bold" className="w-4 h-4 ml-0.5" />
          </AuthButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(220,38,38,0.06)", color: "#B91C1C", border: "1px solid rgba(220,38,38,0.2)" }}>
              {error}
            </div>
          )}
          <AuthField
            id="new-password"
            label="Nova senha"
            type="password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Mínimo 6 caracteres"
            autoComplete="new-password"
            required
          />
          <div>
            <AuthField
              id="confirm-password"
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              required
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs mt-1.5" style={{ color: "#B91C1C" }}>As senhas não coincidem</p>
            )}
          </div>
          <AuthButton
            type="submit"
            variant="primary"
            loading={resetMutation.isPending}
            disabled={!!confirmPassword && newPassword !== confirmPassword}
          >
            {resetMutation.isPending ? "Salvando..." : "Redefinir senha"}
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
