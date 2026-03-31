/**
 * Hook de autenticação para clínicas usando JWT próprio (sem Manus OAuth)
 * O token é armazenado em localStorage como "homenz_token"
 */
import { useCallback } from "react";
import { useLocation } from "wouter";

const CLINIC_TOKEN_KEY = "homenz_token";

export function useClinicAuth() {
  const [, navigate] = useLocation();

  const token = typeof window !== "undefined" ? localStorage.getItem(CLINIC_TOKEN_KEY) : null;
  const isAuthenticated = !!token;

  const logout = useCallback(() => {
    localStorage.removeItem(CLINIC_TOKEN_KEY);
    navigate("/login-clinica");
  }, [navigate]);

  const requireAuth = useCallback(() => {
    if (!token) {
      navigate("/login-clinica");
      return false;
    }
    return true;
  }, [token, navigate]);

  return {
    isAuthenticated,
    token,
    logout,
    requireAuth,
  };
}
