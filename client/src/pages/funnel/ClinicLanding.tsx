import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Scissors, ChevronRight, Star, Shield, Clock, CheckCircle, Users, Zap, MapPin, Phone } from "lucide-react";

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    utmContent: params.get("utm_content") ?? undefined,
    utmTerm: params.get("utm_term") ?? undefined,
    referrer: document.referrer || undefined,
  };
}

const TESTIMONIALS = [
  { name: "Carlos M.", age: 42, city: "Uberaba", text: "Achei que era tarde demais. Depois da análise vi que tinha solução. Fiz o procedimento e recuperei minha autoestima.", stars: 5 },
  { name: "Roberto A.", age: 38, city: "Uberlândia", text: "A visualização 3D me convenceu na hora. Ver como ia ficar antes de decidir foi fundamental.", stars: 5 },
  { name: "Marcos L.", age: 51, city: "Uberaba", text: "Resultado natural, ninguém percebe. Só percebem que estou mais jovem!", stars: 5 },
];

const STEPS = [
  { icon: "💬", label: "Diagnóstico", desc: "Chat personalizado" },
  { icon: "📷", label: "Suas fotos", desc: "Análise real" },
  { icon: "🤖", label: "Resultado 3D", desc: "Veja como vai ficar" },
  { icon: "📅", label: "Agendamento", desc: "Consulta gratuita" },
];

