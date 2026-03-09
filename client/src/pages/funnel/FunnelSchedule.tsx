import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Calendar, Clock, ChevronRight, ChevronLeft, CheckCircle2, Sparkles, Shield } from "lucide-react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DAYS_FULL = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function FunnelSchedule() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const today = new Date();

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; datetime: string } | null>(null);
  const [step, setStep] = useState<"calendar" | "time" | "confirm">("calendar");

  // Buscar clínica pelo slug
  const { data: clinic } = trpc.clinic.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // Buscar slots disponíveis para a data selecionada
  const { data: slotsData, isLoading: loadingSlots } = trpc.availability.getSlots.useQuery(
    { clinicId: clinic?.id ?? 0, date: selectedDateStr ?? "" },
    { enabled: !!clinic?.id && !!selectedDateStr }
  );

  const updateStep = trpc.leads.updateStep.useMutation();

  const createAppointment = trpc.appointments.create.useMutation({
    onSuccess: () => navigate(`/c/${slug}/confirmacao/${token}`),
    onError: (err) => toast.error("Erro ao agendar: " + err.message),
  });

  // Calendário
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
    const limit = new Date(todayStart);
    limit.setDate(limit.getDate() + 60);
    return d < todayStart || d > limit;
  };

  const handleDaySelect = (day: number) => {
    if (isDateDisabled(day)) return;
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    setSelectedDateStr(dateStr);
    setSelectedSlot(null);
    setStep("time");
    updateStep.mutate({ sessionToken: token ?? "", funnelStep: "schedule_started" });
  };

  const handleSlotSelect = (slot: { time: string; datetime: string; available: boolean }) => {
    if (!slot.available) return;
    setSelectedSlot({ time: slot.time, datetime: slot.datetime });
    setStep("confirm");
  };

  const handleConfirm = () => {
    if (!selectedSlot || !token) return;
    const ts = new Date(selectedSlot.datetime).getTime();
    createAppointment.mutate({
      sessionToken: token,
      scheduledAt: ts,
      consultationType: "evaluation",
    });
  };

  // Formatar data selecionada
  const formattedDate = useMemo(() => {
    if (!selectedDateStr) return "";
    const [y, m, d] = selectedDateStr.split("-").map(Number);
    const date = new Date(y!, m! - 1, d!);
    return `${DAYS_FULL[date.getDay()]}, ${d} de ${MONTHS[m! - 1]} de ${y}`;
  }, [selectedDateStr]);

  const availableSlots = slotsData?.slots?.filter(s => s.available) ?? [];
  const allSlots = slotsData?.slots ?? [];
  const isBlocked = slotsData?.blocked;
  const hasNoSlots = slotsData && !isBlocked && allSlots.length === 0;

  const selectedDayNum = selectedDateStr ? parseInt(selectedDateStr.split("-")[2]!) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {step !== "calendar" && (
            <button
              onClick={() => step === "time" ? setStep("calendar") : setStep("time")}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1">
            <p className="font-bold text-sm">Agendar Consulta Gratuita</p>
            <p className="text-xs text-white/40">
              {step === "calendar" && "Escolha o melhor dia"}
              {step === "time" && formattedDate}
              {step === "confirm" && "Confirme seu agendamento"}
            </p>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5">
            {(["calendar", "time", "confirm"] as const).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s ? "w-6 bg-[#D4A843]" :
                  (["calendar","time","confirm"].indexOf(step) > i) ? "w-3 bg-[#D4A843]/50" :
                  "w-3 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── CALENDÁRIO ─────────────────────────────────────────────── */}
        {step === "calendar" && (
          <>
            <div className="text-center space-y-1 pb-2">
              <div className="inline-flex items-center gap-2 bg-[#D4A843]/10 border border-[#D4A843]/20 rounded-full px-4 py-1.5 text-[#D4A843] text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5" />
                Consulta 100% gratuita · Uberaba/MG
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-sm">{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-[10px] text-white/30 py-1 font-semibold uppercase">{d}</div>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const disabled = isDateDisabled(day);
                  const dateStr = formatDateStr(viewYear, viewMonth, day);
                  const selected = selectedDateStr === dateStr;
                  const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

                  return (
                    <button
                      key={day}
                      disabled={disabled}
                      onClick={() => handleDaySelect(day)}
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

            {/* Legenda */}
            <div className="flex items-center justify-center gap-5 text-xs text-white/40">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded gradient-gold" /><span>Selecionado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded border border-[#D4A843]/40 bg-white/10" /><span>Hoje</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white/10" /><span>Indisponível</span></div>
            </div>

            {/* Benefícios */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: "🎯", label: "Avaliação gratuita" },
                { icon: "⏱️", label: "Duração: 1 hora" },
                { icon: "🏆", label: "Especialista certificado" },
              ].map(b => (
                <div key={b.label} className="bg-white/3 border border-white/8 rounded-xl p-3 text-center">
                  <div className="text-lg mb-1">{b.icon}</div>
                  <p className="text-[10px] text-white/50">{b.label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── HORÁRIOS ───────────────────────────────────────────────── */}
        {step === "time" && (
          <>
            <div className="text-center space-y-1">
              <p className="text-white/50 text-sm">Horários disponíveis para</p>
              <p className="font-bold text-base text-[#D4A843]">{formattedDate}</p>
            </div>

            {loadingSlots && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-10 h-10 border-2 border-[#D4A843]/30 border-t-[#D4A843] rounded-full animate-spin" />
                <p className="text-white/50 text-sm">Verificando disponibilidade...</p>
              </div>
            )}

            {isBlocked && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <p className="text-2xl mb-2">🚫</p>
                <p className="font-semibold text-red-400">Data indisponível</p>
                <p className="text-sm text-white/50 mt-1">{slotsData?.reason ?? "A clínica não atende neste dia."}</p>
                <button onClick={() => setStep("calendar")} className="mt-4 text-sm text-[#D4A843] underline">
                  Escolher outra data
                </button>
              </div>
            )}

            {hasNoSlots && !loadingSlots && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <p className="text-2xl mb-2">📅</p>
                <p className="font-semibold">Sem horários disponíveis</p>
                <p className="text-sm text-white/50 mt-1">Todos os horários deste dia já foram reservados.</p>
                <button onClick={() => setStep("calendar")} className="mt-4 text-sm text-[#D4A843] underline">
                  Escolher outra data
                </button>
              </div>
            )}

            {!loadingSlots && !isBlocked && allSlots.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <Clock className="w-4 h-4" />
                  <span>{availableSlots.length} horário{availableSlots.length !== 1 ? "s" : ""} disponível{availableSlots.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {allSlots.map(slot => (
                    <button
                      key={slot.time}
                      onClick={() => handleSlotSelect(slot)}
                      disabled={!slot.available}
                      className={`py-3 rounded-xl text-sm font-semibold transition-all border ${
                        !slot.available
                          ? "border-white/5 text-white/20 cursor-not-allowed line-through"
                          : selectedSlot?.time === slot.time
                          ? "gradient-gold text-black border-transparent shadow-[0_0_10px_rgba(212,168,67,0.3)]"
                          : "border-white/10 hover:border-[#D4A843]/40 text-white/70 hover:text-white bg-white/3"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/30 text-center">Horários riscados já foram reservados</p>
              </>
            )}

            {/* Fallback: se a clínica ainda não configurou disponibilidade, mostrar horários padrão */}
            {!loadingSlots && !slotsData && (
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4 text-center">
                <p className="text-sm text-amber-300">A clínica ainda está configurando os horários disponíveis.</p>
                <p className="text-xs text-white/40 mt-1">Entre em contato diretamente para agendar.</p>
                {clinic?.whatsapp && (
                  <a
                    href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
                  >
                    📱 Falar no WhatsApp
                  </a>
                )}
              </div>
            )}
          </>
        )}

        {/* ── CONFIRMAÇÃO ────────────────────────────────────────────── */}
        {step === "confirm" && (
          <>
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-[#D4A843]/10 border border-[#D4A843]/20 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-[#D4A843]" />
              </div>
              <h2 className="text-xl font-bold">Confirmar agendamento</h2>
              <p className="text-white/50 text-sm">Revise os detalhes antes de confirmar</p>
            </div>

            {/* Resumo */}
            <div className="bg-gradient-to-br from-[#D4A843]/10 to-[#D4A843]/5 border border-[#D4A843]/20 rounded-2xl p-5 space-y-4">
              {[
                { icon: <Calendar className="w-5 h-5 text-[#D4A843]" />, label: "Data", value: formattedDate },
                { icon: <Clock className="w-5 h-5 text-[#D4A843]" />, label: "Horário", value: selectedSlot?.time },
                { icon: <Sparkles className="w-5 h-5 text-[#D4A843]" />, label: "Tipo", value: "Avaliação Capilar Gratuita" },
                ...(clinic ? [{ icon: <Shield className="w-5 h-5 text-[#D4A843]" />, label: "Clínica", value: clinic.name }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4A843]/20 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs text-white/40">{item.label}</p>
                    <p className="font-semibold text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Aviso */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/60">
              <p className="font-medium text-white/80 mb-1">⚠️ Importante</p>
              <p>Compareça com 10 minutos de antecedência. Em caso de imprevisto, entre em contato com a clínica para reagendar.</p>
            </div>

            {/* O que está incluído */}
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
          </>
        )}
      </div>

      {/* Fixed CTA */}
      {(step === "calendar" && selectedDateStr) || step === "time" || step === "confirm" ? (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur border-t border-white/10 px-4 py-4">
          <div className="max-w-lg mx-auto">
            {step === "calendar" && selectedDateStr && (
              <button
                onClick={() => setStep("time")}
                className="w-full gradient-gold text-black font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2"
              >
                Ver horários disponíveis <ChevronRight className="w-5 h-5" />
              </button>
            )}
            {step === "confirm" && (
              <button
                onClick={handleConfirm}
                disabled={createAppointment.isPending}
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
            )}
            <p className="text-xs text-white/30 text-center mt-2">
              Você receberá uma confirmação após o agendamento
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
