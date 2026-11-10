import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, EnvelopeSimple, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { useLocation } from "wouter";
import { AuthShell, AuthField, AuthButton, AUTH } from "./auth/authKit";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setError("");
    },
    onError: (err) => {
      setError(err.message || "Erro ao processar solicitação. Tente novamente.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Informe seu e-mail.");
      return;
    }
    forgotMutation.mutate({ email: email.trim() });
  };

  return (
    <AuthShell
      variant="centered"
      title="Recuperar senha"
      subtitle="Informe seu e-mail cadastrado e enviaremos um link para redefinir sua senha."
    >
      {submitted ? (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <CheckCircle weight="fill" className="w-12 h-12" style={{ color: AUTH.tealFill }} />
          <div>
            <p className="font-semibold" style={{ color: AUTH.ink }}>Solicitação enviada!</p>
            <p className="text-sm mt-1" style={{ color: AUTH.muted }}>
              Se o e-mail <strong style={{ color: AUTH.bodyText }}>{email}</strong> estiver cadastrado, você receberá um link de recuperação em breve.
            </p>
          </div>
          <AuthButton variant="ghost" icon={ArrowLeft} onClick={() => navigate("/login-clinica")} className="mt-2">
            Voltar para o login
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
            id="forgot-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="seu@email.com"
            autoComplete="email"
            icon={EnvelopeSimple}
            required
          />
          <AuthButton type="submit" variant="primary" loading={forgotMutation.isPending}>
            {forgotMutation.isPending ? "Enviando..." : "Enviar link de recuperação"}
            {!forgotMutation.isPending && <ArrowRight weight="bold" className="w-4 h-4 ml-0.5" />}
          </AuthButton>
          <AuthButton variant="ghost" icon={ArrowLeft} onClick={() => navigate("/login-clinica")}>
            Voltar para o login
          </AuthButton>
        </form>
      )}
    </AuthShell>
  );
}
