import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Scissors, ChevronRight, ChevronLeft, Check } from "lucide-react";

const STEPS = ["Dados básicos", "Localização", "Contato", "Confirmação"];

const CLINIC_TOKEN_KEY = "homenz_token";

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

  const [createPending, setCreatePending] = useState(false);
  const createClinic = {
    isPending: createPending,
    mutate: async (payload: Record<string, unknown>) => {
      setCreatePending(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Não autenticado");
        const { error } = await supabase.from("clinics").insert({ ...payload, owner_id: user.id });
        if (error) throw error;
        onCreateSuccess();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Erro ao criar clínica");
      } finally { setCreatePending(false); }
    },
  };

  const onCreateSuccess = () => {
    toast.success("Clínica criada com sucesso!");
    navigate("/painel");
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-8 h-8 text-[#0A2540]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Cadastre sua clínica</h1>
          <p className="text-muted-foreground mb-6">
            Faça login para criar sua clínica e começar a captar leads com IA.
          </p>
          <Button
            className="gradient-gold text-white border-0 w-full"
            onClick={() => navigate("/login-clinica")}
          >
            Entrar para continuar
          </Button>
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
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#0A2540]" />
            </div>
            <span className="font-bold text-lg text-gradient-gold">CapilarIA</span>
          </div>
          <h1 className="text-2xl font-bold">Cadastrar clínica</h1>
          <p className="text-sm text-muted-foreground mt-1">Passo {step + 1} de {STEPS.length}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "gradient-gold" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-5">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>Nome da clínica *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    update("name", e.target.value);
                    if (!form.slug) update("slug", autoSlug(e.target.value));
                  }}
                  placeholder="Ex: Clínica Capilar Uberaba"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Link único da clínica *</Label>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-border border-r-0">
                    /c/
                  </span>
                  <Input
                    value={form.slug}
                    onChange={(e) => update("slug", autoSlug(e.target.value))}
                    placeholder="clinica-uberaba"
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Este será o link dos seus anúncios: <span className="text-primary">/c/{form.slug || "seu-link"}</span>
                </p>
              </div>
              <div>
                <Label>Nome do responsável *</Label>
                <Input
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                  placeholder="Seu nome completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>CNPJ</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) => update("cnpj", e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Sobre a clínica</Label>
                <Textarea
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  placeholder="Descreva sua clínica, especialidades e diferenciais..."
                  className="mt-1 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade *</Label>
                  <Input
                    value={form.city}
                    onChange={(e) => update("city", e.target.value)}
                    placeholder="Uberaba"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Input
                    value={form.state}
                    onChange={(e) => update("state", e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="MG"
                    maxLength={2}
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Endereço</Label>
                <Input
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="Rua, número, bairro"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>CEP</Label>
                <Input
                  value={form.zipCode}
                  onChange={(e) => update("zipCode", e.target.value)}
                  placeholder="38000-000"
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="contato@clinica.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Telefone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => update("phone", maskPhone(e.target.value))}
                  placeholder="(34) 99999-9999"
                  inputMode="numeric"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>WhatsApp para leads *</Label>
                <Input
                  value={form.whatsapp}
                  onChange={(e) => update("whatsapp", maskPhone(e.target.value))}
                  placeholder="(34) 99999-9999"
                  inputMode="numeric"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Número que receberá contato direto dos leads
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nome:</span>
                  <span className="font-medium">{form.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Link:</span>
                  <span className="font-medium text-primary">/c/{form.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cidade:</span>
                  <span className="font-medium">{form.city}/{form.state}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-medium">{form.whatsapp}</span>
                </div>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-sm">
                <p className="font-medium text-primary mb-1">Plano Gratuito inclui:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>✓ 50 leads por mês</li>
                  <li>✓ 10 análises de IA por mês</li>
                  <li>✓ Notificações na plataforma</li>
                  <li>✓ Painel de gestão completo</li>
                </ul>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Voltar
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 gradient-gold text-white border-0"
                disabled={
                  (step === 0 && (!form.name || !form.slug || !form.ownerName)) ||
                  (step === 1 && (!form.city || !form.state)) ||
                  (step === 2 && (!form.email || !form.phone || !form.whatsapp))
                }
              >
                Continuar
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                className="flex-1 gradient-gold text-white border-0"
                disabled={createClinic.isPending}
              >
                {createClinic.isPending ? "Criando..." : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Criar minha clínica
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
