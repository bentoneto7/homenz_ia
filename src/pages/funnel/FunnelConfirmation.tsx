import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, Calendar, Clock, MapPin, MessageCircle, Star, ChevronRight } from "lucide-react";

export default function FunnelConfirmation() {
  const { slug, token } = useParams<{ slug: string; token: string }>();
  const [showConfetti, setShowConfetti] = useState(false);

  const [appointment, setAppointment] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") || "";
    if (!token) return;
    supabase.from("appointments").select("*, leads(name, phone)").eq("session_token", token).maybeSingle()
      .then(({ data }) => setAppointment(data));
  }, []);

  const [clinic, setClinic] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (!slug) return;
    supabase.from("landing_pages").select("*, franchises(*)").eq("slug", slug).maybeSingle()
      .then(({ data }) => setClinic(data));
  }, [slug]);

  // Garantir tema claro no funil público (remove dark mode se ativo)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    return () => {};
  }, []);

  useEffect(() => {
    setShowConfetti(true);
    const t = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const scheduledDate = appointment?.scheduledAt ? new Date(appointment.scheduledAt) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] text-[#0A2540] flex flex-col items-center justify-start px-4 py-10">
      {/* Confetti particles */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}px`,
                backgroundColor: ["#004A9D", "#10b981", "#00C1B8", "#f59e0b"][i % 4],
                animationDelay: `${Math.random() * 1}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-md w-full">
        {/* Success hero */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-8 h-8 text-[#0A2540]" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-black mb-2 text-[#0A2540]">
            Consulta agendada! 🎉
          </h1>
          <p className="text-[#5A667A] text-sm leading-relaxed">
            Sua consulta foi confirmada com sucesso.<br />
            Aguardamos você para transformar seu visual!
          </p>
        </div>

        {/* Appointment card */}
        {scheduledDate && (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-4">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#E2E8F0]">
              <div className="w-10 h-10 rounded-xl bg-[#004A9D] flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-[#0A2540]">{clinic?.name ?? "Clínica Capilar"}</p>
                <p className="text-xs text-[#5A667A] flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {clinic?.city ?? "Uberaba"}/{clinic?.state ?? "MG"}
                </p>
              </div>
              <div className="ml-auto">
                <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-full font-semibold">
                  Pendente
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#004A9D] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#5A667A]">Data</p>
                  <p className="text-sm font-semibold capitalize">
                    {scheduledDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-[#004A9D] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#5A667A]">Horário</p>
                  <p className="text-sm font-semibold">
                    {scheduledDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next steps */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 mb-4">
          <p className="text-xs text-[#5A667A] uppercase tracking-wide font-semibold mb-3">Próximos passos</p>
          <div className="space-y-3">
            {[
              { num: "1", text: "A clínica confirmará seu agendamento em breve" },
              { num: "2", text: "Chegue com 10 minutos de antecedência" },
              { num: "3", text: "Traga documento de identidade" },
              { num: "4", text: "A consulta é 100% gratuita e sem compromisso" },
            ].map((step) => (
              <div key={step.num} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#004A9D] text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black">
                  {step.num}
                </div>
                <span className="text-sm text-[#5A667A]">{step.text}</span>
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
            className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 mb-4 hover:bg-emerald-500/15 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-[#0A2540]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400">Falar no WhatsApp</p>
                <p className="text-xs text-[#5A667A]">Tire dúvidas com nossa equipe</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-400" />
          </a>
        )}

        {/* Rating prompt */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-4 text-center">
          <p className="text-sm font-semibold mb-2">Como foi sua experiência até aqui?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} className="group">
                <Star className="w-7 h-7 text-[#C0CADB] group-hover:text-[#004A9D] group-hover:fill-[#004A9D] transition-colors" />
              </button>
            ))}
          </div>
          <p className="text-xs text-[#A0AABB] mt-2">Sua avaliação nos ajuda a melhorar</p>
        </div>
      </div>
    </div>
  );
}
