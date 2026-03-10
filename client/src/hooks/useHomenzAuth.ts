import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface HomenzUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "franchisee" | "seller";
  phone?: string;
  avatar_url?: string;
  franchise_id?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

const TOKEN_KEY = "homenz_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function useHomenzAuth() {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<HomenzUser | null>(null);

  const meQuery = trpc.homenz.me.useQuery(undefined, {
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data as HomenzUser);
    } else if (meQuery.isError) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, [meQuery.data, meQuery.isError]);

  useEffect(() => {
    if (!token) {
      setUser(null);
    }
  }, [token]);

  const login = useCallback((newToken: string, newUser: HomenzUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const loading = !!token && meQuery.isLoading;

  return {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isOwner: user?.role === "owner",
    isFranchisee: user?.role === "franchisee",
    isSeller: user?.role === "seller",
    login,
    logout,
  };
}
