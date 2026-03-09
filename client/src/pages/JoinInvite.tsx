import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Crown, Shield, Building2, UserCheck, CheckCircle, XCircle, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";

const ROLE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  admin: { label: "Administrador", icon: <Shield className="w-8 h-8" />, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200" },
  franchisee: { label: "Franqueado", icon: <Building2 className="w-8 h-8" />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  seller: { label: "Vendedor", icon: <UserCheck className="w-8 h-8" />, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
};

const ROLE_ROUTES: Record<string, string> = {
  admin: "/rede",
  franchisee: "/franqueado",
  seller: "/vendedor",
};

export default function JoinInvite() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
  }, []);

  const { data: inviteInfo, isLoading: checkingInvite, error: inviteError } = trpc.invite.check.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  const acceptInvite = trpc.invite.accept.useMutation({
    onSuccess: (data) => {
      setAccepted(true);
      setTimeout(() => {
        navigate(ROLE_ROUTES[data.role] || "/");
        window.location.reload();
      }, 2000);
    },
    onError: (err) => setError(err.message),
  });

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-gray-500 text-sm mb-6">Nenhum token de convite encontrado na URL.</p>
          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  if (checkingInvite || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (inviteError || !inviteInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Convite inválido</h1>
          <p className="text-gray-500 text-sm mb-6">{inviteError?.message || "Este convite não existe, expirou ou já foi utilizado."}</p>
          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const roleConfig = ROLE_CONFIG[inviteInfo.role] || ROLE_CONFIG.seller;

  if (accepted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso concedido!</h1>
          <p className="text-gray-500 text-sm mb-2">Você agora tem acesso como <strong>{roleConfig.label}</strong>.</p>
          <p className="text-gray-400 text-xs">Redirecionando para o painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#0a1628] flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-[#00d4c8]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Convite Homenz IA</h1>
          <p className="text-gray-500 text-sm mt-1">Você foi convidado para acessar o sistema</p>
        </div>

        {/* Card do nível */}
        <div className={`rounded-xl border-2 p-5 mb-6 text-center ${roleConfig.bg} ${roleConfig.border}`}>
          <div className={`flex justify-center mb-3 ${roleConfig.color}`}>{roleConfig.icon}</div>
          <p className="text-sm text-gray-500 mb-1">Nível de acesso</p>
          <p className={`text-xl font-bold ${roleConfig.color}`}>{roleConfig.label}</p>
          {inviteInfo.label && (
            <p className="text-sm text-gray-500 mt-1">{inviteInfo.label}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-sm text-red-600 text-center">
            {error}
          </div>
        )}

        {!user ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">Faça login para aceitar o convite e acessar o painel.</p>
            <Button
              className="w-full bg-[#0a1628] hover:bg-[#0d1f38] text-white"
              onClick={() => {
                sessionStorage.setItem("invite_token", token || "");
              window.location.href = getLoginUrl();
              }}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Fazer login e aceitar convite
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center">
              Logado como <strong>{user.name}</strong>. Clique para aceitar o convite.
            </p>
            <Button
              className="w-full bg-[#0a1628] hover:bg-[#0d1f38] text-white"
              onClick={() => acceptInvite.mutate({ token: token! })}
              disabled={acceptInvite.isPending}
            >
              {acceptInvite.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Aceitar convite e acessar painel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
