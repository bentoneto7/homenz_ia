import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Eye,
  EyeOff,
  User,
  MapPin,
  Building2,
  Lock,
} from "lucide-react";

const STEPS = [
  { label: "Seus dados", icon: User },
  { label: "Sua clínica", icon: Building2 },
  { label: "Localização", icon: MapPin },
  { label: "Acesso", icon: Lock },
];

interface FormState {
  name: string;
  email: string;
  whatsapp: string;
  instagram: string;
  franchiseName: string;
  city: string;
  state: string;
  address: string;
  password: string;
  confirmPassword: string;
}

export default function CadastroFranqueado() {
  const [, navigate] = useLocation();
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
    password: "",
    confirmPassword: "",
  });

  const update = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const registerFranchisee = trpc.homenz.registerFranchisee.useMutation({
    onSuccess: (data) => {
      toast.success("Conta criada! Agora escolha seu plano para ativar o acesso.");
      // Redirecionar para /planos com email pré-preenchido
      navigate(`/planos?email=${encodeURIComponent(data.email)}&novo=1`);
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
        return (
          form.password.length >= 6 &&
          form.password === form.confirmPassword
        );
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
      franchiseName: form.franchiseName,
      city: form.city,
      state: form.state,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EBF4FF] via-white to-[#F0FDF9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2.5 mb-6"
          >
            <div className="w-10 h-10 rounded-xl bg-[#004A9D] flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-lg">H</span>
            </div>
            <div className="text-left">
              <span className="text-[#004A9D] font-black text-xl leading-none block">HOMENZ</span>
              <span className="text-[#00C1B8] text-[10px] font-semibold tracking-widest uppercase leading-none">Plataforma</span>
            </div>
          </button>
          <h1 className="text-2xl font-black text-[#0A2540]">Criar conta de franqueado</h1>
          <p className="text-[#5A667A] text-sm mt-1">
            Passo {step + 1} de {STEPS.length}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.label} className="flex items-center flex-1">
                <div
                  className={`flex items-center gap-1.5 flex-1 ${
                    i < STEPS.length - 1 ? "relative" : ""
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone
                        ? "bg-[#00C1B8] text-white"
                        : isActive
                        ? "bg-[#004A9D] text-white shadow-lg shadow-blue-200"
                        : "bg-[#E2E8F0] text-[#94A3B8]"
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 transition-all ${
                        isDone ? "bg-[#00C1B8]" : "bg-[#E2E8F0]"
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl p-8">
          <h2 className="text-lg font-black text-[#0A2540] mb-6 flex items-center gap-2">
            {(() => {
              const Icon = STEPS[step].icon;
              return <Icon className="w-5 h-5 text-[#004A9D]" />;
            })()}
            {STEPS[step].label}
          </h2>

          {/* Step 0 — Dados pessoais */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label className="text-[#374151] font-semibold text-sm">Nome completo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Seu nome completo"
                  className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[#374151] font-semibold text-sm">E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="seu@email.com"
                  className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[#374151] font-semibold text-sm">WhatsApp *</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => update("whatsapp", e.target.value)}
                  placeholder="(00) 99999-9999"
                  className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                />
              </div>
              <div>
                <Label className="text-[#374151] font-semibold text-sm">
                  Instagram <span className="text-[#94A3B8] font-normal">(opcional)</span>
                </Label>
                <div className="flex items-center mt-1.5">
                  <span className="text-sm text-[#94A3B8] bg-[#F8FAFC] px-3 py-2 rounded-l-xl border border-[#E2E8F0] border-r-0">
                    @
                  </span>
                  <Input
                    value={form.instagram}
                    onChange={(e) => update("instagram", e.target.value)}
                    placeholder="seu_perfil"
                    className="rounded-l-none border-[#E2E8F0] focus:border-[#004A9D]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1 — Dados da clínica */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-[#374151] font-semibold text-sm">Nome da clínica/franquia *</Label>
                <Input
                  value={form.franchiseName}
                  onChange={(e) => update("franchiseName", e.target.value)}
                  placeholder="Ex: Homenz Uberaba"
                  className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                />
                <p className="text-xs text-[#94A3B8] mt-1">
                  Este será o nome da sua unidade na rede Homenz
                </p>
              </div>
              <div className="bg-[#EBF4FF] rounded-2xl p-4">
                <p className="text-[#004A9D] font-bold text-sm mb-2">🚀 O que você vai ter acesso:</p>
                <ul className="text-[#374151] text-sm space-y-1.5">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                    Landing page de captação com IA
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                    Painel de gestão de leads
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                    Sistema de agendamento automático
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                    Dashboard de performance
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2 — Localização */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[#374151] font-semibold text-sm">Cidade *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Uberaba"
                    className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-[#374151] font-semibold text-sm">Estado *</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="MG"
                    maxLength={2}
                    className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[#374151] font-semibold text-sm">
                  Endereço <span className="text-[#94A3B8] font-normal">(opcional)</span>
                </Label>
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                />
              </div>
            </div>
          )}

          {/* Step 3 — Senha */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-[#374151] font-semibold text-sm">Senha *</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="border-[#E2E8F0] focus:border-[#004A9D] rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#374151]"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label className="text-[#374151] font-semibold text-sm">Confirmar senha *</Label>
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  placeholder="Repita a senha"
                  className="mt-1.5 border-[#E2E8F0] focus:border-[#004A9D] rounded-xl"
                />
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">As senhas não coincidem</p>
                )}
              </div>

              {/* Resumo */}
              <div className="bg-[#F8FAFC] rounded-2xl p-4 space-y-2 text-sm border border-[#E2E8F0]">
                <p className="font-bold text-[#0A2540] mb-3">Resumo do cadastro:</p>
                <div className="flex justify-between">
                  <span className="text-[#5A667A]">Nome:</span>
                  <span className="font-semibold text-[#0A2540]">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A667A]">E-mail:</span>
                  <span className="font-semibold text-[#0A2540]">{form.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A667A]">Clínica:</span>
                  <span className="font-semibold text-[#0A2540]">{form.franchiseName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5A667A]">Cidade:</span>
                  <span className="font-semibold text-[#0A2540]">{form.city}/{form.state}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-amber-800 text-sm font-semibold">
                  ⚠️ Após criar a conta, você será redirecionado para escolher seu plano.
                </p>
                <p className="text-amber-700 text-xs mt-1">
                  O acesso ao painel só é liberado após a confirmação do pagamento.
                </p>
              </div>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 rounded-xl border-[#E2E8F0] text-[#374151]"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="flex-1 bg-[#004A9D] hover:bg-[#003580] text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={registerFranchisee.isPending || !canAdvance()}
                className="flex-1 bg-[#004A9D] hover:bg-[#003580] text-white rounded-xl font-bold shadow-lg shadow-blue-200"
              >
                {registerFranchisee.isPending ? (
                  "Criando conta..."
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Criar conta e escolher plano
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Link para login */}
        <p className="text-center text-[#5A667A] text-sm mt-6">
          Já tem conta?{" "}
          <button
            onClick={() => navigate("/login")}
            className="text-[#004A9D] font-bold hover:underline"
          >
            Fazer login
          </button>
        </p>
      </div>
    </div>
  );
}
