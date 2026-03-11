import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";

type AllowedRole = "owner" | "franchisee" | "seller";

const ROLE_REDIRECT: Record<AllowedRole, string> = {
  owner: "/homenzadm",
  franchisee: "/franqueado",
  seller: "/vendedor",
};

interface ProtectedRouteProps {
  /** Roles allowed to access this route. If empty, any authenticated user is allowed. */
  allowedRoles?: AllowedRole[];
  children: React.ReactNode;
}

/**
 * Centralised auth guard for Homenz dashboards.
 *
 * - Not authenticated → redirect to /login
 * - Authenticated but wrong role → redirect to the user's own dashboard
 * - Authenticated and correct role → render children
 */
export function ProtectedRoute({ allowedRoles = [], children }: ProtectedRouteProps) {
  const { user, loading } = useHomenzAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/login");
      return;
    }

    // Franqueado com conta inativa (pagamento pendente)
    if (user.role === "franchisee" && user.active === false) {
      navigate("/aguardando-pagamento");
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      navigate(ROLE_REDIRECT[user.role] ?? "/login");
    }
  }, [loading, user, allowedRoles, navigate]);

  // Show spinner while auth state is resolving
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a1628]">
        <Loader2 className="w-8 h-8 text-[#00C1B8] animate-spin" />
      </div>
    );
  }

  // Don't render children if user is not allowed (redirect is in-flight)
  if (!user) return null;
  if (user.role === "franchisee" && user.active === false) return null;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
