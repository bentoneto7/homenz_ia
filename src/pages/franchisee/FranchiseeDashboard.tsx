import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import HomenzLayout from "@/components/HomenzLayout";
import TrialExpiredGate from "@/components/TrialExpiredGate";
import CalendarTab from "@/components/CalendarTab";
import {
  Target, Calendar, Users, Award, TrendingUp,
  Flame, Thermometer, Snowflake, Copy, Plus,
  Loader2, UserPlus, Phone, MessageSquare,
  ChevronRight, BarChart3, Clock, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, TrendingDown,
  Zap, Activity, ArrowUp, ArrowDown, Minus,
  Link2, ExternalLink, QrCode, Globe, Smartphone, Eye, MousePointerClick, Share2, MapPin,
  Settings, Info, CheckCircle, EyeOff, BarChart2, Timer, CreditCard, X,
} from "lucide-react";
import { toast } from "sonner";

// ── Componente de Configurações da Franquia ─────────────────────────────────────

function FranchiseeSettingsTab() {
  const settingsQuery = { data: null, isLoading: false, refetch: () => {} };
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

  const updateMutation = { mutate: async () => {}, isPending: false };

  const fetchCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(`${data.logradouro ? data.logradouro + ", " : ""}${data.bairro ? data.bairro + ", " : ""}${data.localidade}/${data.uf}`);
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
    updateMutation.mutate({ address: address.trim() || undefined, phone: phone.trim() || undefined });
  };

  if (settingsQuery.isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 text-[#00C1B8] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-[#0A2540] font-bold text-lg">Configurações da Franquia</h4>
        <p className="text-[#5A667A] text-sm mt-0.5">Atualize os dados da sua unidade exibidos nas landing pages</p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 space-y-5">
        {/* Endereço */}
        <div>
          <p className="text-[#0A2540] font-semibold text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00C1B8]" /> Endereço da Unidade
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-[#5A667A] text-xs font-medium block mb-1.5">CEP (preenche o endereço automaticamente)</label>
              <div className="relative">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                    const masked = v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v;
                    setZipCode(masked);
                    if (v.length === 8) fetchCep(v);
                  }}
                  placeholder="00000-000"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all pr-10"
                />
                {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3.5 text-[#00C1B8]" />}
                {!cepLoading && zipCode.replace(/\D/g, "").length === 8 && <MapPin className="w-4 h-4 absolute right-3 top-3.5 text-[#00C1B8]" />}
              </div>
            </div>
            <div>
              <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Endereço completo</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, bairro, cidade/UF"
                className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
              />
              <p className="text-[10px] text-[#A0AABB] mt-1">Aparece como link do Google Maps nas suas landing pages</p>
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
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 90000-0000"
            className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
          />
          <p className="text-[10px] text-[#A0AABB] mt-1">WhatsApp ou telefone exibido nas landing pages para contato direto</p>
        </div>

        {/* Botão salvar */}
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

// ── Componente de Landing Pages ────────────────────────────────────────────────

type LandingPage = {
  id: string;
  slug: string;
  title: string;
  procedure: string;
  active: boolean;
  total_views: number;
  total_leads: number;
  created_at: string;
};

type EditingLP = { id: string; title: string; procedure: string; city: string; state: string } | null;

// Tipo para o modal de gerenciamento de vendedores de uma LP
type ManagingSellersLP = { id: string; title: string } | null;

function LandingPagesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingLP, setEditingLP] = useState<EditingLP>(null);
  const [managingSellersLP, setManagingSellersLP] = useState<ManagingSellersLP>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newProcedure, setNewProcedure] = useState("crescimento-capilar");
  const [newAddress, setNewAddress] = useState("");
  const [newZipCode, setNewZipCode] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  // Vendedores selecionados no modal de criação
  const [selectedSellerIds, setSelectedSellerIds] = useState<string[]>([]);
  // Vendedores selecionados no modal de gerenciamento de LP existente
  const [managingSellerIds, setManagingSellerIds] = useState<string[]>([]);
  // Pixel por LP: mapa de landingPageId -> pixelId editado
  const [lpPixelEditing, setLpPixelEditing] = useState<Record<string, string>>({});
  const [lpPixelSaving, setLpPixelSaving] = useState<Record<string, boolean>>({});
  const baseUrl = window.location.origin;

  const [pagesData, setPagesData] = useState<unknown[]>([]);
  const [pagesLoading, setPagesLoading] = useState(true);
  const pagesQuery = { data: pagesData, isLoading: pagesLoading, refetch: async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    const { data: fr } = await supabase.from("franchises").select("id").eq("owner_id", u.id).maybeSingle();
    if (!fr) return;
    const { data } = await supabase.from("landing_pages").select("*, users(*)").eq("franchise_id", fr.id);
    setPagesData(data ?? []);
  } };
  useEffect(() => { pagesQuery.refetch(); }, []);

  const sellersQuery = { data: null, isLoading: false, refetch: () => {} };
  const hasSellers = sellersQuery.data?.hasSellers ?? false;
  const sellersCount = sellersQuery.data?.count ?? 0;

  // Buscar lista completa de vendedores para o modal de criação
  const allSellersQuery = { data: null, isLoading: false, refetch: () => {} };
  const allSellers = allSellersQuery.data ?? [];

  // Buscar vendedores vinculados à LP sendo gerenciada
  const lpSellersQuery = { data: null, isLoading: false, refetch: () => {} };

  // Quando abrir o modal de gerenciamento, pré-selecionar os vendedores já vinculados
  useEffect(() => {
    if (lpSellersQuery.data && managingSellersLP) {
      setManagingSellerIds(lpSellersQuery.data.map((s) => s.sellerId));
    }
  }, [lpSellersQuery.data, managingSellersLP]);

  const assignSellersMutation = { mutate: async () => {}, isPending: false };
      setManagingSellersLP(null);
      setManagingSellerIds([]);

  const createMutation = { mutate: async () => {}, isPending: false };
      setShowCreate(false);
      setNewTitle("");
      setSelectedSellerIds([]);

  const pages = pagesQuery.data ?? [];

  const toggleMutation = { mutate: async () => {}, isPending: false };
      toast.success("Status atualizado!");

  const updateLPMutation = { mutate: async () => {}, isPending: false };
      setEditingLP(null);

  const fetchCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewAddress(`${data.logradouro ? data.logradouro + ", " : ""}${data.bairro ? data.bairro + ", " : ""}${data.localidade}/${data.uf}`);
      } else {
        toast.error("CEP não encontrado");
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const createPage = () => {
    if (!newTitle.trim()) { toast.error("Dê um nome para a landing page"); return; }
    if (!hasSellers) {
      toast.error("Cadastre ao menos um vendedor antes de criar uma landing page. Os leads precisam de um destino!");
      return;
    }
    if (selectedSellerIds.length === 0) {
      toast.error("Selecione ao menos um vendedor para receber os leads desta página.");
      return;
    }
    createMutation.mutate({
      title: newTitle,
      procedure: newProcedure,
      address: newAddress || undefined,
      zipCode: newZipCode || undefined,
      sellerIds: selectedSellerIds,
    });
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${baseUrl}/l/${slug}`);
    toast.success("Link copiado!");
  };

  const saveLpPixel = async (landingPageId: string) => {
    const pixelId = lpPixelEditing[landingPageId] ?? null;
    setLpPixelSaving(prev => ({ ...prev, [landingPageId]: true }));
    try {
      await utils.client.distribution.updateLandingPagePixel.mutate({
        landingPageId,
        pixelId: pixelId || null,
      });
      toast.success("Pixel salvo para esta landing page!");
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message || "Erro ao salvar pixel");
    } finally {
      setLpPixelSaving(prev => ({ ...prev, [landingPageId]: false }));
    }
  };

  if (pagesQuery.isLoading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-6 h-6 text-[#00C1B8] animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-[#0A2540] font-bold text-lg">Landing Pages da Franquia</h4>
          <p className="text-[#5A667A] text-sm mt-0.5">Crie páginas de captação para usar no tráfego pago</p>
        </div>
        <button
          onClick={() => {
            if (!hasSellers) {
              toast.error("Cadastre ao menos 1 vendedor na aba Time antes de criar uma landing page.");
              return;
            }
            setShowCreate(true);
          }}
          disabled={sellersQuery.isLoading}
          title={!hasSellers ? "Cadastre um vendedor primeiro" : "Criar nova landing page"}
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors border ${
            hasSellers
              ? 'bg-teal-50 text-[#00C1B8] hover:bg-[#00C1B8]/30 border-[#14b8a6]/30'
              : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          }`}
        >
          <Plus className="w-4 h-4" />
          Nova Landing Page
          {!hasSellers && !sellersQuery.isLoading && <AlertTriangle className="w-3.5 h-3.5 ml-1" />}
        </button>
      </div>

      {/* Alerta: sem vendedores */}
      {!sellersQuery.isLoading && !hasSellers && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm mb-1">Nenhum vendedor cadastrado</p>
            <p className="text-amber-700 text-sm leading-relaxed">
              Para criar uma landing page, você precisa ter ao menos <strong>1 vendedor ativo</strong>. Os leads captados são distribuídos automaticamente entre os vendedores via round-robin. Cadastre um vendedor na aba <strong>Time</strong> antes de criar uma landing page.
            </p>
          </div>
        </div>
      )}
      {!sellersQuery.isLoading && hasSellers && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-700 text-sm">
            <strong>{sellersCount} vendedor{sellersCount !== 1 ? 'es' : ''} ativo{sellersCount !== 1 ? 's' : ''}</strong> — os leads serão distribuídos automaticamente via round-robin.
          </p>
        </div>
      )}

      {/* Como funciona */}
      <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#0A2540] font-semibold text-sm mb-1">Como funciona</p>
            <p className="text-[#5A667A] text-sm leading-relaxed">
              Cada landing page tem uma URL única da sua franquia. O lead preenche o chat, envia uma foto da área com queda capilar e é distribuído automaticamente entre seus vendedores via round-robin.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-[#5A667A]"><Smartphone className="w-3.5 h-3.5" /> Otimizada para mobile</span>
              <span className="flex items-center gap-1.5 text-xs text-[#5A667A]"><Share2 className="w-3.5 h-3.5" /> Funciona com Meta Ads</span>
              <span className="flex items-center gap-1.5 text-xs text-[#5A667A]"><MousePointerClick className="w-3.5 h-3.5" /> Lead vai direto ao vendedor</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de landing pages */}
      {pages.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center">
          <Link2 className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
          <p className="text-[#5A667A] mb-1">Nenhuma landing page criada ainda</p>
          <p className="text-[#A0AABB] text-sm mb-5">Crie sua primeira página e comece a captar leads</p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[#00C1B8] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#009E96] transition-colors"
          >
            Criar primeira landing page
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map((page) => (
            <div key={page.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:shadow-md transition-all shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-[#0A2540] font-bold">{page.title}</h5>
                    <button
                      onClick={() => toggleMutation.mutate({ landingPageId: page.id, active: !page.active })}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        page.active ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25" : "bg-white text-[#A0AABB] border border-[#E2E8F0] hover:bg-[#F0F4F8]"
                      }`}
                    >{page.active ? "Ativa" : "Inativa"}</button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#A0AABB]" />
                    <span className="text-[#5A667A] text-xs font-mono truncate">{baseUrl}/l/{page.slug}</span>
                  </div>
                </div>
                {/* Métricas */}
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-[#0A2540] font-black text-sm">{page.total_views ?? 0}</p>
                    <p className="text-[#A0AABB] text-[10px]">visualiz.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 font-black text-sm">{page.total_leads ?? 0}</p>
                    <p className="text-[#A0AABB] text-[10px]">leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-400 font-black text-sm">{page.total_views ? Math.round((page.total_leads / page.total_views) * 100) : 0}%</p>
                    <p className="text-[#A0AABB] text-[10px]">conversão</p>
                  </div>
                </div>
              </div>
              {/* Pixel por LP */}
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-3.5 h-3.5 text-[#A0AABB]" />
                  <span className="text-xs font-semibold text-[#5A667A]">Meta Pixel desta LP</span>
                  <span className="text-[10px] text-[#A0AABB]">(sobrescreve o pixel da franquia)</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={lpPixelEditing[page.id] ?? ((page as Record<string, unknown>).pixel_id as string | null) ?? ""}
                    onChange={(e) => setLpPixelEditing(prev => ({ ...prev, [page.id]: e.target.value.replace(/\D/g, "").slice(0, 20) }))}
                    placeholder="ID do Pixel (opcional)"
                    className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[#0A2540] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#004A9D]/30 focus:border-[#004A9D]"
                  />
                  <button
                    onClick={() => saveLpPixel(page.id)}
                    disabled={lpPixelSaving[page.id]}
                    className="px-3 py-1.5 bg-[#004A9D] text-white text-xs font-semibold rounded-lg hover:bg-[#003580] transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {lpPixelSaving[page.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                    Salvar
                  </button>
                </div>
              </div>
              {/* Ações */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <button
                  onClick={() => copyLink(page.slug)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#00C1B8] bg-teal-50 hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-[#00C1B8]"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar link
                </button>
                <button
                  onClick={() => setEditingLP({
                    id: page.id,
                    title: page.title,
                    procedure: page.procedure,
                    city: (page as Record<string, unknown>).city as string ?? "",
                    state: (page as Record<string, unknown>).state as string ?? "",
                  })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#004A9D] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-[#004A9D]/30"
                >
                  <Settings className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => {
                    setManagingSellersLP({ id: page.id, title: page.title });
                    setManagingSellerIds([]);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors border border-violet-300"
                >
                  <Users className="w-3.5 h-3.5" /> Vendedores
                </button>
                <a
                  href={`/l/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:opacity-90 px-3 py-1.5 rounded-lg transition-all shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver minha landing page
                </a>
                <span className="flex items-center gap-1.5 text-xs text-[#A0AABB] ml-auto">
                  <Eye className="w-3.5 h-3.5" /> UTM: utm_source=meta&utm_campaign={page.slug}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar landing page */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-[#0A2540] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Nova Landing Page</h3>
            <p className="text-[#5A667A] text-sm mb-6">Configure a página de captação da sua franquia</p>
            <div className="space-y-4">
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Nome da página</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Homenz Uberaba — Crescimento Capilar"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                />
              </div>
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Procedimento</label>
                <select
                  value={newProcedure}
                  onChange={(e) => setNewProcedure(e.target.value)}
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] focus:outline-none focus:border-[#00C1B8] transition-all"
                >
                  <option value="crescimento-capilar">Crescimento Capilar</option>
                  <option value="micropigmentacao">Micropigmentação Capilar</option>
                  <option value="diagnostico">Diagnóstico Capilar Gratuito</option>
                </select>
              </div>
              {/* CEP + Endereço */}
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">CEP da clínica</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newZipCode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      const masked = v.length > 5 ? v.slice(0,5) + "-" + v.slice(5) : v;
                      setNewZipCode(masked);
                      if (v.length === 8) fetchCep(v);
                    }}
                    placeholder="00000-000"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all pr-10"
                  />
                  {cepLoading && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3.5 text-[#00C1B8]" />}
                  {!cepLoading && newZipCode.replace(/\D/g,"").length === 8 && <MapPin className="w-4 h-4 absolute right-3 top-3.5 text-[#00C1B8]" />}
                </div>
              </div>
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Endereço completo</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade/UF"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                />
                <p className="text-[10px] text-[#A0AABB] mt-1">Preenchido automaticamente pelo CEP. Edite se necessitar.</p>
              </div>
              {newTitle && (
                <div className="bg-white rounded-xl p-3">
                  <p className="text-[#5A667A] text-xs mb-1">URL que será gerada:</p>
                  <p className="text-[#00C1B8] text-xs font-mono break-all">
                    {baseUrl}/l/{newTitle.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}
                  </p>
                </div>
              )}
              {/* Seleção de vendedores */}
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Vendedores que receberão os leads <span className="text-red-400">*</span>
                </label>
                {allSellersQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00C1B8]" />
                    <span className="text-[#5A667A] text-sm">Carregando vendedores...</span>
                  </div>
                ) : allSellers.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                    Nenhum vendedor ativo encontrado. Cadastre vendedores na aba Time.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allSellers.map((seller) => (
                      <label key={seller.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                        selectedSellerIds.includes(seller.id)
                          ? 'bg-teal-50 border-[#00C1B8] text-[#0A2540]'
                          : 'bg-[#F0F4F8] border-[#E2E8F0] text-[#5A667A] hover:border-[#00C1B8]/40'
                      }`}>
                        <input
                          type="checkbox"
                          checked={selectedSellerIds.includes(seller.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSellerIds(prev => [...prev, seller.id]);
                            } else {
                              setSelectedSellerIds(prev => prev.filter(id => id !== seller.id));
                            }
                          }}
                          className="w-4 h-4 accent-[#00C1B8] flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{seller.name}</p>
                          <p className="text-xs text-[#A0AABB] truncate">{seller.email}</p>
                        </div>
                        {selectedSellerIds.includes(seller.id) && (
                          <CheckCircle className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                        )}
                      </label>
                    ))}
                    {selectedSellerIds.length > 0 && (
                      <p className="text-xs text-[#00C1B8] font-medium">
                        {selectedSellerIds.length} vendedor{selectedSellerIds.length !== 1 ? 'es' : ''} selecionado{selectedSellerIds.length !== 1 ? 's' : ''} — round-robin entre eles
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setNewTitle(""); setNewAddress(""); setNewZipCode(""); setSelectedSellerIds([]); }}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createPage}
                disabled={createMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-[#0A2540] font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Criar Landing Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar landing page */}
      {editingLP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-[#0A2540]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Editar Landing Page</h3>
              <button onClick={() => setEditingLP(null)} className="text-[#A0AABB] hover:text-[#0A2540] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#5A667A] text-sm mb-6">Atualize o título e procedimento da página</p>
            <div className="space-y-4">
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Título da página</label>
                <input
                  type="text"
                  value={editingLP.title}
                  onChange={(e) => setEditingLP(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Ex: Homenz Rio Branco — Crescimento Capilar"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                />
              </div>
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Procedimento</label>
                <select
                  value={editingLP.procedure}
                  onChange={(e) => setEditingLP(prev => prev ? { ...prev, procedure: e.target.value } : null)}
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] focus:outline-none focus:border-[#00C1B8] transition-all"
                >
                  <option value="crescimento-capilar">Crescimento Capilar</option>
                  <option value="micropigmentacao">Micropigmentação Capilar</option>
                  <option value="diagnostico">Diagnóstico Capilar Gratuito</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Cidade</label>
                  <input
                    type="text"
                    value={editingLP.city}
                    onChange={(e) => setEditingLP(prev => prev ? { ...prev, city: e.target.value } : null)}
                    placeholder="Rio Branco"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[#5A667A] text-sm font-medium block mb-1.5">Estado (UF)</label>
                  <input
                    type="text"
                    value={editingLP.state}
                    onChange={(e) => setEditingLP(prev => prev ? { ...prev, state: e.target.value.toUpperCase().slice(0, 2) } : null)}
                    placeholder="AC"
                    maxLength={2}
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all uppercase"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingLP(null)}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => updateLPMutation.mutate({
                  id: editingLP.id,
                  title: editingLP.title.trim() || undefined,
                  procedure: editingLP.procedure || undefined,
                  city: editingLP.city.trim() || undefined,
                  state: editingLP.state.trim() || undefined,
                })}
                disabled={updateLPMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {updateLPMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de gerenciamento de vendedores da LP */}
      {managingSellersLP && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-[#0A2540]" style={{ fontFamily: "'Montserrat', sans-serif" }}>Vendedores da LP</h3>
              <button onClick={() => { setManagingSellersLP(null); setManagingSellerIds([]); }} className="text-[#A0AABB] hover:text-[#0A2540] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#5A667A] text-sm mb-1">
              <span className="font-semibold text-[#0A2540]">{managingSellersLP.title}</span>
            </p>
            <p className="text-[#5A667A] text-xs mb-5">
              Selecione quais vendedores receberão os leads desta página. A distribuição será feita em round-robin igualitário entre os selecionados.
            </p>

            {lpSellersQuery.isLoading || allSellersQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00C1B8]" />
              </div>
            ) : allSellers.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                Nenhum vendedor ativo encontrado. Cadastre vendedores na aba Time.
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {allSellers.map((seller) => (
                  <label key={seller.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                    managingSellerIds.includes(seller.id)
                      ? 'bg-violet-50 border-violet-400 text-[#0A2540]'
                      : 'bg-[#F0F4F8] border-[#E2E8F0] text-[#5A667A] hover:border-violet-300'
                  }`}>
                    <input
                      type="checkbox"
                      checked={managingSellerIds.includes(seller.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setManagingSellerIds(prev => [...prev, seller.id]);
                        } else {
                          setManagingSellerIds(prev => prev.filter(id => id !== seller.id));
                        }
                      }}
                      className="w-4 h-4 accent-violet-600 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{seller.name}</p>
                      <p className="text-xs text-[#A0AABB] truncate">{seller.email}</p>
                    </div>
                    {managingSellerIds.includes(seller.id) && (
                      <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    )}
                  </label>
                ))}
                {managingSellerIds.length > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
                    <p className="text-xs text-violet-700 font-medium">
                      ✅ {managingSellerIds.length} vendedor{managingSellerIds.length !== 1 ? 'es' : ''} selecionado{managingSellerIds.length !== 1 ? 's' : ''} — leads distribuídos em round-robin entre eles
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setManagingSellersLP(null); setManagingSellerIds([]); }}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (managingSellerIds.length === 0) {
                    toast.error("Selecione ao menos um vendedor");
                    return;
                  }
                  assignSellersMutation.mutate({
                    landingPageId: managingSellersLP.id,
                    sellerIds: managingSellerIds,
                  });
                }}
                disabled={assignSellersMutation.isPending || managingSellerIds.length === 0}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {assignSellersMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Salvar Vendedores
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tipos ───────────────────────────────────────────────────────────────────────────────────────

type SellerMetrics = {
  leads_assigned: number;
  leads_contacted: number;
  leads_scheduled: number;
  leads_confirmed: number;
  avg_response_minutes: number;
  conversion_rate: number;
  score: number;
  leads_followup_done?: number;
  leads_lost_no_contact?: number;
  leads_lost_no_followup?: number;
  followup_rate?: number;
  first_contact_rate?: number;
};

type Seller = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  leadsAssigned: number;
  metrics: SellerMetrics | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSellerStatus(m: SellerMetrics | null): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  description: string;
} {
  if (!m) return {
    label: "Sem dados",
    color: "text-[#5A667A]",
    bg: "bg-white",
    border: "border-[#E2E8F0]",
    icon: <Minus className="w-3.5 h-3.5" />,
    description: "Nenhuma métrica registrada ainda",
  };

  const score = m.score;
  if (score >= 80) return {
    label: "Alta performance",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    description: "Abordagem rápida, boa conversão e follow-up consistente",
  };
  if (score >= 60) return {
    label: "Em desenvolvimento",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: <Activity className="w-3.5 h-3.5" />,
    description: "Bom ritmo, mas há espaço para melhorar follow-up",
  };
  return {
    label: "Precisa de atenção",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    description: "Tempo de resposta alto ou baixa taxa de follow-up",
  };
}

function formatResponseTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function ResponseTimeBadge({ minutes }: { minutes: number }) {
  const isGood = minutes <= 10;
  const isOk = minutes <= 30;
  const color = isGood ? "text-emerald-400" : isOk ? "text-amber-400" : "text-red-400";
  const icon = isGood ? <Zap className="w-3 h-3" /> : isOk ? <Clock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />;
  return (
    <span className={`flex items-center gap-1 font-black text-sm ${color}`}>
      {icon}
      {formatResponseTime(minutes)}
    </span>
  );
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1 bg-white/8 rounded-full overflow-hidden w-full">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function MetricPill({ label, value, color = "text-[#0A2540]" }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <span className={`font-black text-sm leading-none ${color}`}>{value}</span>
      <span className="text-[#A0AABB] text-[10px] leading-none text-center">{label}</span>
    </div>
  );
}

// ── Card de vendedor expandido ─────────────────────────────────────────────────

function SellerCard({ seller, rank }: { seller: Seller; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const m = seller.metrics;
  const status = getSellerStatus(m);
  const initials = seller.name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  const rankColors = [
    "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "bg-slate-400/20 text-slate-300 border-slate-400/30",
    "bg-orange-700/20 text-orange-500 border-orange-700/30",
  ];

  // Alertas automáticos
  const alerts: { text: string; type: "warn" | "danger" | "ok" }[] = [];
  if (m) {
    if (m.avg_response_minutes > 30) alerts.push({ text: `Tempo de resposta alto: ${formatResponseTime(m.avg_response_minutes)}`, type: "danger" });
    if ((m.followup_rate ?? 100) < 70) alerts.push({ text: `Follow-up abaixo de 70% (${m.followup_rate?.toFixed(0)}%)`, type: "warn" });
    if ((m.leads_lost_no_contact ?? 0) >= 3) alerts.push({ text: `${m.leads_lost_no_contact} leads sem 1ª abordagem`, type: "danger" });
    if ((m.leads_lost_no_followup ?? 0) >= 3) alerts.push({ text: `${m.leads_lost_no_followup} leads perdidos sem follow-up`, type: "warn" });
    if (m.conversion_rate >= 55 && m.avg_response_minutes <= 15) alerts.push({ text: "Ótima combinação: resposta rápida + alta conversão", type: "ok" });
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      expanded ? "border-[#004A9D]/20" : "border-[#E2E8F0] hover:border-[#004A9D]/20"
    }`}>
      {/* Linha principal */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-5 text-left"
      >
        {/* Rank */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-black text-sm border ${
          rankColors[rank - 1] ?? "bg-[#EBF4FF] text-[#5A667A] border-[#E2E8F0]"
        }`}>{rank}</div>

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">{initials}</span>
        </div>

        {/* Nome + status */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[#0A2540] font-semibold text-sm">{seller.name}</p>
            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.bg} ${status.color} ${status.border}`}>
              {status.icon}
              {status.label}
            </span>
          </div>
          <p className="text-[#5A667A] text-xs mt-0.5">{seller.leadsAssigned} leads atribuídos este mês</p>
        </div>

        {/* Métricas resumidas */}
        {m && (
          <div className="hidden sm:flex items-center gap-5 mr-2">
            <MetricPill label="agendados" value={m.leads_scheduled} color="text-[#0A2540]" />
            <MetricPill label="conversão" value={`${m.conversion_rate}%`} color={m.conversion_rate >= 55 ? "text-emerald-400" : m.conversion_rate >= 40 ? "text-amber-400" : "text-red-400"} />
            <div className="flex flex-col items-center gap-0.5">
              <ResponseTimeBadge minutes={m.avg_response_minutes} />
              <span className="text-[#A0AABB] text-[10px]">1ª resposta</span>
            </div>
            <MetricPill label="follow-up" value={`${m.followup_rate?.toFixed(0) ?? "—"}%`} color={(m.followup_rate ?? 0) >= 80 ? "text-emerald-400" : (m.followup_rate ?? 0) >= 65 ? "text-amber-400" : "text-red-400"} />
          </div>
        )}

        {/* Score + expand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {m && (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
              m.score >= 80 ? "bg-emerald-500/15 text-emerald-400" :
              m.score >= 60 ? "bg-amber-500/15 text-amber-400" :
              "bg-red-500/15 text-red-400"
            }`}>{m.score}</div>
          )}
          <ChevronRight className={`w-4 h-4 text-[#A0AABB] transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
      </button>

      {/* Barra de score */}
      {m && (
        <div className="px-5 pb-1">
          <MiniBar value={m.score} max={100} color={
            m.score >= 80 ? "bg-gradient-to-r from-emerald-500 to-teal-400" :
            m.score >= 60 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
            "bg-gradient-to-r from-red-500 to-orange-400"
          } />
        </div>
      )}

      {/* Painel expandido */}
      {expanded && m && (
        <div className="px-5 pb-5 pt-4 border-t border-[#E2E8F0] mt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Bloco 1: Abordagem */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#00C1B8]" />
                <p className="text-[#5A667A] text-xs font-bold uppercase tracking-wider">Velocidade de Abordagem</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <ResponseTimeBadge minutes={m.avg_response_minutes} />
                  <p className="text-[#5A667A] text-xs mt-1">tempo médio de 1ª resposta</p>
                </div>
                <div className="text-right">
                  <p className={`font-black text-sm ${(m.first_contact_rate ?? 0) >= 85 ? "text-emerald-400" : (m.first_contact_rate ?? 0) >= 70 ? "text-amber-400" : "text-red-400"}`}>
                    {m.first_contact_rate?.toFixed(0) ?? "—"}%
                  </p>
                  <p className="text-[#A0AABB] text-xs">leads abordados</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A667A]">Abordados</span>
                  <span className="text-[#0A2540] font-semibold">{m.leads_contacted} / {m.leads_assigned}</span>
                </div>
                <MiniBar value={m.leads_contacted} max={m.leads_assigned} color="bg-gradient-to-r from-[#14b8a6] to-[#3b82f6]" />
                {(m.leads_lost_no_contact ?? 0) > 0 && (
                  <p className="text-red-400/80 text-[11px] flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    {m.leads_lost_no_contact} lead{(m.leads_lost_no_contact ?? 0) > 1 ? "s" : ""} sem abordagem
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 2: Follow-up */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                <p className="text-[#5A667A] text-xs font-bold uppercase tracking-wider">Follow-up</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`font-black text-2xl leading-none ${(m.followup_rate ?? 0) >= 80 ? "text-emerald-400" : (m.followup_rate ?? 0) >= 65 ? "text-amber-400" : "text-red-400"}`}>
                    {m.followup_rate?.toFixed(0) ?? "—"}%
                  </p>
                  <p className="text-[#5A667A] text-xs mt-1">taxa de follow-up</p>
                </div>
                <div className="text-right">
                  <p className="text-[#0A2540] font-black text-sm">{m.leads_followup_done ?? 0}</p>
                  <p className="text-[#A0AABB] text-xs">follow-ups feitos</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A667A]">Recontatos</span>
                  <span className="text-[#0A2540] font-semibold">{m.leads_followup_done ?? 0} / {m.leads_contacted}</span>
                </div>
                <MiniBar value={m.leads_followup_done ?? 0} max={m.leads_contacted} color="bg-gradient-to-r from-blue-500 to-cyan-400" />
                {(m.leads_lost_no_followup ?? 0) > 0 && (
                  <p className="text-amber-400/80 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {m.leads_lost_no_followup} lead{(m.leads_lost_no_followup ?? 0) > 1 ? "s" : ""} perdido{(m.leads_lost_no_followup ?? 0) > 1 ? "s" : ""} sem recontato
                  </p>
                )}
              </div>
            </div>

            {/* Bloco 3: Conversão */}
            <div className="bg-white rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-4 h-4 text-violet-400" />
                <p className="text-[#5A667A] text-xs font-bold uppercase tracking-wider">Conversão em Agenda</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`font-black text-2xl leading-none ${m.conversion_rate >= 55 ? "text-emerald-400" : m.conversion_rate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                    {m.conversion_rate}%
                  </p>
                  <p className="text-[#5A667A] text-xs mt-1">leads → agendamento</p>
                </div>
                <div className="text-right">
                  <p className="text-[#0A2540] font-black text-sm">{m.leads_confirmed}</p>
                  <p className="text-[#A0AABB] text-xs">confirmados</p>
                </div>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A667A]">Agendados</span>
                  <span className="text-[#0A2540] font-semibold">{m.leads_scheduled} / {m.leads_assigned}</span>
                </div>
                <MiniBar value={m.leads_scheduled} max={m.leads_assigned} color="bg-gradient-to-r from-violet-500 to-purple-400" />
                <div className="flex justify-between text-[11px] text-[#5A667A] pt-0.5">
                  <span>Confirmados: {m.leads_confirmed}</span>
                  <span>Pendentes: {m.leads_scheduled - m.leads_confirmed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Alertas automáticos */}
          {alerts.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-[#A0AABB] text-xs font-semibold uppercase tracking-wider">Diagnóstico automático</p>
              {alerts.map((alert, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                  alert.type === "danger" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                  alert.type === "warn" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}>
                  {alert.type === "danger" ? <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
                   alert.type === "warn" ? <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> :
                   <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                  {alert.text}
                </div>
              ))}
            </div>
          )}

          {/* Ação rápida */}
          <div className="mt-4 flex gap-2">
            <a
              href={`https://wa.me/${seller.phone?.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors border border-emerald-500/20"
            >
              <Phone className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#5A667A] text-xs font-semibold hover:bg-[#EBF4FF] transition-colors border border-[#E2E8F0]">
              <MessageSquare className="w-3.5 h-3.5" />
              Dar feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Visão de saúde do time ────────────────────────────────────────────────────

function TeamHealthPanel({ sellers }: { sellers: Seller[] }) {
  const withMetrics = sellers.filter((s) => s.metrics);
  if (withMetrics.length === 0) return null;

  const avgResponse = Math.round(withMetrics.reduce((a, s) => a + (s.metrics?.avg_response_minutes ?? 0), 0) / withMetrics.length);
  const avgConversion = Math.round(withMetrics.reduce((a, s) => a + (s.metrics?.conversion_rate ?? 0), 0) / withMetrics.length);
  const avgFollowup = Math.round(withMetrics.reduce((a, s) => a + (s.metrics?.followup_rate ?? 0), 0) / withMetrics.length);
  const totalLost = withMetrics.reduce((a, s) => a + (s.metrics?.leads_lost_no_contact ?? 0) + (s.metrics?.leads_lost_no_followup ?? 0), 0);

  const healthScore = Math.round(
    (avgConversion / 60) * 40 +
    (Math.max(0, 60 - avgResponse) / 60) * 30 +
    (avgFollowup / 100) * 30
  );

  return (
    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00C1B8]" />
          <p className="text-[#0A2540] font-bold text-sm">Saúde do Time Comercial</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-sm ${
          healthScore >= 70 ? "bg-emerald-500/15 text-emerald-400" :
          healthScore >= 50 ? "bg-amber-500/15 text-amber-400" :
          "bg-red-500/15 text-red-400"
        }`}>
          <BarChart3 className="w-4 h-4" />
          {healthScore}/100
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 text-center">
          <ResponseTimeBadge minutes={avgResponse} />
          <p className="text-[#5A667A] text-[11px] mt-1">tempo médio resposta</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className={`font-black text-sm ${avgConversion >= 50 ? "text-emerald-400" : avgConversion >= 35 ? "text-amber-400" : "text-red-400"}`}>
            {avgConversion}%
          </p>
          <p className="text-[#5A667A] text-[11px] mt-1">conversão média</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className={`font-black text-sm ${avgFollowup >= 80 ? "text-emerald-400" : avgFollowup >= 65 ? "text-amber-400" : "text-red-400"}`}>
            {avgFollowup}%
          </p>
          <p className="text-[#5A667A] text-[11px] mt-1">taxa de follow-up</p>
        </div>
        <div className="bg-white rounded-xl p-3 text-center">
          <p className={`font-black text-sm ${totalLost === 0 ? "text-emerald-400" : totalLost <= 3 ? "text-amber-400" : "text-red-400"}`}>
            {totalLost}
          </p>
          <p className="text-[#5A667A] text-[11px] mt-1">leads perdidos no mês</p>
        </div>
      </div>

      {totalLost > 4 && (
        <div className="mt-3 flex items-start gap-2 bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5 text-xs text-red-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>
            <strong>{totalLost} leads perdidos</strong> por falta de abordagem ou follow-up este mês. Considere uma reunião de alinhamento com o time.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:bg-white/8 transition-colors">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-[#0A2540]">{value}</p>
      <p className="text-sm text-[#5A667A] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#00C1B8] font-medium mt-1">{sub}</p>}
    </div>
  );
}

