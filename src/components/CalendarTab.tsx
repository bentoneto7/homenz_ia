import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Calendar, Clock, User, Phone, CheckCircle2, XCircle, AlertCircle, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

type LeadInfo = { id: string; name: string; phone: string; hair_loss_type: string | null };
type SellerInfo = { id: string; name: string };
type Appointment = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes: string | null;
  lead_id: string;
  seller_id: string;
  leads: LeadInfo | LeadInfo[] | null;
  profiles: SellerInfo | SellerInfo[] | null;
};
function getLead(a: Appointment): LeadInfo | null {
  if (!a.leads) return null;
  return Array.isArray(a.leads) ? a.leads[0] ?? null : a.leads;
}
function getSeller(a: Appointment): SellerInfo | null {
  if (!a.profiles) return null;
  return Array.isArray(a.profiles) ? a.profiles[0] ?? null : a.profiles;
}

const STATUS_CONFIG = {
  pending:   { label: "Pendente",   color: "bg-amber-100 text-amber-700 border-amber-200",  dot: "bg-amber-400" },
  confirmed: { label: "Confirmado", color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  completed: { label: "Realizado",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelado",  color: "bg-red-100 text-red-700 border-red-200",        dot: "bg-red-400" },
  no_show:   { label: "Faltou",     color: "bg-gray-100 text-gray-600 border-gray-200",     dot: "bg-gray-400" },
};

const DAYS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function CalendarTab() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);

  // Buscar agendamentos do mês atual
  const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString();
  const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("appointments")
      .select("id, scheduled_at, duration_minutes, status, notes, lead_id, leads:lead_id(id, name, phone, hair_loss_type), profiles:confirmed_by_user_id(id, name)")
      .gte("scheduled_at", startDate)
      .lte("scheduled_at", endDate)
      .order("scheduled_at");
    setAppointments((data as unknown as Appointment[]) ?? []);
    setIsLoading(false);
  }, [startDate, endDate]);

  useEffect(() => { refetch(); const t = setInterval(refetch, 60000); return () => clearInterval(t); }, [refetch]);

  const updateStatus = useCallback(async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status atualizado!");
    await refetch();
    setSelectedAppt(null);
  }, [refetch]);

  // Agrupar agendamentos por dia
  const apptsByDay = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((a: Appointment) => {
      const key = new Date(a.scheduled_at).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [appointments]);

  // Dias do calendário (incluindo padding)
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  }, [currentMonth]);

  const selectedDayAppts = selectedDate ? (apptsByDay[selectedDate.toDateString()] ?? []) : [];

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[#0A2540] font-bold text-lg" style={{ fontFamily: "'Montserrat', sans-serif" }}>Agenda de Consultas</h4>
          <p className="text-[#5A667A] text-sm mt-0.5">Visualize e gerencie os agendamentos da sua franquia</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-3 py-1.5">
          <span className="w-2 h-2 rounded-full bg-[#00C1B8]" />
          <span className="text-xs font-semibold text-[#0A2540]">{appointments.length} agendamentos</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendário */}
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          {/* Navegação do mês */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-[#F0F4F8] transition-colors text-[#5A667A]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h5 className="text-[#0A2540] font-bold text-base" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {MONTHS_PT[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h5>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-[#F0F4F8] transition-colors text-[#5A667A]">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_PT.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-[#A0AABB] py-1">{d}</div>
            ))}
          </div>

          {/* Grid de dias */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 text-[#00C1B8] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />;
                const key = day.toDateString();
                const dayAppts = apptsByDay[key] ?? [];
                const isToday = isSameDay(day, today);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const hasAppts = dayAppts.length > 0;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ${
                      isSelected
                        ? "bg-[#004A9D] text-white shadow-md"
                        : isToday
                        ? "bg-[#EBF4FF] text-[#004A9D] font-bold"
                        : "text-[#0A2540] hover:bg-[#F0F4F8]"
                    }`}
                  >
                    {day.getDate()}
                    {hasAppts && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayAppts.slice(0, 3).map((a: Appointment, idx: number) => (
                          <span
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSelected ? "bg-white/80" : STATUS_CONFIG[a.status]?.dot ?? "bg-[#00C1B8]"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-[#E2E8F0]">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <span key={key} className="flex items-center gap-1.5 text-xs text-[#5A667A]">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </span>
            ))}
          </div>
        </div>

        {/* Painel lateral — agendamentos do dia selecionado */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-[#004A9D]" />
            <h5 className="text-[#0A2540] font-bold text-sm">
              {selectedDate
                ? `${selectedDate.getDate()} de ${MONTHS_PT[selectedDate.getMonth()]}`
                : "Selecione um dia"}
            </h5>
          </div>

          {selectedDayAppts.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-8 h-8 text-[#C0CADB] mx-auto mb-2" />
              <p className="text-[#A0AABB] text-sm">Nenhum agendamento</p>
              <p className="text-[#C0CADB] text-xs mt-1">para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayAppts
                .sort((a: Appointment, b: Appointment) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                .map((appt: Appointment) => {
                  const cfg = STATUS_CONFIG[appt.status];
                  const time = new Date(appt.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
                  return (
                    <div
                      key={appt.id}
                      className="border border-[#E2E8F0] rounded-xl p-3 hover:shadow-sm transition-all cursor-pointer"
                      onClick={() => setSelectedAppt(appt)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-[#0A2540] font-semibold text-sm">
                          <Clock className="w-3.5 h-3.5 text-[#5A667A]" />
                          {time}
                          <span className="text-[#A0AABB] font-normal text-xs">· {appt.duration_minutes}min</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-[#0A2540]">
                        <User className="w-3.5 h-3.5 text-[#5A667A]" />
                        <span className="font-medium truncate">{getLead(appt)?.name ?? "—"}</span>
                      </div>
                      {getLead(appt)?.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-[#5A667A] mt-1">
                          <Phone className="w-3 h-3" />
                          {getLead(appt)?.phone}
                        </div>
                      )}
                      {getSeller(appt)?.name && (
                        <div className="text-xs text-[#A0AABB] mt-1">
                          Vendedor: {getSeller(appt)?.name}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de detalhes do agendamento */}
      {selectedAppt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedAppt(null)}>
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0A2540]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Detalhes do Agendamento</h3>
              <button onClick={() => setSelectedAppt(null)} className="p-2 hover:bg-[#F0F4F8] rounded-xl transition-colors">
                <XCircle className="w-5 h-5 text-[#A0AABB]" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="bg-[#F0F4F8] rounded-xl p-3">
                <p className="text-xs text-[#5A667A] mb-0.5">Cliente</p>
                <p className="font-semibold text-[#0A2540]">{getLead(selectedAppt)?.name ?? "—"}</p>
                <p className="text-sm text-[#5A667A]">{getLead(selectedAppt)?.phone}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F0F4F8] rounded-xl p-3">
                  <p className="text-xs text-[#5A667A] mb-0.5">Data e hora</p>
                  <p className="font-semibold text-[#0A2540] text-sm">
                    {new Date(selectedAppt.scheduled_at).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="text-sm text-[#5A667A]">
                    {new Date(selectedAppt.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="bg-[#F0F4F8] rounded-xl p-3">
                  <p className="text-xs text-[#5A667A] mb-0.5">Duração</p>
                  <p className="font-semibold text-[#0A2540] text-sm">{selectedAppt.duration_minutes} min</p>
                </div>
              </div>
              {selectedAppt.notes && (
                <div className="bg-[#F0F4F8] rounded-xl p-3">
                  <p className="text-xs text-[#5A667A] mb-0.5">Observações</p>
                  <p className="text-sm text-[#0A2540]">{selectedAppt.notes}</p>
                </div>
              )}
            </div>

            {/* Ações de status */}
            <div>
              <p className="text-xs font-semibold text-[#5A667A] mb-2">Atualizar status:</p>
              <div className="grid grid-cols-2 gap-2">
                {(["confirmed", "completed", "cancelled", "no_show"] as const).map((s) => {
                  const cfg = STATUS_CONFIG[s];
                  return (
                    <button
                      key={s}
                      onClick={() => updateStatus(selectedAppt.id, s)}
                      disabled={selectedAppt.status === s}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        selectedAppt.status === s
                          ? cfg.color + " opacity-60 cursor-default"
                          : "border-[#E2E8F0] text-[#5A667A] hover:bg-[#F0F4F8]"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