export default function ClinicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const [submitted, setSubmitted] = useState(false);
  const [spotsLeft] = useState(() => Math.floor(Math.random() * 4) + 2);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const { data: clinic, isLoading, error } = trpc.clinic.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug, retry: false }
  );

  const createLead = trpc.leads.create.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setTimeout(() => {
        navigate(`/c/${slug}/chat/${data.sessionToken}`);
      }, 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  // Garantir tema claro no funil público (remove dark mode se ativo)
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    return () => {};
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial((i) => (i + 1) % TESTIMONIALS.length), 4000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Preencha seu nome e WhatsApp para continuar");
      return;
    }
    createLead.mutate({
      clinicSlug: slug ?? "",
      name: form.name,
      phone: form.phone,
      email: form.email || undefined,
      ...getUTMParams(),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EBF4FF] to-white">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#004A9D] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#5A667A] text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#EBF4FF] to-white px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
            <Scissors className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-[#0A2540] font-bold text-xl mb-2">Clínica não encontrada</h2>
          <p className="text-[#5A667A] text-sm mb-6">
            O link que você acessou pode estar desatualizado. Entre em contato com a clínica para obter o link correto.
          </p>
          <Button onClick={() => window.history.back()} variant="outline" className="border-[#E2E8F0] text-[#004A9D] hover:bg-[#EBF4FF]">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] text-[#0A2540] overflow-x-hidden">

      {/* ── URGENCY BAR ── */}
      <div className="bg-[#004A9D] text-white text-center py-2 px-4 text-xs sm:text-sm font-semibold">
        🔥 Apenas <strong>{spotsLeft} vagas</strong> disponíveis esta semana em {clinic.city} — Análise 100% gratuita
      </div>

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#004A9D] flex items-center justify-center">
            <Scissors className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[#004A9D] font-black text-sm leading-none">HOMENZ</p>
            <p className="text-[#00C1B8] text-[9px] font-bold tracking-widest">PLATAFORMA</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#5A667A]">
          <MapPin className="w-3.5 h-3.5 text-[#004A9D]" />
          <span className="font-medium text-[#0A2540]">{clinic.name}</span>
          <span>·</span>
          <span>{clinic.city}/{clinic.state}</span>
        </div>
      </div>

      {/* ── HERO ── */}
      <div className="px-4 pt-10 pb-8 text-center">
        <div className="max-w-lg mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#EBF4FF] border border-[#004A9D]/20 rounded-full px-3 py-1.5 mb-6">
            <Zap className="w-3.5 h-3.5 text-[#004A9D]" />
            <span className="text-xs text-[#004A9D] font-semibold">Análise gratuita com IA</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-4 text-[#0A2540]">
            Veja como você vai ficar{" "}
            <span className="text-[#00C1B8]">após o preenchimento capilar</span>{" "}
            — antes de decidir
          </h1>

          <p className="text-[#5A667A] text-base mb-6 leading-relaxed">
            Faça uma <strong className="text-[#004A9D]">avaliação capilar especializada</strong> em 3D real do seu resultado. Grátis, rápido e sem compromisso.
          </p>

          {/* Social proof counter */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex -space-x-2">
              {["#004A9D", "#0062CC", "#0078F0"].map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white" style={{ background: c }}>
                  {["C", "R", "M"][i]}
                </div>
              ))}
            </div>
            <p className="text-sm text-[#5A667A]">
              <strong className="text-[#0A2540]">+847 homens</strong> já viram o resultado este mês
            </p>
          </div>
        </div>
      </div>

      {/* ── CAPTURE FORM ── */}
      <div className="px-4 pb-8" id="capture-form">
        <div className="max-w-md mx-auto">
          {submitted ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-[#E2E8F0] p-8">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-[#0A2540]">Perfeito, {form.name.split(" ")[0]}!</h2>
              <p className="text-[#5A667A]">Iniciando seu diagnóstico personalizado...</p>
              <div className="flex justify-center mt-4">
                <div className="w-6 h-6 border-2 border-[#004A9D] border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#00C1B8]" />
                <span className="text-[#00C1B8] text-xs font-semibold uppercase tracking-wide">Análise gratuita</span>
              </div>
              <h2 className="text-xl font-bold mb-1 text-[#0A2540]">Comece agora — leva 5 minutos</h2>
              <p className="text-sm text-[#5A667A] mb-5">
                Sem cartão de crédito. Sem compromisso. Resultado na hora.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Seu nome completo"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#004A9D] transition-colors text-sm"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0AABB]" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: maskPhone(e.target.value) }))}
                    inputMode="numeric"
                    placeholder="WhatsApp: (00) 99999-9999"
                    className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl pl-10 pr-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#004A9D] transition-colors text-sm"
                    required
                  />
                </div>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="E-mail (opcional)"
                  className="w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#004A9D] transition-colors text-sm"
                />

                <button
                  type="submit"
                  disabled={createLead.isPending}
                  className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-base flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {createLead.isPending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Ver meu resultado em 3D — grátis
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              {/* Trust signals */}
              <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-[#E2E8F0]">
                <div className="text-center">
                  <Shield className="w-4 h-4 text-[#004A9D] mx-auto mb-1" />
                  <p className="text-[10px] text-[#5A667A]">Dados protegidos</p>
                </div>
                <div className="text-center">
                  <Clock className="w-4 h-4 text-[#004A9D] mx-auto mb-1" />
                  <p className="text-[10px] text-[#5A667A]">5 minutos</p>
                </div>
                <div className="text-center">
                  <Star className="w-4 h-4 text-[#004A9D] mx-auto mb-1" />
                  <p className="text-[10px] text-[#5A667A]">100% gratuito</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div className="px-4 py-8 bg-white border-y border-[#E2E8F0]">
        <div className="max-w-md mx-auto">
          <h2 className="text-center text-lg font-bold mb-6 text-[#0A2540]">Como funciona</h2>
          <div className="grid grid-cols-2 gap-3">
            {STEPS.map((step, i) => (
              <div key={i} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 text-center">
                <div className="text-2xl mb-2">{step.icon}</div>
                <p className="font-semibold text-sm text-[#0A2540]">{step.label}</p>
                <p className="text-xs text-[#5A667A] mt-0.5">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TESTIMONIALS ── */}
      <div className="px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-2 justify-center mb-6">
            <Users className="w-4 h-4 text-[#004A9D]" />
            <h2 className="text-lg font-bold text-[#0A2540]">O que dizem nossos pacientes</h2>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white border border-[#E2E8F0] p-5 min-h-[140px] shadow-sm">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`transition-all duration-500 ${i === activeTestimonial ? "opacity-100 translate-y-0" : "opacity-0 absolute inset-0 p-5 translate-y-2 pointer-events-none"}`}
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-[#004A9D] text-[#004A9D]" />
                  ))}
                </div>
                <p className="text-[#374151] text-sm leading-relaxed mb-3">"{t.text}"</p>
                <p className="text-[#5A667A] text-xs">— {t.name}, {t.age} anos · {t.city}</p>
              </div>
            ))}
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-3">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`h-1.5 rounded-full transition-all ${i === activeTestimonial ? "bg-[#004A9D] w-4" : "bg-[#E2E8F0] w-1.5"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── SERVICES ── */}
      {Array.isArray(clinic.services) && (clinic.services as unknown[]).length > 0 && (
        <div className="px-4 py-6 bg-[#F8FAFC] border-t border-[#E2E8F0]">
          <div className="max-w-md mx-auto">
            <h3 className="text-center text-sm font-semibold text-[#5A667A] mb-3 uppercase tracking-wide">Serviços disponíveis</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {(clinic.services as unknown[]).map((s, i) => (
                <span key={i} className="px-3 py-1.5 bg-[#EBF4FF] text-[#004A9D] text-xs rounded-full border border-[#004A9D]/20 font-medium">
                  {String(s)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ENDEREÇO DA CLÍNICA ── */}
      {(clinic.address || clinic.whatsapp || clinic.phone) && (
        <div className="px-4 py-4 bg-white border-t border-[#E2E8F0]">
          <div className="max-w-md mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {clinic.address && (
              <div className="flex items-center gap-1.5 text-xs text-[#5A667A]">
                <MapPin className="w-3.5 h-3.5 text-[#004A9D] shrink-0" />
                <span>{clinic.address}{clinic.city ? ` — ${clinic.city}/${clinic.state}` : ''}</span>
              </div>
            )}
            {(clinic.whatsapp || clinic.phone) && (
              <a
                href={`https://wa.me/55${(clinic.whatsapp || clinic.phone || '').replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#00C1B8] hover:underline"
              >
                <Phone className="w-3.5 h-3.5 shrink-0" />
                <span>{clinic.whatsapp || clinic.phone}</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── STICKY CTA (mobile) ── */}
      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent sm:hidden z-50">
          <button
            onClick={() => document.getElementById("capture-form")?.scrollIntoView({ behavior: "smooth" })}
            className="w-full bg-[#004A9D] hover:bg-[#003d85] text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Ver meu resultado 3D — grátis
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Bottom padding for sticky CTA */}
      <div className="h-24 sm:h-4" />
    </div>
  );
}
