import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, ArrowLeft, Save, Copy, ExternalLink } from "lucide-react";

export default function AdminSettings() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const { data: clinic, refetch } = trpc.clinic.mine.useQuery(undefined, { enabled: isAuthenticated });

  const [form, setForm] = useState({
    name: "", ownerName: "", phone: "", whatsapp: "", email: "",
    city: "", state: "", address: "", zipCode: "", bio: "",
    calComApiKey: "", calComEventTypeId: "",
  });

  useEffect(() => {
    if (clinic) {
      setForm({
        name: clinic.name ?? "",
        ownerName: clinic.ownerName ?? "",
        phone: clinic.phone ?? "",
        whatsapp: clinic.whatsapp ?? "",
        email: clinic.email ?? "",
        city: clinic.city ?? "",
        state: clinic.state ?? "",
        address: clinic.address ?? "",
        zipCode: clinic.zipCode ?? "",
        bio: clinic.bio ?? "",
        calComApiKey: clinic.calComApiKey ?? "",
        calComEventTypeId: String(clinic.calComEventTypeId ?? ""),
      });
    }
  }, [clinic]);

  const update = trpc.clinic.update.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    update.mutate({
      name: form.name,
      phone: form.phone,
      whatsapp: form.whatsapp,
      address: form.address,
      zipCode: form.zipCode,
      bio: form.bio,
      calComApiKey: form.calComApiKey || undefined,
      calComEventTypeId: form.calComEventTypeId || undefined,
    });
  };

  const funnelLink = clinic ? `${window.location.origin}/c/${clinic.slug}` : "";

  const copyLink = () => {
    navigator.clipboard.writeText(funnelLink);
    toast.success("Link copiado!");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate("/painel")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Settings className="w-4 h-4 text-primary" />
            <h1 className="font-bold">Configurações</h1>
          </div>
          <Button
            size="sm"
            className="gradient-gold text-white border-0"
            onClick={handleSave}
            disabled={update.isPending}
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {update.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Funnel link */}
        {clinic && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
            <p className="text-xs font-medium text-primary mb-2">Seu link de captação:</p>
            <div className="flex items-center gap-2">
              <code className="text-sm flex-1 truncate">{funnelLink}</code>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <a href={funnelLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline">
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* Basic info */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">Informações básicas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Nome da clínica</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Responsável</Label>
              <Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">WhatsApp</Label>
              <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="Ex: 34999999999" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">Localização</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs mb-1 block">Cidade</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Estado (UF)</Label>
              <Input value={form.state} maxLength={2} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs mb-1 block">Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">CEP</Label>
              <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-4">Sobre a clínica</h2>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Descreva sua clínica para os leads..."
          />
        </div>

        {/* Cal.com integration */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h2 className="font-semibold text-sm mb-1">Integração Cal.com</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Opcional: conecte seu Cal.com para sincronizar agendamentos automaticamente.
          </p>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">API Key do Cal.com</Label>
              <Input
                type="password"
                value={form.calComApiKey}
                onChange={(e) => setForm({ ...form, calComApiKey: e.target.value })}
                placeholder="cal_live_..."
              />
            </div>
            <div>
              <Label className="text-xs mb-1 block">ID do Tipo de Evento</Label>
              <Input
                value={form.calComEventTypeId}
                onChange={(e) => setForm({ ...form, calComEventTypeId: e.target.value })}
                placeholder="Ex: 12345"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
