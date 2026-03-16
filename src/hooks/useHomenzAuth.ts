import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/database.types";

export interface HomenzUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar_url?: string;
  franchise_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Compatível com código legado que usava getStoredToken / getAuthHeaders
export function getStoredToken(): string | null { return null; }
export function getAuthHeaders(): Record<string, string> { return {}; }

export function useHomenzAuth() {
  const { user, profile, loading, isAuthenticated, session, signOut } = useAuth();

  const homenzUser: HomenzUser | null = profile
    ? {
        id: profile.id,
        name: profile.name ?? "",
        email: profile.email ?? user?.email ?? "",
        role: profile.role,
        active: profile.active,
        created_at: user?.created_at ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    : null;

  const login = useCallback((_token: string, _user: HomenzUser) => {
    console.warn("[useHomenzAuth] login() é um no-op. Use supabase.auth.signInWithPassword().");
  }, []);

  const logout = useCallback(async () => { await signOut(); }, [signOut]);

  return {
    user: homenzUser,
    token: session?.access_token ?? null,
    loading,
    isAuthenticated,
    isOwner: profile?.role === "owner",
    isFranchisee: profile?.role === "franchisee",
    isSeller: profile?.role === "seller",
    login,
    logout,
  };
}
