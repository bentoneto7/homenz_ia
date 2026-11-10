import { useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useHomenzAuth, type HomenzUser } from "@/hooks/useHomenzAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CaretRight, CaretLeft, Check, Eye, EyeSlash, User, MapPin, Buildings, Lock, Warning,
} from "@phosphor-icons/react";
import FunnelWordmark from "./funnel/FunnelWordmark";
import { AUTH } from "./auth/authKit";

const STEPS = [
  { label: "Seus dados", icon: User },
  { label: "Sua clínica", icon: Buildings },
  { label: "Localização", icon: MapPin },
  { label: "Acesso", icon: Lock },
];

const WORDMARK_LIGHT = {
  "--fn-ink": AUTH.ink,
  "--fn-accent": AUTH.blue,
  "--fn-font-display": AUTH.display,
} as CSSProperties;

const inputCls = "mt-1.5 rounded-xl bg-[#F6F8FC] border-[#E4EAF2] focus:border-[#004A9D] focus-visible:ring-2 focus-visible:ring-[#004A9D]/15";

interface FormState {
  name: string;
  email: string;
  whatsapp: string;
  instagram: string;
  franchiseName: string;
  city: string;
  state: string;
  address: string;
  servicePhone: string;
  password: string;
  confirmPassword: string;
}

