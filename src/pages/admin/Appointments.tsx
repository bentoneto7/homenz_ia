import { useClinicAuth } from "@/hooks/useClinicAuth";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, ArrowLeft, Check, X, Clock } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente", confirmed: "Confirmado", cancelled: "Cancelado",
  completed: "Concluído", no_show: "Não compareceu",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-600",
  confirmed: "bg-emerald-500/20 text-emerald-600",
  cancelled: "bg-red-500/20 text-red-600",
  completed: "bg-blue-500/20 text-blue-600",
  no_show: "bg-muted text-muted-foreground",
};

export default function AdminAppointments() {
  const { isAuthenticated } = useClinicAuth();
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: clinic } = trpc.clinic.mine.useQuery(undefined, { enabled: isAuthenticated });
  const { data: appointments, refetch } = trpc.appointments.list.useQuery(
    { status: statusFilter || undefined, limit: 100 },
    { enabled: !!clinic }
  );

  const updateStatus = trpc.appointments.updateStatus.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/painel")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-primary" />
            <h1 className="font-bold">Agendamentos</h1>
            <span className="text-xs text-muted-foreground ml-1">({(appointments ?? []).length})</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Filter */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {["", "pending", "confirmed", "completed", "cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                statusFilter === s ? "gradient-gold text-white border-transparent" : "border-border text-muted-foreground hover:border-primary"
              }`}
            >
              {s === "" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* List */}
        {(appointments ?? []).length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhum agendamento encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(appointments ?? []).map((appt) => {
              const date = new Date(appt.scheduledAt);
              return (
                <div key={appt.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {date.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })} às{" "}
                          {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Lead ID: {appt.leadId} · {appt.consultationType}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABELS[appt.status] ?? appt.status}
                    </span>
                  </div>

                  {appt.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: "confirmed" })}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-500/30 text-red-500 hover:bg-red-500/10"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: "cancelled" })}
                        disabled={updateStatus.isPending}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancelar
                      </Button>
                    </div>
                  )}
                  {appt.status === "confirmed" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-0"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: "completed" })}
                        disabled={updateStatus.isPending}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Marcar concluído
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateStatus.mutate({ id: appt.id, status: "no_show" })}
                        disabled={updateStatus.isPending}
                      >
                        Não compareceu
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
