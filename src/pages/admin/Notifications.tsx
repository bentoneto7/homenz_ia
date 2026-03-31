import { useClinicAuth } from "@/hooks/useClinicAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, ArrowLeft, CheckCheck } from "lucide-react";

const TYPE_ICONS: Record<string, string> = {
  new_lead: "👤", chat_completed: "💬", photos_uploaded: "📷",
  ai_ready: "🤖", appointment_new: "📅", appointment_confirmed: "✅",
  appointment_cancelled: "❌", appointment_reminder: "⏰",
  treatment_followup: "💊", nps_request: "⭐",
};

export default function AdminNotifications() {
  const { isAuthenticated } = useClinicAuth();
  const [, navigate] = useLocation();

  const { data: clinic } = trpc.clinic.mine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notifications, refetch } = trpc.notifications.listClinic.useQuery(
    { unreadOnly: false },
    { enabled: !!clinic }
  );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message),
  });
  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message),
  });

  const unreadIds = (notifications ?? []).filter((n) => !n.read).map((n) => n.id);

  const markAllRead = () => {
    if (unreadIds.length === 0) return;
    markAllReadMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/painel")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Bell className="w-4 h-4 text-primary" />
            <h1 className="font-bold">Notificações</h1>
            {unreadIds.length > 0 && (
              <span className="text-xs bg-primary text-white px-1.5 py-0.5 rounded-full">{unreadIds.length}</span>
            )}
          </div>
          {unreadIds.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={markAllRead}
              disabled={markRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Marcar todas lidas
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {(notifications ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma notificação</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(notifications ?? []).map((notif) => (
              <div
                key={notif.id}
                className={`bg-card border rounded-xl p-4 transition-all cursor-pointer ${
                  !notif.read ? "border-primary/30 bg-primary/5" : "border-border"
                }`}
                onClick={() => {
                  if (!notif.read) markRead.mutate({ id: notif.id });
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-lg flex-shrink-0">
                    {TYPE_ICONS[notif.type] ?? "🔔"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.content}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(notif.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
