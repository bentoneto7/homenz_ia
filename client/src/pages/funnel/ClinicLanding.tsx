import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Scissors, ChevronRight, Star, Shield, Clock } from "lucide-react";

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

export default function ClinicLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [submitted, setSubmitted] = useState(false);

  const { data: clinic, isLoading } = trpc.clinic.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const createLead = trpc.leads.create.useMutation({
    onSuccess: (data) => {
      setSubmitted(true);
      setTimeout(() => {
        navigate(`/c/${slug}/chat/${data.sessionToken}`);
      }, 1200);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Preencha seu nome e WhatsApp");
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Clínica não encontrada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <div className="relative min-h-[60vh] flex items-center justify-center gradient-dark overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-10 w-48 h-48 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          {clinic.logoUrl ? (
            <img src={clinic.logoUrl} alt={clinic.name} className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4" />
          ) : (
            <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Descubra o resultado do seu{" "}
            <span className="text-gradient-gold">preenchimento capilar</span>
          </h1>
          <p className="text-white/70 text-lg mb-2">
            {clinic.name} — {clinic.city}/{clinic.state}
          </p>
          <p className="text-white/50 text-sm">
            Análise gratuita por IA + visualização 3D do seu resultado
          </p>
        </div>
      </div>

      {/* Formulário de captura */}
      <div className="px-4 py-12">
        <div className="max-w-md mx-auto">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <ChevronRight className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Perfeito!</h2>
              <p className="text-muted-foreground">Iniciando seu diagnóstico personalizado...</p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-1">Comece sua análise gratuita</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Em 5 minutos você vê como vai ficar após o procedimento.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Seu nome *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Como podemos te chamar?"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">WhatsApp *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="(00) 99999-9999"
                    className="mt-1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Usaremos para enviar seu resultado
                  </p>
                </div>
                <div>
                  <Label htmlFor="email">E-mail (opcional)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="mt-1"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full gradient-gold text-white border-0 text-base py-5"
                  disabled={createLead.isPending}
                >
                  {createLead.isPending ? "Iniciando..." : (
                    <>
                      Ver meu resultado gratuitamente
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </form>

              {/* Trust signals */}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-border">
                <div className="text-center">
                  <Shield className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">100% seguro</p>
                </div>
                <div className="text-center">
                  <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">5 minutos</p>
                </div>
                <div className="text-center">
                  <Star className="w-5 h-5 text-primary mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Gratuito</p>
                </div>
              </div>
            </div>
          )}

          {Array.isArray(clinic.services) && (clinic.services as unknown[]).length > 0 && (
            <div className="mt-8">
              <h3 className="font-semibold mb-3 text-center">Serviços oferecidos</h3>
              <div className="flex flex-wrap gap-2 justify-center">
                {(clinic.services as unknown[]).map((s, i) => (
                  <span key={i} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full border border-primary/20">
                    {String(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bio */}
          {clinic.bio && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">{clinic.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
