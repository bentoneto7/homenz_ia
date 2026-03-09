import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle2, Sparkles } from "lucide-react";

const TIMES = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function FunnelSchedule() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const createAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => navigate(`/c/${slug}/confirmacao/${token}`),
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
    return d < todayStart || d.getDay() === 0;
  };

  const isSelected = (day: number) =>
    !!selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

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
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32">
      {/* Header */}
      <div className="relative px-4 pt-10 pb-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#D4A843]/8 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-7 h-7 text-black" />
          </div>
          <h1 className="text-2xl font-bold mb-1">Agendar consulta gratuita</h1>
          <p className="text-white/50 text-sm">Escolha o melhor dia e horário para você</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Calendar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-sm">{MONTHS[viewMonth]} {viewYear}</span>
            <button
              onClick={nextMonth}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-[10px] text-white/30 py-1 font-semibold uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const disabled = isDateDisabled(day);
              const selected = isSelected(day);
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();
              return (
                <button
                  key={day}
                  disabled={disabled}
                  onClick={() => setSelectedDate(new Date(viewYear, viewMonth, day))}
                  className={`aspect-square rounded-lg text-sm font-medium transition-all relative ${
                    selected
                      ? "gradient-gold text-black font-bold shadow-[0_0_12px_rgba(212,168,67,0.4)]"
                      : disabled
                      ? "text-white/15 cursor-not-allowed"
                      : isToday
                      ? "bg-white/10 text-white border border-[#D4A843]/40"
                      : "hover:bg-white/10 text-white/70 hover:text-white"
                  }`}
                >
                  {day}
                  {isToday && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#D4A843]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        {selectedDate && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-[#D4A843]" />
              <h3 className="font-semibold text-sm">Horários disponíveis</h3>
              <span className="ml-auto text-xs text-white/40">
                {selectedDate.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" })}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {TIMES.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    selectedTime === time
                      ? "gradient-gold text-black border-transparent shadow-[0_0_10px_rgba(212,168,67,0.3)]"
                      : "border-white/10 hover:border-[#D4A843]/40 text-white/70 hover:text-white bg-white/3"
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
          <div className="bg-[#D4A843]/10 border border-[#D4A843]/20 rounded-2xl p-4 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-[#D4A843]" />
              <p className="text-sm font-semibold text-[#D4A843]">Consulta selecionada</p>
            </div>
            <p className="text-sm text-white capitalize">
              {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} às {selectedTime}
            </p>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-white/3 border border-white/5 rounded-2xl p-4">
          <p className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-3">O que está incluído</p>
          <div className="space-y-2">
            {[
              "Avaliação completa do couro cabeludo",
              "Apresentação do resultado 3D gerado pela IA",
              "Orçamento personalizado sem compromisso",
              "Atendimento com especialista certificado",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span className="text-xs text-white/60">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10 px-4 py-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSchedule}
            disabled={!selectedDate || !selectedTime || createAppointment.isPending}
            className="w-full gradient-gold text-black font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            {createAppointment.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Confirmar agendamento
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
          <p className="text-xs text-white/30 text-center mt-2">
            Você receberá uma confirmação após o agendamento
          </p>
        </div>
      </div>
    </div>
  );
}
