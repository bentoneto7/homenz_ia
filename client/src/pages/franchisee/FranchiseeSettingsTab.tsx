import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Phone, MapPin, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function FranchiseeSettingsTab() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.homenz.getFranchiseSettings.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [zipCode, setZipCode] = useState("");

  // Preencher campos quando os dados chegarem
  useEffect(() => {
    if (settingsQuery.data) {
      setAddress(settingsQuery.data.address || "");
      setPhone(settingsQuery.data.phone || "");
    }
  }, [settingsQuery.data]);

  const updateMutation = trpc.homenz.updateFranchiseSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      utils.homenz.getFranchiseSettings.invalidate();
    },
    onError: err => toast.error(err.message || "Erro ao salvar"),
  });

  const fetchCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(
          `${data.logradouro ? data.logradouro + ", " : ""}${data.bairro ? data.bairro + ", " : ""}${data.localidade}/${data.uf}`
        );
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
    });
  };

  if (settingsQuery.isLoading)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 text-[#00C1B8] animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[#0A2540] font-bold text-lg">
          Configurações da Franquia
        </h4>
        <p className="text-[#5A667A] text-sm mt-0.5">
          Atualize os dados da sua unidade exibidos nas landing pages
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">
        {/* Endereço */}
        <div>
          <p className="text-[#0A2540] font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00C1B8]" /> Endereço da Unidade
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-[#5A667A] text-xs font-medium block mb-1.5">
                CEP (preenche o endereço automaticamente)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={zipCode}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                    const masked =
                      v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v;
                    setZipCode(masked);
                    if (v.length === 8) fetchCep(v);
                  }}
                  placeholder="00000-000"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all pr-10"
                />
                {cepLoading && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3.5 text-[#00C1B8]" />
                )}
                {!cepLoading && zipCode.replace(/\D/g, "").length === 8 && (
                  <MapPin className="w-4 h-4 absolute right-3 top-3.5 text-[#00C1B8]" />
                )}
              </div>
            </div>
            <div>
              <label className="text-[#5A667A] text-xs font-medium block mb-1.5">
                Endereço completo
              </label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade/UF"
                className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
              />
              <p className="text-[10px] text-[#A0AABB] mt-1">
                Aparece como link do Google Maps nas suas landing pages
              </p>
            </div>
          </div>
        </div>

        {/* Divisor */}
        <div className="border-t border-[#E2E8F0]" />

        {/* Número de Atendimento */}
        <div>
          <p className="text-[#0A2540] font-semibold text-sm mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#00C1B8]" /> Número de Atendimento
          </p>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(00) 90000-0000"
            className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
          />
          <p className="text-[10px] text-[#A0AABB] mt-1">
            WhatsApp ou telefone exibido nas landing pages para contato direto
          </p>
        </div>

        {/* Botão salvar */}
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full py-3 rounded-xl bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#00a89f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}
