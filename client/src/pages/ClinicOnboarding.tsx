import { useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CaretRight, CaretLeft, Check, ArrowRight } from "@phosphor-icons/react";
import FunnelWordmark from "./funnel/FunnelWordmark";
import { AUTH } from "./auth/authKit";

const STEPS = ["Dados básicos", "Localização", "Contato", "Confirmação"];

const CLINIC_TOKEN_KEY = "homenz_token";

const WORDMARK_LIGHT = {
  "--fn-ink": AUTH.ink,
  "--fn-accent": AUTH.blue,
  "--fn-font-display": AUTH.display,
} as CSSProperties;

const inputCls = "mt-1.5 rounded-xl bg-[#F6F8FC] border-[#E4EAF2] focus:border-[#004A9D] focus-visible:ring-2 focus-visible:ring-[#004A9D]/15";
const labelStyle = { color: AUTH.ink } as CSSProperties;

export default function ClinicOnboarding() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const token = typeof window !== "undefined" ? localStorage.getItem(CLINIC_TOKEN_KEY) : null;
  const [form, setForm] = useState({
    name: "",
    slug: "",
    ownerName: "",
    email: "",
    phone: "",
    whatsapp: "",
    city: "",
    state: "",
    address: "",
    zipCode: "",
    cnpj: "",
    bio: "",
  });

  const createClinic = trpc.clinic.create.useMutation({
    onSuccess: () => {
      toast.success("Clínica criada com sucesso!");
      navigate("/painel");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5" style={{ background: AUTH.surfaceAlt, fontFamily: AUTH.body }}>
        <div className="text-center max-w-md mx-auto">
          <div className="flex justify-center mb-6" style={WORDMARK_LIGHT}>
            <FunnelWordmark height={30} />
          </div>
          <h1 className="font-semibold mb-3" style={{ fontFamily: AUTH.display, color: AUTH.ink, fontSize: "1.7rem", letterSpacing: "-0.02em" }}>Cadastre sua clínica</h1>
          <p className="mb-6" style={{ color: AUTH.bodyText }}>Faça login para criar sua clínica e começar a captar leads com IA.</p>
          <button
            onClick={() => navigate("/login-clinica")}
            className="inline-flex items-center justify-center gap-2 w-full rounded-full py-3.5 font-bold text-white transition-all hover:-translate-y-0.5"
            style={{ background: AUTH.blue, boxShadow: "0 12px 30px -12px rgba(0,74,157,0.6)" }}
          >
            Entrar para continuar
            <ArrowRight weight="bold" className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const autoSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSubmit = () => {
    createClinic.mutate({
      name: form.name,
      slug: form.slug,
      ownerName: form.ownerName,
      email: form.email,
      phone: form.phone,
      whatsapp: form.whatsapp,
      city: form.city,
      state: form.state,
      address: form.address,
      zipCode: form.zipCode,
      cnpj: form.cnpj,
      bio: form.bio,
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ background: AUTH.surfaceAlt, fontFamily: AUTH.body }}>
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5" style={WORDMARK_LIGHT}>
            <FunnelWordmark height={28} />
          </div>
          <h1 className="font-semibold" style={{ fontFamily: AUTH.display, color: AUTH.ink, fontSize: "clamp(1.6rem, 4vw, 2rem)", letterSpacing: "-0.02em" }}>Cadastrar clínica</h1>
          <p className="text-sm mt-1" style={{ color: AUTH.muted }}>Passo {step + 1} de {STEPS.length}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="h-1 flex-1 rounded-full transition-all" style={{ background: i <= step ? AUTH.blue : AUTH.line }} />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl p-7" style={{ background: AUTH.bg, border: `1px solid ${AUTH.line}`, boxShadow: AUTH.shadow }}>
          <h2 className="font-bold text-lg mb-5" style={{ fontFamily: AUTH.display, color: AUTH.ink }}>{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label style={labelStyle}>Nome da clínica *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!form.slug) update("slug", autoSlug(e.target.value));
                  }}
                  placeholder="Ex: Clínica Capilar Uberaba"
                  className={inputCls}
                />
              </div>
              <div>
                <Label style={labelStyle}>Link único da clínica *</Label>
                <div className="flex items-center mt-1.5">
                  <span className="text-xs px-3 py-2 rounded-l-xl border border-r-0" style={{ color: AUTH.muted, background: "#F6F8FC", borderColor: AUTH.line }}>/c/</span>
                  <Input value={form.slug} onChange={(e) => update("slug", autoSlug(e.target.value))} placeholder="clinica-uberaba" className="rounded-l-none rounded-r-xl bg-[#F6F8FC] border-[#E4EAF2] focus:border-[#004A9D] focus-visible:ring-2 focus-visible:ring-[#004A9D]/15" />
                </div>
                <p className="text-xs mt-1" style={{ color: AUTH.muted }}>
                  Este será o link dos seus anúncios: <span style={{ color: AUTH.blue }}>/c/{form.slug || "seu-link"}</span>
                </p>
              </div>
              <div>
                <Label style={labelStyle}>Nome do responsável *</Label>
                <Input value={form.ownerName} onChange={(e) => update("ownerName", e.target.value)} placeholder="Seu nome completo" className={inputCls} />
              </div>
              <div>
                <Label style={labelStyle}>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} placeholder="00.000.000/0001-00" className={inputCls} />
              </div>
              <div>
                <Label style={labelStyle}>Sobre a clínica</Label>
                <Textarea value={form.bio} onChange={(e) => update("bio", e.target.value)} placeholder="Descreva sua clínica, especialidades e diferenciais..." className="mt-1.5 resize-none rounded-xl bg-[#F6F8FC] border-[#E4EAF2] focus-visible:ring-2 focus-visible:ring-[#004A9D]/15" rows={3} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label style={labelStyle}>Cidade *</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Uberaba" className={inputCls} />
                </div>
                <div>
                  <Label style={labelStyle}>Estado *</Label>
                  <Input value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))} placeholder="MG" maxLength={2} className={inputCls} />
                </div>
              </div>
              <div>
                <Label style={labelStyle}>Endereço</Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Rua, número, bairro" className={inputCls} />
              </div>
              <div>
                <Label style={labelStyle}>CEP</Label>
                <Input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} placeholder="38000-000" className={inputCls} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label style={labelStyle}>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="contato@clinica.com" className={inputCls} />
              </div>
              <div>
                <Label style={labelStyle}>Telefone *</Label>
                <Input value={form.phone} onChange={(e) => update("phone", maskPhone(e.target.value))} placeholder="(34) 99999-9999" inputMode="numeric" className={inputCls} />
              </div>
              <div>
                <Label style={labelStyle}>WhatsApp para leads *</Label>
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", maskPhone(e.target.value))} placeholder="(34) 99999-9999" inputMode="numeric" className={inputCls} />
                <p className="text-xs mt-1" style={{ color: AUTH.muted }}>Número que receberá contato direto dos leads</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-2xl p-4 space-y-2 text-sm" style={{ background: AUTH.surfaceAlt, border: `1px solid ${AUTH.line}` }}>
                {[["Nome", form.name], ["Link", `/c/${form.slug}`], ["Cidade", `${form.city}/${form.state}`], ["WhatsApp", form.whatsapp]].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span style={{ color: AUTH.muted }}>{k}:</span>
                    <span className="font-semibold" style={{ color: k === "Link" ? AUTH.blue : AUTH.ink }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl p-4 text-sm" style={{ background: "rgba(0,193,184,0.07)", border: "1px solid rgba(0,193,184,0.22)" }}>
                <p className="font-semibold mb-1.5" style={{ color: AUTH.teal }}>Plano Gratuito inclui:</p>
                <ul className="space-y-1" style={{ color: AUTH.bodyText }}>
                  {["50 leads por mês", "10 análises de IA por mês", "Notificações na plataforma", "Painel de gestão completo"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check weight="bold" className="w-4 h-4 flex-shrink-0" style={{ color: AUTH.tealFill }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="flex-1 rounded-full py-3 font-bold text-sm flex items-center justify-center gap-1 transition-colors" style={{ color: AUTH.ink, border: `1px solid ${AUTH.lineStrong}` }}>
                <CaretLeft weight="bold" className="w-4 h-4" />
                Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={
                  (step === 0 && (!form.name || !form.slug || !form.ownerName)) ||
                  (step === 1 && (!form.city || !form.state)) ||
                  (step === 2 && (!form.email || !form.phone || !form.whatsapp))
                }
                className="flex-1 rounded-full py-3 font-bold text-sm text-white flex items-center justify-center gap-1 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: AUTH.blue, boxShadow: "0 10px 26px -12px rgba(0,74,157,0.6)" }}
              >
                Continuar
                <CaretRight weight="bold" className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={createClinic.isPending}
                className="flex-1 rounded-full py-3 font-bold text-sm text-white flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: AUTH.blue, boxShadow: "0 10px 26px -12px rgba(0,74,157,0.6)" }}
              >
                {createClinic.isPending ? "Criando..." : (<><Check weight="bold" className="w-4 h-4" />Criar minha clínica</>)}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