function TemperatureIcon({ temp }: { temp: string }) {
  if (temp === "hot") return <Flame className="w-3.5 h-3.5 text-orange-400" />;
  if (temp === "warm") return <Thermometer className="w-3.5 h-3.5 text-amber-400" />;
  return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400 bg-emerald-500/15" :
    score >= 50 ? "text-amber-400 bg-amber-500/15" :
    "text-blue-400 bg-blue-500/15";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score}</span>
  );
}

// ── Componente Meta Pixel ───────────────────────────────────────────────────

function PixelTab({ franchiseId }: { franchiseId: string }) {
  const pixelQuery = { data: null, isLoading: false, refetch: () => {} };
  const capiQuery = { data: null, isLoading: false, refetch: () => {} };
  const testCodeQuery = { data: null, isLoading: false, refetch: () => {} };
  const eventStatsQuery = { data: null, isLoading: false, refetch: () => {} };

  const [pixelInput, setPixelInput] = useState("");
  const [capiInput, setCapiInput] = useState("");
  const [testCodeInput, setTestCodeInput] = useState("");
  const [showCapiToken, setShowCapiToken] = useState(false);
  const [savedPixel, setSavedPixel] = useState(false);
  const [savedCapi, setSavedCapi] = useState(false);
  const [savedTestCode, setSavedTestCode] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (pixelQuery.data?.pixelId) setPixelInput(pixelQuery.data.pixelId);
  }, [pixelQuery.data?.pixelId]);

  useEffect(() => {
    if (capiQuery.data?.capiToken) setCapiInput(capiQuery.data.capiToken);
  }, [capiQuery.data?.capiToken]);

  useEffect(() => {
    if (testCodeQuery.data?.testEventCode) setTestCodeInput(testCodeQuery.data.testEventCode);
  }, [testCodeQuery.data?.testEventCode]);

  const updatePixelMutation = { mutate: async () => {}, isPending: false };
      setTimeout(() => setSavedPixel(false), 3000);
      toast.success("Meta Pixel salvo com sucesso!");

  const updateCapiMutation = { mutate: async () => {}, isPending: false };
      setTimeout(() => setSavedCapi(false), 3000);
      toast.success("CAPI Token salvo com sucesso!");

  const testCapiMutation = { mutate: async () => {}, isPending: false };
  const updateTestCodeMutation = { mutate: async () => {}, isPending: false };
      setTimeout(() => setSavedTestCode(false), 3000);
      toast.success(testCodeInput ? "Código de teste salvo!" : "Código de teste removido.");

  const handleTestPixel = async () => {
    const pid = pixelInput || pixelQuery.data?.pixelId;
    const capi = capiInput || capiQuery.data?.capiToken;
    const code = testCodeInput || testCodeQuery.data?.testEventCode || undefined;
    if (!pid) {
      toast.error("Configure o ID do Pixel antes de testar");
      return;
    }
    if (!capi) {
      toast.error("Configure o CAPI Access Token para testar a conexão server-side");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testCapiMutation.mutateAsync({ franchiseId, pixelId: pid, capiToken: capi, testEventCode: code });
      if (result.success) {
        const codeMsg = code ? ` (código de teste: ${code})` : '';
        setTestResult({ success: true, message: `Conexão OK! ${result.eventsReceived ?? 1} evento(s) recebido(s) pelo Meta.${codeMsg}` });
      } else {
        setTestResult({ success: false, message: result.error || "Erro desconhecido" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao testar";
      setTestResult({ success: false, message: msg });
    } finally {
      setIsTesting(false);
    }
  };

  const currentPixel = pixelQuery.data?.pixelId || null;
  const stats = eventStatsQuery.data as Record<string, { viewContent: number; initiateCheckout: number; leadFromDb?: number; lead: number; title: string }> | undefined;
  const totalViews = stats ? Object.values(stats).reduce((s, v) => s + (v.viewContent || 0), 0) : 0;
  const totalInitiate = stats ? Object.values(stats).reduce((s, v) => s + (v.initiateCheckout || 0), 0) : 0;
  const totalLeads = stats ? Object.values(stats).reduce((s, v) => s + (v.leadFromDb ?? v.lead ?? 0), 0) : 0;

  return (
    <div className="space-y-5">
      {/* Card: Pixel ID */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Settings className="w-5 h-5 text-[#004A9D]" />
          </div>
          <div>
            <h4 className="text-[#0A2540] font-bold text-base">Meta Pixel (Facebook Ads)</h4>
            <p className="text-[#5A667A] text-xs mt-0.5">Rastreie conversões nas suas landing pages com eventos automáticos.</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#0A2540]">ID do Meta Pixel</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={pixelInput}
              onChange={(e) => setPixelInput(e.target.value.replace(/\D/g, "").slice(0, 20))}
              placeholder="Ex: 1234567890123456"
              className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#0A2540] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#004A9D]/30 focus:border-[#004A9D]"
            />
            <button
              onClick={() => updatePixelMutation.mutate({ franchiseId, pixelId: pixelInput || null })}
              disabled={updatePixelMutation.isPending}
              className="px-4 py-2.5 bg-[#004A9D] text-white text-sm font-semibold rounded-xl hover:bg-[#003580] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updatePixelMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : savedPixel ? <CheckCircle className="w-4 h-4" /> : null}
              {savedPixel ? "Salvo!" : "Salvar"}
            </button>
          </div>
          {currentPixel && (
            <p className="text-xs text-emerald-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              Pixel ativo: <span className="font-mono font-bold">{currentPixel}</span>
            </p>
          )}
        </div>
      </div>

      {/* Card: CAPI Access Token */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-[#0A2540] font-bold text-base">Conversions API (CAPI)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">Recomendado</span>
            </div>
            <p className="text-[#5A667A] text-xs mt-0.5">Envio server-side de eventos — mais preciso que o pixel, funciona mesmo com bloqueadores de cookies (iOS 14+).</p>
          </div>
        </div>
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#0A2540]">Access Token do CAPI</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showCapiToken ? "text" : "password"}
                value={capiInput}
                onChange={(e) => setCapiInput(e.target.value.slice(0, 300))}
                placeholder="EAAxxxxxx..."
                className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[#0A2540] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
              />
              <button
                type="button"
                onClick={() => setShowCapiToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5A667A] hover:text-[#0A2540]"
              >
                {showCapiToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={() => updateCapiMutation.mutate({ franchiseId, capiToken: capiInput || null })}
              disabled={updateCapiMutation.isPending}
              className="px-4 py-2.5 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updateCapiMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : savedCapi ? <CheckCircle className="w-4 h-4" /> : null}
              {savedCapi ? "Salvo!" : "Salvar"}
            </button>
          </div>
          <p className="text-[10px] text-[#5A667A]">Encontre em: Meta Business &gt; Configurações &gt; Fontes de Dados &gt; Pixels &gt; API de Conversões &gt; Gerar Token de Acesso</p>
        </div>

        {/* Código de Teste */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9] space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-[#0A2540]">Código de Teste</label>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Opcional</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={testCodeInput}
              onChange={(e) => setTestCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20))}
              placeholder="Ex: TEST12345"
              className="flex-1 border border-[#E2E8F0] rounded-xl px-4 py-2 text-[#0A2540] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400"
            />
            <button
              onClick={() => updateTestCodeMutation.mutate({ franchiseId, testEventCode: testCodeInput || null })}
              disabled={updateTestCodeMutation.isPending}
              className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {updateTestCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : savedTestCode ? <CheckCircle className="w-4 h-4" /> : null}
              {savedTestCode ? "Salvo!" : "Salvar"}
            </button>
          </div>
          <p className="text-[10px] text-[#5A667A]">Quando preenchido, os eventos aparecem na aba <strong>Testar Eventos</strong> do Meta Events Manager sem afetar dados reais de campanha.</p>
        </div>

        {/* Botão Testar Pixel */}
        <div className="mt-4 pt-4 border-t border-[#F1F5F9]">
          <button
            onClick={handleTestPixel}
            disabled={isTesting || (!pixelInput && !currentPixel)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: "rgba(0,74,157,0.06)", border: "1px solid rgba(0,74,157,0.2)", color: "#004A9D" }}
          >
            {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {isTesting ? "Testando..." : "Testar Conexão"}
          </button>
          {testResult && (
            <div className={`mt-3 flex items-start gap-2 px-3 py-2 rounded-xl text-xs ${testResult.success ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {testResult.success ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Card: Relatório de Eventos */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="text-[#0A2540] font-bold flex items-center gap-2 text-base">
            <BarChart2 className="w-4 h-4 text-[#004A9D]" />
            Eventos por Landing Page
          </h5>
          <button
            onClick={() => eventStatsQuery.refetch()}
            className="text-xs text-[#5A667A] hover:text-[#004A9D] flex items-center gap-1"
          >
            {eventStatsQuery.isFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Atualizar
          </button>
        </div>

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Visualizações", value: totalViews, icon: "👁️", color: "#004A9D" },
            { label: "Iniciaram", value: totalInitiate, icon: "📱", color: "#7C3AED" },
            { label: "Leads", value: totalLeads, icon: "✅", color: "#059669" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-[#F8FAFC] rounded-xl p-3 text-center">
              <div className="text-lg mb-1">{icon}</div>
              <div className="text-xl font-bold" style={{ color }}>{value}</div>
              <div className="text-[10px] text-[#5A667A] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabela por LP */}
        {stats && Object.keys(stats).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="text-left py-2 px-2 text-[#5A667A] font-semibold">Landing Page</th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">👁️ Views</th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">📱 Iniciou</th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">✅ Leads</th>
                  <th className="text-center py-2 px-2 text-[#5A667A] font-semibold">Conv.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats).map(([slug, s]) => {
                  const leads = s.leadFromDb ?? s.lead ?? 0;
                  const conv = s.viewContent > 0 ? ((leads / s.viewContent) * 100).toFixed(1) : "—";
                  return (
                    <tr key={slug} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                      <td className="py-2 px-2 text-[#0A2540] font-medium max-w-[140px] truncate">{s.title || slug}</td>
                      <td className="py-2 px-2 text-center text-[#004A9D] font-bold">{s.viewContent || 0}</td>
                      <td className="py-2 px-2 text-center text-purple-600 font-bold">{s.initiateCheckout || 0}</td>
                      <td className="py-2 px-2 text-center text-emerald-600 font-bold">{leads}</td>
                      <td className="py-2 px-2 text-center text-[#5A667A]">{conv}{conv !== "—" ? "%" : ""}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-6 text-[#5A667A] text-xs">
            {eventStatsQuery.isLoading ? "Carregando..." : "Nenhuma landing page ativa com eventos registrados ainda."}
          </div>
        )}
      </div>

      {/* Eventos rastreados */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
        <h5 className="text-[#0A2540] font-bold mb-3 flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-amber-500" />
          Eventos Disparados Automaticamente
        </h5>
        <div className="grid grid-cols-1 gap-2">
          {[
            { event: "ViewContent", desc: "Quando o lead abre a landing page", icon: "👁️", capi: true },
            { event: "InitiateCheckout", desc: "Quando informa nome e WhatsApp", icon: "📱", capi: false },
            { event: "Lead", desc: "Quando o lead é distribuído para o vendedor", icon: "✅", capi: true },
            { event: "CompleteRegistration", desc: "Quando o cadastro é finalizado", icon: "🎉", capi: true },
          ].map(({ event, desc, icon, capi }) => (
            <div key={event} className="flex items-center gap-3 p-2.5 bg-[#F8FAFC] rounded-xl">
              <span className="text-base">{icon}</span>
              <div className="flex-1">
                <p className="text-xs font-bold text-[#0A2540] font-mono">{event}</p>
                <p className="text-[10px] text-[#5A667A]">{desc}</p>
              </div>
              <div className="flex gap-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">Pixel</span>
                {capi && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">CAPI</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Painel principal ─────────────────────────────────────────────────────────

export default function FranchiseeDashboard() {
  const [locationPath, navigate] = useLocation();
  const { user, isFranchisee, isOwner, loading: authLoading } = useHomenzAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  // Sincronizar aba com a rota atual
  const routeToTab: Record<string, "leads" | "sellers" | "funnel" | "landing" | "calendar" | "pixel" | "settings"> = {
    "/franqueado": "sellers",
    "/franqueado/vendedores": "sellers",
    "/franqueado/leads": "leads",
    "/franqueado/agendamentos": "calendar",
    "/franqueado/analytics": "funnel",
    "/franqueado/configuracoes": "settings",
    "/franqueado/landing-pages": "landing",
    "/franqueado/pixel": "pixel",
  };
  // Aba ativa derivada da rota — reativa a mudanças de URL pelo menu lateral
  const activeTabFromRoute = useMemo(
    () => routeToTab[locationPath as string] ?? "sellers",
    [locationPath]
  );
  // activeTab derivado 100% da rota — menu lateral e tabs inline sincronizados
  const activeTab = activeTabFromRoute;
  const setActiveTab = (tab: "leads" | "sellers" | "funnel" | "landing" | "calendar" | "pixel" | "settings") => {
    const tabToRoute: Record<string, string> = {
      sellers: "/franqueado/vendedores",
      leads: "/franqueado/leads",
      calendar: "/franqueado/agendamentos",
      funnel: "/franqueado/analytics",
      landing: "/franqueado/landing-pages",
      pixel: "/franqueado/pixel",
      settings: "/franqueado/configuracoes",
    };
    navigate(tabToRoute[tab] ?? "/franqueado");
  };

  const statsQuery = { data: null, isLoading: false, refetch: () => {} };

  // MUST be declared before any conditional returns to comply with React hooks rules
  const [trialBannerDismissed, setTrialBannerDismissed] = useState(false);
  // Detectar redirecionamento pós-pagamento Stripe
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(() => searchParams.get("pagamento") === "sucesso");

  const createInviteMutation = { mutate: async () => {}, isPending: false };
      navigator.clipboard.writeText(data.inviteUrl).catch(() => {});
      toast.success("Link de convite gerado! Copie e envie ao vendedor.");

  // Auth guard is handled by ProtectedRoute in App.tsx — no navigate() in render
  if (!authLoading && (!user || user.role === "seller")) {
    return null;
  }

  if (authLoading || statsQuery.isLoading) {
    return (
      <HomenzLayout title="Dashboard Franqueado">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-[#00C1B8] animate-spin" />
        </div>
      </HomenzLayout>
    );
  }

  const data = statsQuery.data;
  if (!data) {
    return (
      <HomenzLayout title="Dashboard Franqueado">
        <div className="flex items-center justify-center h-64 flex-col gap-3">
          <p className="text-[#5A667A]">Nenhum dado disponível</p>
          <p className="text-[#C0CADB] text-sm">Execute a migração SQL no Supabase</p>
        </div>
      </HomenzLayout>
    );
  }

  const { franchise, leads, sellers, stats, funnel, trial } = data;

  // Bloquear acesso se trial expirou e não tem plano pago
  // hasPaidPlan = true libera o painel mesmo com trial expirado (assinante pago via Stripe)
  // trial.active = false + daysLeft = 0 + hasPaidPlan = false = bloqueado
  const trialExpired = trial && !trial.active && trial.endsAt !== null && (trial.daysLeft ?? 0) <= 0 && !trial.hasPaidPlan;
  if (trialExpired) {
    return <TrialExpiredGate />;
  }

  return (
    <HomenzLayout title={franchise?.name ?? "Dashboard Franqueado"}>

      {/* Modal de Sucesso Pós-Pagamento */}
      {showPaymentSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center relative animate-in fade-in zoom-in-95 duration-300">
            {/* Fechar */}
            <button
              onClick={() => {
                setShowPaymentSuccess(false);
                // Limpar o parâmetro da URL sem recarregar
                window.history.replaceState({}, "", window.location.pathname);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Ícone animado */}
            <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-[#004A9D] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            {/* Título */}
            <h2 className="text-2xl font-black text-[#0A2540] mb-2">
              Bem-vindo ao plano {((franchise?.plan ?? "Pro") as string).toUpperCase()}!
            </h2>
            <p className="text-[#5A667A] text-sm mb-6">
              Seu pagamento foi confirmado. O painel está totalmente liberado.
            </p>

            {/* Benefícios do plano */}
            <div className="bg-gradient-to-br from-blue-50 to-teal-50 rounded-2xl p-5 mb-6 text-left space-y-3">
              <p className="text-xs font-bold text-[#004A9D] uppercase tracking-wide mb-2">O que você desbloqueou</p>
              {[
                { icon: "🎯", text: "Funil de diagnóstico capilar com IA" },
                { icon: "📊", text: "Painel de leads em tempo real" },
                { icon: "👥", text: "Gestão completa de vendedores" },
                { icon: "📱", text: "Landing pages ilimitadas de captação" },
                { icon: "🔔", text: "Alertas de temperatura de lead" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm text-[#0A2540] font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => {
                setShowPaymentSuccess(false);
                window.history.replaceState({}, "", window.location.pathname);
              }}
              className="w-full bg-gradient-to-r from-[#004A9D] to-teal-500 text-white font-bold py-3 rounded-xl hover:opacity-90 transition-opacity"
            >
              Começar agora
            </button>
          </div>
        </div>
      )}

      <div className="p-6 space-y-8 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-[#0A2540]">{franchise?.name ?? "Minha Franquia"}</h2>
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <p className="text-[#5A667A] text-sm">
                {franchise?.city}, {franchise?.state}
              </p>
              {franchise?.plan && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#004A9D]">
                  Plano {(franchise.plan as string).toUpperCase()}
                </span>
              )}
              <span className="text-[#5A667A] text-sm">
                · {sellers.length}/{(() => { const p = franchise?.plan as string | undefined; return p === 'pro' ? 10 : p === 'enterprise' || p === 'network' ? '∞' : 2; })()} vendedores
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-teal-50 text-[#00C1B8] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00C1B8]/30 transition-colors border border-[#14b8a6]/30"
          >
            <UserPlus className="w-4 h-4" />
            Convidar Vendedor
          </button>
        </div>

        {/* Banner de Trial */}
        {trial?.active && trial.daysLeft !== null && !trialBannerDismissed && (
          <div className={`relative rounded-2xl p-4 flex items-center gap-4 flex-wrap ${
            trial.daysLeft <= 3
              ? "bg-red-50 border border-red-200"
              : trial.daysLeft <= 7
              ? "bg-amber-50 border border-amber-200"
              : "bg-blue-50 border border-blue-200"
          }`}>
            {/* Ícone */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              trial.daysLeft <= 3 ? "bg-red-100" : trial.daysLeft <= 7 ? "bg-amber-100" : "bg-blue-100"
            }`}>
              <Timer className={`w-5 h-5 ${
                trial.daysLeft <= 3 ? "text-red-600" : trial.daysLeft <= 7 ? "text-amber-600" : "text-[#004A9D]"
              }`} />
            </div>
            {/* Texto */}
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm ${
                trial.daysLeft <= 3 ? "text-red-800" : trial.daysLeft <= 7 ? "text-amber-800" : "text-[#0A2540]"
              }`}>
                {trial.daysLeft === 0
                  ? "Seu trial expirou hoje!"
                  : trial.daysLeft === 1
                  ? "\u26a0\ufe0f Falta 1 dia para o trial encerrar"
                  : `${trial.daysLeft} dias restantes no seu per\u00edodo gratuito`}
              </p>
              <p className={`text-xs mt-0.5 ${
                trial.daysLeft <= 3 ? "text-red-600" : trial.daysLeft <= 7 ? "text-amber-600" : "text-[#5A667A]"
              }`}>
                {trial.daysLeft <= 3
                  ? "Assine agora para n\u00e3o perder o acesso ao painel e aos seus leads."
                  : "Aproveite o per\u00edodo gratuito. Assine antes do fim para manter o acesso."}
              </p>
            </div>
            {/* CTA */}
            <a
              href="/planos"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm text-white flex-shrink-0 transition-all ${
                trial.daysLeft <= 3
                  ? "bg-red-600 hover:bg-red-700"
                  : trial.daysLeft <= 7
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-[#004A9D] hover:bg-[#003580]"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Assinar agora
            </a>
            {/* Fechar */}
            <button
              onClick={() => setTrialBannerDismissed(true)}
              className="absolute top-3 right-3 text-[#94A3B8] hover:text-[#5A667A] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total de Leads" value={stats.totalLeads} sub="Este mês" icon={<Target className="w-5 h-5 text-[#0A2540]" />} color="bg-blue-500/20" />
          <StatCard label="Agendamentos" value={stats.scheduledLeads} sub={`${stats.conversionRate}% conversão`} icon={<Calendar className="w-5 h-5 text-[#0A2540]" />} color="bg-emerald-500/20" />
          <StatCard label="Score Médio" value={stats.avgScore} sub="0–100 pts" icon={<Award className="w-5 h-5 text-[#0A2540]" />} color="bg-amber-500/20" />
          <StatCard label="Leads Quentes" value={stats.hotLeads} sub={`${stats.warmLeads} mornos, ${stats.coldLeads} frios`} icon={<Flame className="w-5 h-5 text-[#0A2540]" />} color="bg-orange-500/20" />
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 mb-6 bg-white p-1 rounded-xl flex-wrap">
            {(["sellers", "leads", "calendar", "funnel", "landing", "pixel", "settings"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab ? "bg-[#EBF4FF] text-[#004A9D]" : "text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8]"
                }`}
              >
                {tab === "leads" ? "Leads" : tab === "sellers" ? "Time" : tab === "calendar" ? "📅 Agenda" : tab === "funnel" ? "Funil" : tab === "landing" ? "🔗 Landing" : tab === "pixel" ? "📊 Pixel" : "⚙️ Config"}
              </button>
            ))}
          </div>

          {/* Tab: Time Comercial */}
          {activeTab === "sellers" && (
            <div>
              <TeamHealthPanel sellers={sellers as Seller[]} />
              <div className="space-y-3">
                {sellers.length === 0 ? (
                  <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
                    <Users className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
                    <p className="text-[#5A667A] mb-3">Nenhum vendedor cadastrado</p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 bg-teal-50 text-[#00C1B8] text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#00C1B8]/30 transition-colors border border-[#14b8a6]/30 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Convidar primeiro vendedor
                    </button>
                  </div>
                ) : (
                  sellers.map((seller, i) => (
                    <SellerCard key={seller.id} seller={seller as Seller} rank={i + 1} />
                  ))
                )}
              </div>

              {/* Legenda de métricas */}
              {sellers.length > 0 && (
                <div className="mt-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
                  <p className="text-[#A0AABB] text-xs font-semibold uppercase tracking-wider mb-3">Como interpretar as métricas</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[#5A667A]">
                    <div className="flex items-start gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#00C1B8] flex-shrink-0 mt-0.5" />
                      <span><strong className="text-[#5A667A]">1ª Resposta:</strong> ideal abaixo de 10min. Acima de 30min o lead esfria significativamente.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="text-[#5A667A]">Follow-up:</strong> recontato após 24h sem resposta. Acima de 80% é excelente.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                      <span><strong className="text-[#5A667A]">Conversão:</strong> % de leads que viraram agendamento. Acima de 55% é referência de mercado.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Leads */}
          {activeTab === "leads" && (
            <div className="space-y-2">
              {leads.length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-8 text-center">
                  <Target className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
                  <p className="text-[#5A667A]">Nenhum lead ainda</p>
                </div>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 hover:bg-white/8 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14b8a6]/30 to-[#3b82f6]/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#004A9D] text-sm font-bold">
                          {lead.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="text-[#0A2540] font-semibold text-sm">{lead.name}</p>
                          <ScoreBadge score={lead.lead_score} />
                          <TemperatureIcon temp={lead.temperature} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#5A667A] flex-wrap">
                          <span>{lead.phone}</span>
                          {lead.age && <span>· {lead.age} anos</span>}
                          {lead.hair_problem && <span>· {lead.hair_problem}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-[#A0AABB] bg-white px-2 py-1 rounded-lg capitalize">
                          {lead.funnel_step?.replace(/_/g, " ")}
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#C0CADB]" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab: Agenda */}
          {activeTab === "calendar" && (
            <CalendarTab />
          )}
          {/* Tab: Landing Pages */}
          {activeTab === "landing" && (
            <LandingPagesTab />
          )}

          {/* Tab: Funil */}
          {activeTab === "funnel" && (
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6">
              <h4 className="text-[#0A2540] font-bold mb-6">Funil de Conversão</h4>
              <div className="space-y-3">
                {funnel.map((step, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[#374151] text-sm font-medium">{step.step}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#0A2540] font-bold text-sm">{step.count}</span>
                        <span className="text-[#5A667A] text-xs">({step.pct}%)</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${step.pct}%`,
                          background: `hsl(${200 - i * 20}, 80%, 60%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Meta Pixel */}
          {activeTab === "pixel" && franchise?.id && (
            <PixelTab franchiseId={franchise.id} />
          )}

          {/* Tab: Configurações */}
          {activeTab === "settings" && (
            <FranchiseeSettingsTab />
          )}
        </div>

        {/* Modal de convite */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-[#0A2540] mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>Convidar Vendedor</h3>
              <p className="text-[#5A667A] text-sm mb-6">
                Gere um link de convite para adicionar um vendedor à sua equipe
              </p>

              {generatedInviteUrl ? (
                /* Exibir link gerado */
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <p className="text-emerald-700 font-semibold text-sm">Link gerado com sucesso!</p>
                    </div>
                    <p className="text-[#5A667A] text-xs mb-3">Copie e envie este link ao vendedor. Válido por 7 dias.</p>
                    <div className="bg-white border border-[#E2E8F0] rounded-xl px-3 py-2.5 flex items-center gap-2">
                      <span className="text-[#0A2540] text-xs font-mono flex-1 break-all">{generatedInviteUrl}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedInviteUrl);
                          toast.success("Copiado!");
                        }}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-[#00C1B8]/10 hover:bg-[#00C1B8]/20 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#00C1B8]" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowInviteModal(false); setInviteEmail(""); setGeneratedInviteUrl(null); }}
                    className="w-full py-3 rounded-xl bg-[#00C1B8] text-white font-bold text-sm hover:bg-[#009E96] transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              ) : (
                /* Formulário de geração */
                <>
                  <div className="mb-4">
                    <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                      Email do vendedor (opcional)
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="vendedor@email.com"
                      className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowInviteModal(false); setInviteEmail(""); setGeneratedInviteUrl(null); }}
                      className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => createInviteMutation.mutate({ email: inviteEmail || undefined, expiresInDays: 7 })}
                      disabled={createInviteMutation.isPending}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      {createInviteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                      Gerar Link
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </HomenzLayout>
  );
}
