/**
 * Hook para buscar e gerenciar leads da clínica.
 * Substitui trpc.leads.list.useQuery()
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

interface UseLeadsOptions {
  clinicId?: number;
  limit?: number;
  funnelStep?: string;
  enabled?: boolean;
}

interface UseLeadsResult {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsResult {
  const { clinicId, limit = 50, funnelStep, enabled = true } = options;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (clinicId) query = query.eq("clinic_id", clinicId);
      if (funnelStep) query = query.eq("funnel_step", funnelStep);

      const { data, error: e } = await query;
      if (e) throw new Error(e.message);
      setLeads(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar leads");
    } finally {
      setLoading(false);
    }
  }, [clinicId, limit, funnelStep, enabled]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, error, refetch: fetchLeads };
}
