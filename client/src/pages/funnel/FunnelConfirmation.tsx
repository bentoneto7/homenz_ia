import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  WhatsappLogo,
  Star,
  CaretRight,
  IconContext,
} from "@phosphor-icons/react";
import { useFunnelTheme } from "./useFunnelTheme";
import { FunnelThemeToggle } from "./FunnelThemeToggle";

const accentTint = "color-mix(in oklab, var(--fn-accent) 12%, transparent)";
const accentLine = "color-mix(in oklab, var(--fn-accent) 30%, transparent)";

export default function FunnelConfirmation() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [showConfetti, setShowConfetti] = useState(false);
  const { mode, toggle } = useFunnelTheme();

  const { data: appointment } = trpc.appointments.getByToken.useQuery(
    { sessionToken: token ?? "" },
    { enabled: !!token }
  );

  const { data: clinic } = trpc.clinic.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  // Remove o dark mode do painel (shadcn) — o funil tem o próprio tema (.funnel-theme)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
  }, []);

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const scheduledDate = appointment?.scheduledAt ? new Date(appointment.scheduledAt) : null;

  return (
    <IconContext.Provider value={{ weight: "duotone" }}>
    <div className="funnel-theme min-h-[100dvh] flex flex-col items-center justify-start px-4 py-10">
      <FunnelThemeToggle mode={mode} onToggle={toggle} className="fixed top-4 right-4 z-30" />
      {/* Confetti particles */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm animate-bounce"
              style={{
                left: `${(i * 53) % 100}%`,
                top: `-${(i * 7) % 20}px`,
                backgroundColor: ["#004A9D", "#3B82F6", "#3b82f6", "#f59e0b"][i % 4],
                animationDelay: `${(i % 10) * 0.1}s`,
                animationDuration: `${1 + (i % 3) * 0.6}s`,
                transform: `rotate(${(i * 37) % 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-md w-full">
        {/* Success hero */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "color-mix(in oklab, var(--fn-accent) 22%, transparent)" }} />
            <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: accentTint, border: `1px solid ${accentLine}` }}>
              <div className="fn-cta-glow w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--fn-accent)" }}>
                <CheckCircle className="w-8 h-8" weight="fill" style={{ color: "var(--fn-accent-ink)" }} />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--fn-ink)" }}>
            Consulta agendada!
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--fn-muted)" }}>
            Sua consulta foi confirmada com sucesso.<br />
            Aguardamos você para transformar seu visual!
          </p>
        </div>

        {/* Appointment card */}
        {scheduledDate && (
          <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
            <div className="flex items-center gap-3 mb-4 pb-4" style={{ borderBottom: "1px solid var(--fn-line)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--fn-accent)" }}>
                <Calendar className="w-5 h-5" style={{ color: "var(--fn-accent-ink)" }} />
              </div>
              <div>
                <p className="font-bold" style={{ color: "var(--fn-ink)" }}>{clinic?.name ?? "Clínica Capilar"}</p>
                <p className="text-xs flex items-center gap-1" style={{ color: "var(--fn-muted)" }}>
                  <MapPin className="w-3 h-3" />
                  {clinic?.city ?? "Uberaba"}/{clinic?.state ?? "MG"}
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: "color-mix(in oklab, #f59e0b 12%, transparent)", color: "#fbbf24", border: "1px solid color-mix(in oklab, #f59e0b 22%, transparent)" }}>
                  Pendente
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: "var(--fn-accent)" }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--fn-muted)" }}>Data</p>
                  <p className="text-sm font-semibold capitalize" style={{ color: "var(--fn-ink)" }}>
                    {scheduledDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "var(--fn-accent)" }} />
                <div>
                  <p className="text-xs" style={{ color: "var(--fn-muted)" }}>Horário</p>
                  <p className="text-sm font-semibold" style={{ color: "var(--fn-ink)" }}>
                    {scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--fn-surface)", border: "1px solid var(--fn-line)" }}>
          <p className="text-xs uppercase tracking-wide font-semibold mb-3" style={{ color: "var(--fn-muted)" }}>Próximos passos</p>
          <div className="space-y-3">
            {[
              { num: "1", text: "A clínica confirmará seu agendamento em breve" },
              { num: "2", text: "Chegue com 10 minutos de antecedência" },
              { num: "3", text: "Traga documento de identidade" },
              { num: "4", text: "A consulta é 100% gratuita e sem compromisso" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black" style={{ background: "var(--fn-accent)", color: "var(--fn-accent-ink)" }}>
                  {step.num}
                </div>
                <span className="text-sm" style={{ color: "var(--fn-body)" }}>{step.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WhatsApp CTA */}
        {clinic?.whatsapp && (
          <a
            href={`https://wa.me/55${clinic.whatsapp.replace(/\D/g, "")}?text=Olá! Acabei de agendar uma consulta pelo site. Meu agendamento é para ${scheduledDate?.toLocaleDateString("pt-BR")} às ${scheduledDate?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`}
            target="_blank"
            rel="noopener noreferrer"
            className="fn-lift flex items-center justify-between rounded-2xl p-4 mb-4"
            style={{ background: "color-mix(in oklab, #22c55e 12%, transparent)", border: "1px solid color-mix(in oklab, #22c55e 24%, transparent)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#004A9D]">
                <WhatsappLogo className="w-5 h-5 text-white" weight="fill" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "#4ade80" }}>Falar no WhatsApp</p>
                <p className="text-xs" style={{ color: "var(--fn-muted)" }}>Tire dúvidas com nossa equipe</p>
              </div>
            </div>
            <CaretRight className="w-4 h-4" weight="bold" style={{ color: "#4ade80" }} />
          </a>
        )}

        {/* Rating prompt */}
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--fn-elevated)", border: "1px solid var(--fn-line)" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--fn-ink)" }}>Como foi sua experiência até aqui?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="transition-transform hover:scale-110" aria-label={`Avaliar ${star} estrela${star > 1 ? "s" : ""}`}>
                <Star className="w-7 h-7 transition-colors" weight="fill" style={{ color: "var(--fn-line-strong)" }} />
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--fn-muted)" }}>Sua avaliação nos ajuda a melhorar</p>
        </div>
      </div>
    </div>
    </IconContext.Provider>
  );
}