export default function CadastroFranqueado() {
  const [, navigate] = useLocation();
  const { login } = useHomenzAuth();
  const [step, setStep] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    whatsapp: "",
    instagram: "",
    franchiseName: "",
    city: "",
    state: "",
    address: "",
    servicePhone: "",
    password: "",
    confirmPassword: "",
  });

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const update = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const loginMutation = trpc.homenz.login.useMutation({
    onSuccess: (loginData) => {
      login(loginData.token, loginData.user as HomenzUser);
      navigate("/boas-vindas");
    },
  });

  const registerFranchisee = trpc.homenz.registerFranchisee.useMutation({
    onSuccess: (data) => {
      loginMutation.mutate({ email: data.email, password: form.password });
    },
    onError: (err) => {
      toast.error("Erro ao criar conta", { description: err.message });
    },
  });

  const canAdvance = () => {
    switch (step) {
      case 0:
        return form.name.length >= 2 && form.email.includes("@") && form.whatsapp.length >= 10;
      case 1:
        return form.franchiseName.length >= 2;
      case 2:
        return form.city.length >= 2 && form.state.length === 2;
      case 3:
        return form.password.length >= 6 && form.password === form.confirmPassword;
      default:
        return false;
    }
  };

  const handleSubmit = () => {
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    registerFranchisee.mutate({
      name: form.name,
      email: form.email,
      password: form.password,
      whatsapp: form.whatsapp,
      instagram: form.instagram || undefined,
      address: form.address || undefined,
      servicePhone: form.servicePhone || undefined,
      franchiseName: form.franchiseName,
      city: form.city,
      state: form.state,
    });
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-12" style={{ background: AUTH.surfaceAlt, fontFamily: AUTH.body }}>
      <div className="w-full max-w-lg">
        {/* Marca */}
        <div className="flex flex-col items-center mb-8">
          <button onClick={() => navigate("/")} className="mb-6" style={WORDMARK_LIGHT}>
            <FunnelWordmark height={28} />
          </button>
          <h1 className="font-semibold" style={{ fontFamily: AUTH.display, color: AUTH.ink, fontSize: "clamp(1.6rem, 4vw, 2rem)", letterSpacing: "-0.02em" }}>
            Criar conta de franqueado
          </h1>
          <p className="text-sm mt-1" style={{ color: AUTH.muted }}>Passo {step + 1} de {STEPS.length}</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.label} className="flex items-center flex-1">
                <div className="flex items-center gap-1.5 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: isDone ? AUTH.tealFill : isActive ? AUTH.blue : "#E2E8F0",
                      color: isDone || isActive ? "#fff" : AUTH.muted,
                      boxShadow: isActive ? "0 8px 20px -8px rgba(0,74,157,0.5)" : "none",
                    }}
                  >
                    {isDone ? <Check weight="bold" className="w-4 h-4" /> : <Icon weight="bold" className="w-4 h-4" />}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="h-0.5 flex-1 transition-all" style={{ background: isDone ? AUTH.tealFill : "#E2E8F0" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8" style={{ background: AUTH.bg, border: `1px solid ${AUTH.line}`, boxShadow: AUTH.shadow }}>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ fontFamily: AUTH.display, color: AUTH.ink }}>
            <StepIcon weight="bold" className="w-5 h-5" style={{ color: AUTH.blue }} />
            {STEPS[step].label}
          </h2>

          {/* Step 0 — Dados pessoais */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>Nome completo *</Label>
                <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Seu nome completo" className={inputCls} />
              </div>
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>E-mail *</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="seu@email.com" className={inputCls} />
              </div>
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>WhatsApp *</Label>
                <Input value={form.whatsapp} onChange={(e) => update("whatsapp", maskPhone(e.target.value))} placeholder="(00) 99999-9999" inputMode="numeric" className={inputCls} />
              </div>
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>
                  Instagram <span className="font-normal" style={{ color: AUTH.muted }}>(opcional)</span>
                </Label>
                <div className="flex items-center mt-1.5">
                  <span className="text-sm px-3 py-2 rounded-l-xl border border-r-0" style={{ color: AUTH.muted, background: "#F6F8FC", borderColor: AUTH.line }}>@</span>
                  <Input value={form.instagram} onChange={(e) => update("instagram", e.target.value)} placeholder="seu_perfil" className="rounded-l-none rounded-r-xl bg-[#F6F8FC] border-[#E4EAF2] focus:border-[#004A9D] focus-visible:ring-2 focus-visible:ring-[#004A9D]/15" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Dados da clínica */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>Nome da clínica/franquia *</Label>
                <Input value={form.franchiseName} onChange={(e) => update("franchiseName", e.target.value)} placeholder="Ex: Homenz Uberaba" className={inputCls} />
                <p className="text-xs mt-1" style={{ color: AUTH.muted }}>Este será o nome da sua unidade na rede Homenz</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: AUTH.surfaceAlt, border: `1px solid ${AUTH.line}` }}>
                <p className="font-bold text-sm mb-2" style={{ color: AUTH.blue }}>O que você vai ter acesso:</p>
                <ul className="text-sm space-y-1.5" style={{ color: AUTH.bodyText }}>
                  {["Landing page de captação com IA", "Painel de gestão de leads", "Sistema de agendamento automático", "Dashboard de performance"].map((t) => (
                    <li key={t} className="flex items-center gap-2">
                      <Check weight="bold" className="w-4 h-4 flex-shrink-0" style={{ color: AUTH.tealFill }} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Step 2 — Localização */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>Cidade *</Label>
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Uberaba" className={inputCls} />
                </div>
                <div>
                  <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>Estado *</Label>
                  <Input value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))} placeholder="MG" maxLength={2} className={inputCls} />
                </div>
              </div>
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>
                  Endereço <span className="font-normal" style={{ color: AUTH.muted }}>(opcional)</span>
                </Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Rua, número, bairro" className={inputCls} />
              </div>
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>
                  Número de Atendimento <span className="font-normal" style={{ color: AUTH.muted }}>(opcional)</span>
                </Label>
                <Input type="tel" value={form.servicePhone} onChange={(e) => update("servicePhone", maskPhone(e.target.value))} placeholder="(00) 90000-0000" inputMode="numeric" className={inputCls} />
                <p className="text-xs mt-1" style={{ color: AUTH.muted }}>WhatsApp ou telefone exibido nas suas landing pages para contato direto</p>
              </div>
            </div>
          )}

          {/* Step 3 — Senha */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>Senha *</Label>
                <div className="relative mt-1.5">
                  <Input type={showPass ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Mínimo 6 caracteres" className="rounded-xl bg-[#F6F8FC] border-[#E4EAF2] focus:border-[#004A9D] focus-visible:ring-2 focus-visible:ring-[#004A9D]/15 pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: AUTH.muted }}>
                    {showPass ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="font-semibold text-sm" style={{ color: AUTH.ink }}>Confirmar senha *</Label>
                <Input type={showPass ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Repita a senha" className={inputCls} />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>As senhas não coincidem</p>
                )}
              </div>

              {/* Resumo */}
              <div className="rounded-2xl p-4 space-y-2 text-sm" style={{ background: AUTH.surfaceAlt, border: `1px solid ${AUTH.line}` }}>
                <p className="font-bold mb-3" style={{ color: AUTH.ink }}>Resumo do cadastro:</p>
                {[["Nome", form.name], ["E-mail", form.email], ["Clínica", form.franchiseName], ["Cidade", `${form.city}/${form.state}`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span style={{ color: AUTH.muted }}>{k}:</span>
                    <span className="font-semibold" style={{ color: AUTH.ink }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-4 flex gap-2.5" style={{ background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.22)" }}>
                <Warning weight="fill" className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#B45309" }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#92400E" }}>Após criar a conta, você será redirecionado para escolher seu plano.</p>
                  <p className="text-xs mt-1" style={{ color: "#B45309" }}>O acesso ao painel só é liberado após a confirmação do pagamento.</p>
                </div>
              </div>
            </div>
          )}

          {/* Navegação */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-full py-3 font-bold text-sm flex items-center justify-center gap-1 transition-colors"
                style={{ color: AUTH.ink, border: `1px solid ${AUTH.lineStrong}` }}
              >
                <CaretLeft weight="bold" className="w-4 h-4" />
                Voltar
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="flex-1 rounded-full py-3 font-bold text-sm text-white flex items-center justify-center gap-1 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: AUTH.blue, boxShadow: "0 10px 26px -12px rgba(0,74,157,0.6)" }}
              >
                Continuar
                <CaretRight weight="bold" className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={registerFranchisee.isPending || !canAdvance()}
                className="flex-1 rounded-full py-3 font-bold text-sm text-white flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                style={{ background: AUTH.blue, boxShadow: "0 10px 26px -12px rgba(0,74,157,0.6)" }}
              >
                {registerFranchisee.isPending ? "Criando conta..." : (<><Check weight="bold" className="w-4 h-4" />Criar conta e escolher plano</>)}
              </button>
            )}
          </div>
        </div>

        {/* Link para login */}
        <p className="text-center text-sm mt-6" style={{ color: AUTH.muted }}>
          Já tem conta?{" "}
          <button onClick={() => navigate("/login")} className="font-bold hover:underline" style={{ color: AUTH.blue }}>
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
}
