/**
 * Hook para buscar e gerenciar dados da clínica do usuário autenticado.
 * Substitui trpc.clinic.mine.useQuery()
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/lib/database.types";

type Clinic = Database["public"]["Tables"]["clinics"]["Row"];

interface UseClinicResult {
  clinic: Clinic | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClinic(): UseClinicResult {
  const { user, isAuthenticated } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClinic = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      // Primeiro tenta buscar como owner
      const { data: owned, error: e1 } = await supabase
        .from("clinics")
        .select("*")
        .eq("owner_user_id", user.id)
        .eq("active", true)
        .single();

      if (owned && !e1) {
        setClinic(owned);
        return;
      }

      // Senão busca via clinic_users (membro da equipe)
      const { data: membership } = await supabase
        .from("clinic_users")
        .select("clinic_id")
        .eq("user_id", user.id)
        .eq("active", true)
        .single();

      if (membership) {
        const { data: memberClinic, error: e2 } = await supabase
          .from("clinics")
          .select("*")
          .eq("id", membership.clinic_id)
          .single();

        if (e2) throw new Error(e2.message);
        setClinic(memberClinic);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar clínica");
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    fetchClinic();
  }, [fetchClinic]);

  return { clinic, loading, error, refetch: fetchClinic };
}
