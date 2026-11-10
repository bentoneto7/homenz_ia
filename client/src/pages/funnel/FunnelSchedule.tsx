import { useState, useMemo, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  CaretRight,
  CaretLeft,
  CheckCircle,
  Sparkle,
  ShieldCheck,
  Target,
  Timer,
  Trophy,
  Prohibit,
  CalendarX,
  WhatsappLogo,
  IconContext,
} from "@phosphor-icons/react";
import { useFunnelTheme } from "./useFunnelTheme";
import { FunnelThemeToggle } from "./FunnelThemeToggle";

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

const accentTint = "color-mix(in oklab, var(--fn-accent) 12%, transparent)";
const accentLine = "color-mix(in oklab, var(--fn-accent) 30%, transparent)";

export default function FunnelSchedule() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [, navigate] = useLocation();
  const today = new Date();
  const { mode, toggle } = useFunnelTheme();

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

  // Remove o dark mode do painel (shadcn) — o funil tem o próprio tema (.funnel-theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  return (
    <IconContext.Provider value={{ weight: "duotone" }}>
    <div className="funnel-theme min-h-[100dvh] pb-32">
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-3"
        style={{ background: "color-mix(in oklab, var(--fn-bg) 88%, transparent)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--fn-line)" }}
      >
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {step !== "calendar" && (
            <button
              onClick={() => step === "time" ? setStep("calendar") : setStep("time")}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: accentTint, color: "var(--fn-accent)" }}
              aria-label="Voltar"
            >
              <CaretLeft className="w-4 h-4" weight="bold" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm" style={{ color: "var(--fn-ink)" }}>Agendar Consulta Gratuita</p>
            <p className="text-xs truncate" style={{ color: "var(--fn-muted)" }}>
              {step === "calendar" && "Escolha o melhor dia"}
              {step === "time" && formattedDate}
              {step === "confirm" && "Confirme seu agendamento"}
            </p>
          </div>
          {/* Step dots */}
          <div className="flex gap-1.5 items-center">
            {(["calendar", "time", "confirm"] as const).map((s, i) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: step === s ? "1.5rem" : "0.75rem",
                  background:
                    step === s
                      ? "var(--fn-accent)"
                      : ["calendar","time","confirm"].indexOf(step) > i
                      ? accentLine
                      : "var(--fn-line)",
                }}
              />
            ))}
          </div>
          <FunnelThemeToggle mode={mode} onToggle={toggle} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* ── CALENDÁRIO ─────────────────────────────────────────────── */}
        {step === "calendar" && (
          <>
            <div className="text-center space-y-1 pb-2">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
                style={{ background: accentTint, border: `1px solid ${accentLine}`, color: "var(--fn-accent)" }}
              >
                <Calendar className="w-3.5 h-3.5" />
                Consulta 100% gratuita{clinic?.city ? ` · ${clinic.city}/${clinic.state}` : ""}
              </div>
            </div>

            <div className="rounded-2xl p-5" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
              {/* Navegação do mês */}
              <div className="flex items-center justify-between mb-5">
                <button onClick={prevMonth} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: "var(--fn-body)" }} aria-label="Mês anterior">
                  <CaretLeft className="w-4 h-4" weight="bold" />
                </button>
                <span className="font-bold text-sm" style={{ color: "var(--fn-ink)" }}>{MONTHS[viewMonth]} {viewYear}</span>
                <button onClick={nextMonth} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ color: "var(--fn-body)" }} aria-label="Próximo mês">
                  <CaretRight className="w-4 h-4" weight="bold" />
                </button>
              </div>

              {/* Cabeçalho dos dias */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-[10px] py-1 font-semibold uppercase" style={{ color: "var(--fn-muted)" }}>{d}</div>
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

                  const dayStyle: React.CSSProperties = selected
                    ? { background: "var(--fn-accent)", color: "var(--fn-accent-ink)", fontWeight: 700 }
                    : disabled
                    ? { color: "var(--fn-muted)", opacity: 0.45, cursor: "not-allowed" }
                    : isToday
                    ? { background: accentTint, color: "var(--fn-accent)", border: `1px solid ${accentLine}`, fontWeight: 700 }
                    : { color: "var(--fn-body)" };

                  return (
                    <button
                      key={day}
                      disabled={disabled}
                      onClick={() => handleDaySelect(day)}
                      className="aspect-square rounded-lg text-sm font-medium transition-all relative enabled:hover:brightness-110"
                      style={dayStyle}
                    >
                      {day}
                      {isToday && !selected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: "var(--fn-accent)" }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center justify-center gap-5 text-xs" style={{ color: "var(--fn-muted)" }}>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: "var(--fn-accent)" }} /><span>Selecionado</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: accentTint, border: `1px solid ${accentLine}` }} /><span>Hoje</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded" style={{ background: "var(--fn-line)" }} /><span>Indisponível</span></div>
            </div>

            {/* Benefícios */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { Icon: Target, label: "Avaliação gratuita" },
                { Icon: Timer, label: "Duração: 1 hora" },
                { Icon: Trophy, label: "Especialista certificado" },
              ].map(({ Icon, label }) => (
                <div key={label} className="rounded-xl p-3 text-center" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg mb-1" style={{ background: accentTint, color: "var(--fn-accent)" }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <p className="text-[10px]" style={{ color: "var(--fn-muted)" }}>{label}</p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── HORÁRIOS ───────────────────────────────────────────────── */}
        {step === "time" && (
          <>
            <div className="text-center space-y-1">
              <p className="text-sm" style={{ color: "var(--fn-muted)" }}>Horários disponíveis para</p>
              <p className="font-bold text-base" style={{ color: "var(--fn-accent)" }}>{formattedDate}</p>
            </div>

            {loadingSlots && (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: accentLine, borderTopColor: "var(--fn-accent)" }} />
                <p className="text-sm" style={{ color: "var(--fn-muted)" }}>Verificando disponibilidade...</p>
              </div>
            )}

            {isBlocked && (
              <div className="rounded-2xl p-6 text-center" style={{ background: "color-mix(in oklab, #ef4444 10%, transparent)", border: "1px solid color-mix(in oklab, #ef4444 22%, transparent)" }}>
                <Prohibit className="w-8 h-8 mx-auto mb-2" weight="fill" style={{ color: "#f87171" }} />
                <p className="font-semibold" style={{ color: "#f87171" }}>Data indisponível</p>
                <p className="text-sm mt-1" style={{ color: "var(--fn-muted)" }}>{slotsData?.reason ?? "A clínica não atende neste dia."}</p>
                <button onClick={() => setStep("calendar")} className="mt-4 text-sm underline" style={{ color: "var(--fn-accent)" }}>
                  Escolher outra data
                </button>
              </div>
            )}

            {hasNoSlots && !loadingSlots && (
              <div className="rounded-2xl p-6 text-center" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
                <CalendarX className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--fn-muted)" }} />
                <p className="font-semibold" style={{ color: "var(--fn-ink)" }}>Sem horários disponíveis</p>
                <p className="text-sm mt-1" style={{ color: "var(--fn-muted)" }}>Todos os horários deste dia já foram reservados.</p>
                <button onClick={() => setStep("calendar")} className="mt-4 text-sm underline" style={{ color: "var(--fn-accent)" }}>
                  Escolher outra data
                </button>
              </div>
            )}

            {!loadingSlots && !isBlocked && allSlots.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--fn-muted)" }}>
                  <Clock className="w-4 h-4" />
                  <span>{availableSlots.length} horário{availableSlots.length !== 1 ? "s" : ""} disponível{availableSlots.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {allSlots.map(slot => {
                    const slotStyle: React.CSSProperties = !slot.available
                      ? { border: "1px solid var(--fn-line)", color: "var(--fn-muted)", opacity: 0.6, textDecoration: "line-through", cursor: "not-allowed" }
                      : selectedSlot?.time === slot.time
                      ? { background: "var(--fn-accent)", color: "var(--fn-accent-ink)", border: "1px solid transparent" }
                      : { border: "1px solid var(--fn-line)", color: "var(--fn-body)", background: "var(--fn-elevated)" };
                    return (
                      <button
                        key={slot.time}
                        onClick={() => handleSlotSelect(slot)}
                        disabled={!slot.available}
                        className="py-3 rounded-xl text-sm font-semibold transition-all enabled:hover:brightness-110"
                        style={slotStyle}
                      >
                        {slot.time}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-center" style={{ color: "var(--fn-muted)" }}>Horários riscados já foram reservados</p>
              </>
            )}

            {/* Fallback: se a clínica ainda não configurou disponibilidade, mostrar horários padrão */}
            {!loadingSlots && !slotsData && (
              <div className="rounded-2xl p-4 text-center" style={{ background: "color-mix(in oklab, #f59e0b 10%, transparent)", border: "1px solid color-mix(in oklab, #f59e0b 22%, transparent)" }}>
                <p className="text-sm" style={{ color: "#fbbf24" }}>A clínica ainda está configurando os horários disponíveis.</p>
                <p className="text-xs mt-1" style={{ color: "var(--fn-muted)" }}>Entre em contato diretamente para agendar.</p>
                {clinic?.whatsapp && (
                  <a
                    href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-3 bg-[#004A9D] text-white text-sm font-semibold px-4 py-2 rounded-xl"
                  >
                    <WhatsappLogo className="w-4 h-4" weight="fill" /> Falar no WhatsApp
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
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: accentTint, border: `1px solid ${accentLine}` }}>
                <CheckCircle className="w-8 h-8" weight="fill" style={{ color: "var(--fn-accent)" }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: "var(--fn-ink)" }}>Confirmar agendamento</h2>
              <p className="text-sm" style={{ color: "var(--fn-muted)" }}>Revise os detalhes antes de confirmar</p>
            </div>

            {/* Resumo */}
            <div className="rounded-2xl p-5 space-y-4" style={{ background: accentTint, border: `1px solid ${accentLine}` }}>
              {[
                { Icon: Calendar, label: "Data", value: formattedDate },
                { Icon: Clock, label: "Horário", value: selectedSlot?.time },
                { Icon: Sparkle, label: "Tipo", value: "Avaliação Capilar Gratuita" },
                ...(clinic ? [{ Icon: ShieldCheck, label: "Clínica", value: clinic.name }] : []),
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--fn-surface)" }}>
                    <item.Icon className="w-5 h-5" style={{ color: "var(--fn-accent)" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--fn-muted)" }}>{item.label}</p>
                    <p className="font-semibold text-sm" style={{ color: "var(--fn-ink)" }}>{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Aviso */}
            <div className="rounded-xl p-4 text-sm" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)", color: "var(--fn-muted)" }}>
              <p className="font-medium mb-1" style={{ color: "var(--fn-ink)" }}>Importante</p>
              <p>Compareça com 10 minutos de antecedência. Em caso de imprevisto, entre em contato com a clínica para reagendar.</p>
            </div>

            {/* O que está incluído */}
            <div className="rounded-2xl p-4" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
              <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: "var(--fn-muted)" }}>O que está incluído</p>
              <div className="space-y-2">
                {[
                  "Avaliação completa do couro cabeludo",
                  "Apresentação do resultado 3D gerado pela IA",
                  "Orçamento personalizado sem compromisso",
                  "Atendimento com especialista certificado",
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" weight="fill" style={{ color: "var(--fn-success)" }} />
                    <span className="text-xs" style={{ color: "var(--fn-body)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Fixed CTA */}
      {(step === "calendar" && selectedDateStr) || step === "time" || step === "confirm" ? (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 py-4"
          style={{ background: "color-mix(in oklab, var(--fn-bg) 88%, transparent)", backdropFilter: "blur(8px)", borderTop: "1px solid var(--fn-line)" }}
        >
          <div className="max-w-lg mx-auto">
            {step === "calendar" && selectedDateStr && (
              <button
                onClick={() => setStep("time")}
                className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-opacity"
                style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
              >
                Ver horários disponíveis <CaretRight className="w-5 h-5" weight="bold" />
              </button>
            )}
            {step === "confirm" && (
              <button
                onClick={handleConfirm}
                disabled={createAppointment.isPending}
                className="fn-cta-glow w-full font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
                style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}
              >
                {createAppointment.isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: "var(--fn-accent-ink)", borderTopColor: "transparent" }} />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Sparkle className="w-5 h-5" weight="fill" />
                    Confirmar agendamento
                    <CaretRight className="w-5 h-5" weight="bold" />
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-center mt-2" style={{ color: "var(--fn-muted)" }}>
              Você receberá uma confirmação após o agendamento
            </p>
          </div>
        </div>
      ) : null}
    </div>
    </IconContext.Provider>
  );
}
