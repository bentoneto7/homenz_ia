import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Clock, ChevronRight, ChevronLeft } from "lucide-react";

const TIMES = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function FunnelSchedule() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const createAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => {
      navigate(`/c/${slug}/confirmacao/${token}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const isDateDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return d < todayStart || d.getDay() === 0; // Disable past dates and Sundays
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day &&
      selectedDate.getMonth() === viewMonth &&
      selectedDate.getFullYear() === viewYear;
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Selecione data e horário");
      return;
    }
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes ?? 0, 0, 0);

    createAppointment.mutate({
      sessionToken: token ?? "",
      scheduledAt: scheduledAt.getTime(),
      consultationType: "evaluation",
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="gradient-dark px-4 pt-8 pb-10">
        <div className="max-w-lg mx-auto text-center">
          <Calendar className="w-10 h-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white mb-1">Agendar consulta</h1>
          <p className="text-white/60 text-sm">Consulta gratuita e sem compromisso</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4">
        {/* Calendar */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-sm">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-xs text-muted-foreground py-1 font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isDateDisabled(day);
              const selected = isSelected(day);
              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => setSelectedDate(new Date(viewYear, viewMonth, day))}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all ${
                    selected
                      ? "gradient-gold text-white"
                      : disabled
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="bg-card border border-border rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Horários disponíveis</h3>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    selectedTime === time
                      ? "gradient-gold text-white border-transparent"
                      : "border-border hover:border-primary text-foreground"
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        {selectedDate && selectedTime && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-4">
            <p className="text-sm font-medium text-primary mb-1">Consulta selecionada:</p>
            <p className="text-sm">
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {selectedTime}
            </p>
          </div>
        )}

        {/* CTA */}
        <Button
          onClick={handleSchedule}
          className="w-full gradient-gold text-white border-0 py-5 text-base"
          disabled={!selectedDate || !selectedTime || createAppointment.isPending}
        >
          {createAppointment.isPending ? "Agendando..." : (
            <>
              Confirmar agendamento
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Você receberá uma confirmação após o agendamento
        </p>
      </div>
    </div>
  );
}
