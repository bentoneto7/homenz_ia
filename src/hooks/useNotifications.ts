/**
 * Hook para buscar e gerenciar notificações da clínica.
 * Substitui trpc.notifications.listClinic.useQuery()
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

interface UseNotificationsOptions {
  clinicId?: number;
  unreadOnly?: boolean;
  enabled?: boolean;
}

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsResult {
  const { clinicId, unreadOnly = false, enabled = true } = options;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (clinicId) query = query.eq("clinic_id", clinicId);
      if (unreadOnly) query = query.eq("read", false);

      const { data, error: e } = await query;
      if (e) throw new Error(e.message);
      setNotifications(data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao buscar notificações");
    } finally {
      setLoading(false);
    }
  }, [clinicId, unreadOnly, enabled]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Escuta em tempo real
  useEffect(() => {
    if (!enabled || !clinicId) return;
    const channel = supabase
      .channel(`notifications:${clinicId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `clinic_id=eq.${clinicId}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clinicId, enabled, fetchNotifications]);

  const markAsRead = useCallback(async (id: number) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!clinicId) return;
    await supabase.from("notifications").update({ read: true }).eq("clinic_id", clinicId).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [clinicId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return { notifications, unreadCount, loading, error, markAsRead, markAllAsRead, refetch: fetchNotifications };
}
