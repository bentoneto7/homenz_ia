import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Users,
  Copy,
  Plus,
  Loader2,
  AlertTriangle,
  Link2,
  ExternalLink,
  Globe,
  Smartphone,
  Eye,
  MousePointerClick,
  Share2,
  MapPin,
  Settings,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/Modal";

export type LandingPage = {
  id: string;
  slug: string;
  title: string;
  procedure: string;
  active: boolean;
  total_views: number;
  total_leads: number;
  created_at: string;
};

export type EditingLP = {
  id: string;
  title: string;
  procedure: string;
  city: string;
  state: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  customAddress: string;
  customPhone: string;
  heroImageUrl: string;
  customLogoUrl: string;
} | null;

// Tipo para o modal de gerenciamento de vendedores de uma LP
export type ManagingSellersLP = { id: string; title: string } | null;

export function LandingPagesTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [editingLP, setEditingLP] = useState<EditingLP>(null);
  const [managingSellersLP, setManagingSellersLP] =
    useState<ManagingSellersLP>(null);
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
  const [lpPixelEditing, setLpPixelEditing] = useState<Record<string, string>>(
    {}
  );
  const [lpPixelSaving, setLpPixelSaving] = useState<Record<string, boolean>>(
    {}
  );
  const baseUrl = window.location.origin;
  const utils = trpc.useUtils();

  const pagesQuery = trpc.homenz.getLandingPages.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const sellersQuery = trpc.distribution.checkSellers.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const hasSellers = sellersQuery.data?.hasSellers ?? false;
  const sellersCount = sellersQuery.data?.count ?? 0;

  // Buscar lista completa de vendedores para o modal de criação
  const allSellersQuery = trpc.homenz.getSellers.useQuery(undefined, {
    refetchOnWindowFocus: false,
    enabled: showCreate || managingSellersLP !== null,
  });
  const allSellers = allSellersQuery.data ?? [];

  // Buscar vendedores vinculados à LP sendo gerenciada
  const lpSellersQuery = trpc.homenz.getLandingPageSellers.useQuery(
    { landingPageId: managingSellersLP?.id ?? "" },
    {
      enabled: !!managingSellersLP?.id,
      refetchOnWindowFocus: false,
    }
  );

  // Quando abrir o modal de gerenciamento, pré-selecionar os vendedores já vinculados
  useEffect(() => {
    if (lpSellersQuery.data && managingSellersLP) {
      setManagingSellerIds(lpSellersQuery.data.map(s => s.sellerId));
    }
  }, [lpSellersQuery.data, managingSellersLP]);

  const assignSellersMutation =
    trpc.homenz.assignSellersToLandingPage.useMutation({
      onSuccess: () => {
        toast.success("Vendedores atualizados!");
        setManagingSellersLP(null);
        setManagingSellerIds([]);
        utils.homenz.getLandingPageSellers.invalidate();
      },
      onError: err =>
        toast.error(err.message || "Erro ao atualizar vendedores"),
    });

  const createMutation = trpc.homenz.createLandingPageForFranchisee.useMutation(
    {
      onSuccess: () => {
        toast.success("Landing page criada!");
        setShowCreate(false);
        setNewTitle("");
        setSelectedSellerIds([]);
        utils.homenz.getLandingPages.invalidate();
      },
      onError: err => toast.error(err.message || "Erro ao criar landing page"),
    }
  );

  const pages = pagesQuery.data ?? [];

  const toggleMutation = trpc.distribution.toggleLandingPage.useMutation({
    onSuccess: () => {
      utils.homenz.getLandingPages.invalidate();
      toast.success("Status atualizado!");
    },
    onError: err => toast.error(err.message || "Erro ao atualizar status"),
  });

  const updateLPMutation = trpc.homenz.updateLandingPage.useMutation({
    onError: err => toast.error(err.message || "Erro ao atualizar"),
  });
  const brandingMutation = trpc.distribution.updateLandingPageBranding.useMutation({
    onError: err => toast.error(err.message || "Erro ao salvar personalização"),
  });
  const uploadMutation = trpc.photos.uploadPublic.useMutation();
  const [uploadingField, setUploadingField] = useState<null | "heroImageUrl" | "customLogoUrl">(null);

  const handleUploadImage = async (file: File, field: "heroImageUrl" | "customLogoUrl") => {
    setUploadingField(field);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const { url } = await uploadMutation.mutateAsync({ base64 });
      setEditingLP(prev => (prev ? { ...prev, [field]: url } : null));
    } catch {
      toast.error("Falha no upload da imagem");
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingLP) return;
    try {
      await updateLPMutation.mutateAsync({
        id: editingLP.id,
        title: editingLP.title.trim() || undefined,
        procedure: editingLP.procedure || undefined,
        city: editingLP.city.trim() || undefined,
        state: editingLP.state.trim() || undefined,
      });
      await brandingMutation.mutateAsync({
        landingPageId: editingLP.id,
        heroTitle: editingLP.heroTitle.trim() || null,
        heroSubtitle: editingLP.heroSubtitle.trim() || null,
        ctaText: editingLP.ctaText.trim() || null,
        customAddress: editingLP.customAddress.trim() || null,
        customPhone: editingLP.customPhone.trim() || null,
        heroImageUrl: editingLP.heroImageUrl.trim() || null,
        customLogoUrl: editingLP.customLogoUrl.trim() || null,
      });
      toast.success("Página atualizada!");
      setEditingLP(null);
      utils.homenz.getLandingPages.invalidate();
    } catch {
      /* erros já tratados nos onError das mutations */
    }
  };

  const fetchCep = async (cep: string) => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setNewAddress(
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

  const createPage = () => {
    if (!newTitle.trim()) {
      toast.error("Dê um nome para a landing page");
      return;
    }
    if (!hasSellers) {
      toast.error(
        "Cadastre ao menos um vendedor antes de criar uma landing page. Os leads precisam de um destino!"
      );
      return;
    }
    if (selectedSellerIds.length === 0) {
      toast.error(
        "Selecione ao menos um vendedor para receber os leads desta página."
      );
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
      utils.homenz.getLandingPages.invalidate();
      toast.success("Pixel salvo para esta landing page!");
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message || "Erro ao salvar pixel"
      );
    } finally {
      setLpPixelSaving(prev => ({ ...prev, [landingPageId]: false }));
    }
  };

  if (pagesQuery.isLoading)
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 text-[#00C1B8] animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="text-[#0A2540] font-bold text-lg">
            Landing Pages da Franquia
          </h4>
          <p className="text-[#5A667A] text-sm mt-0.5">
            Crie páginas de captação para usar no tráfego pago
          </p>
        </div>
        <button
          onClick={() => {
            if (!hasSellers) {
              toast.error(
                "Cadastre ao menos 1 vendedor na aba Time antes de criar uma landing page."
              );
              return;
            }
            setShowCreate(true);
          }}
          disabled={sellersQuery.isLoading}
          title={
            !hasSellers
              ? "Cadastre um vendedor primeiro"
              : "Criar nova landing page"
          }
          className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl transition-colors border ${
            hasSellers
              ? "bg-teal-50 text-[#00C1B8] hover:bg-[#00C1B8]/30 border-[#14b8a6]/30"
              : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          }`}
        >
          <Plus className="w-4 h-4" />
          Nova Landing Page
          {!hasSellers && !sellersQuery.isLoading && (
            <AlertTriangle className="w-3.5 h-3.5 ml-1" />
          )}
        </button>
      </div>

      {/* Alerta: sem vendedores */}
      {!sellersQuery.isLoading && !hasSellers && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-800 font-semibold text-sm mb-1">
              Nenhum vendedor cadastrado
            </p>
            <p className="text-amber-700 text-sm leading-relaxed">
              Para criar uma landing page, você precisa ter ao menos{" "}
              <strong>1 vendedor ativo</strong>. Os leads captados são
              distribuídos automaticamente entre os vendedores via round-robin.
              Cadastre um vendedor na aba <strong>Time</strong> antes de criar
              uma landing page.
            </p>
          </div>
        </div>
      )}
      {!sellersQuery.isLoading && hasSellers && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <p className="text-emerald-700 text-sm">
            <strong>
              {sellersCount} vendedor{sellersCount !== 1 ? "es" : ""} ativo
              {sellersCount !== 1 ? "s" : ""}
            </strong>{" "}
            — os leads serão distribuídos automaticamente via round-robin.
          </p>
        </div>
      )}

      {/* Como funciona */}
      <div className="bg-blue-500/8 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[#0A2540] font-semibold text-sm mb-1">
              Como funciona
            </p>
            <p className="text-[#5A667A] text-sm leading-relaxed">
              Cada landing page tem uma URL única da sua franquia. O lead
              preenche o chat, envia uma foto da área com queda capilar e é
              distribuído automaticamente entre seus vendedores via round-robin.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-[#5A667A]">
                <Smartphone className="w-3.5 h-3.5" /> Otimizada para mobile
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#5A667A]">
                <Share2 className="w-3.5 h-3.5" /> Funciona com Meta Ads
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#5A667A]">
                <MousePointerClick className="w-3.5 h-3.5" /> Lead vai direto ao
                vendedor
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de landing pages */}
      {pages.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-10 text-center">
          <Link2 className="w-10 h-10 text-[#C0CADB] mx-auto mb-3" />
          <p className="text-[#5A667A] mb-1">
            Nenhuma landing page criada ainda
          </p>
          <p className="text-[#A0AABB] text-sm mb-5">
            Crie sua primeira página e comece a captar leads
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-[#00C1B8] text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-[#009E96] transition-colors"
          >
            Criar primeira landing page
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pages.map(page => (
            <div
              key={page.id}
              className="bg-white border border-[#E2E8F0] rounded-2xl p-5 hover:shadow-md transition-all shadow-sm"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h5 className="text-[#0A2540] font-bold">{page.title}</h5>
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          landingPageId: page.id,
                          active: !page.active,
                        })
                      }
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer transition-all ${
                        page.active
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25"
                          : "bg-white text-[#A0AABB] border border-[#E2E8F0] hover:bg-[#F0F4F8]"
                      }`}
                    >
                      {page.active ? "Ativa" : "Inativa"}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Link2 className="w-3.5 h-3.5 text-[#A0AABB]" />
                    <span className="text-[#5A667A] text-xs font-mono truncate">
                      {baseUrl}/l/{page.slug}
                    </span>
                  </div>
                </div>
                {/* Métricas */}
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="text-[#0A2540] font-black text-sm">
                      {page.total_views ?? 0}
                    </p>
                    <p className="text-[#A0AABB] text-[10px]">visualiz.</p>
                  </div>
                  <div className="text-center">
                    <p className="text-emerald-400 font-black text-sm">
                      {page.total_leads ?? 0}
                    </p>
                    <p className="text-[#A0AABB] text-[10px]">leads</p>
                  </div>
                  <div className="text-center">
                    <p className="text-amber-400 font-black text-sm">
                      {page.total_views
                        ? Math.round(
                            (page.total_leads / page.total_views) * 100
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-[#A0AABB] text-[10px]">conversão</p>
                  </div>
                </div>
              </div>
              {/* Pixel por LP */}
              <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center gap-2 mb-2">
                  <Settings className="w-3.5 h-3.5 text-[#A0AABB]" />
                  <span className="text-xs font-semibold text-[#5A667A]">
                    Meta Pixel desta LP
                  </span>
                  <span className="text-[10px] text-[#A0AABB]">
                    (sobrescreve o pixel da franquia)
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      lpPixelEditing[page.id] ??
                      ((page as Record<string, unknown>).pixel_id as
                        | string
                        | null) ??
                      ""
                    }
                    onChange={e =>
                      setLpPixelEditing(prev => ({
                        ...prev,
                        [page.id]: e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 20),
                      }))
                    }
                    placeholder="ID do Pixel (opcional)"
                    className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[#0A2540] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#004A9D]/30 focus:border-[#004A9D]"
                  />
                  <button
                    onClick={() => saveLpPixel(page.id)}
                    disabled={lpPixelSaving[page.id]}
                    className="px-3 py-1.5 bg-[#004A9D] text-white text-xs font-semibold rounded-lg hover:bg-[#003580] transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {lpPixelSaving[page.id] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
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
                  onClick={() =>
                    setEditingLP({
                      id: page.id,
                      title: page.title,
                      procedure: page.procedure,
                      city:
                        ((page as Record<string, unknown>).city as string) ??
                        "",
                      state:
                        ((page as Record<string, unknown>).state as string) ??
                        "",
                      heroTitle:
                        ((page as Record<string, unknown>).hero_title as string) ?? "",
                      heroSubtitle:
                        ((page as Record<string, unknown>).hero_subtitle as string) ?? "",
                      ctaText:
                        ((page as Record<string, unknown>).cta_text as string) ?? "",
                      customAddress:
                        ((page as Record<string, unknown>).custom_address as string) ?? "",
                      customPhone:
                        ((page as Record<string, unknown>).custom_phone as string) ?? "",
                      heroImageUrl:
                        ((page as Record<string, unknown>).hero_image_url as string) ?? "",
                      customLogoUrl:
                        ((page as Record<string, unknown>).custom_logo_url as string) ?? "",
                    })
                  }
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#004A9D] bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-[#004A9D]/30"
                >
                  <Settings className="w-3.5 h-3.5" /> Editar
                </button>
                <button
                  onClick={() => {
                    setManagingSellersLP({ id: page.id, title: page.title });
                    setManagingSellerIds([]);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#0e7c75] bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors border border-[#00C1B8]/30"
                >
                  <Users className="w-3.5 h-3.5" /> Vendedores
                </button>
                <a
                  href={`/l/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#0A2540] bg-[#00C1B8] hover:bg-[#00a89f] px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Ver minha landing
                  page
                </a>
                <span className="flex items-center gap-1.5 text-xs text-[#A0AABB] ml-auto">
                  <Eye className="w-3.5 h-3.5" /> UTM:
                  utm_source=meta&utm_campaign={page.slug}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar landing page */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setNewTitle("");
          setNewAddress("");
          setNewZipCode("");
          setSelectedSellerIds([]);
        }}
        title="Nova Landing Page"
        description="Configure a página de captação da sua franquia"
        size="lg"
        footer={
          <>
            <button
              onClick={() => {
                setShowCreate(false);
                setNewTitle("");
                setNewAddress("");
                setNewZipCode("");
                setSelectedSellerIds([]);
              }}
              className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium flex items-center justify-center text-center"
            >
              Cancelar
            </button>
            <button
              onClick={createPage}
              disabled={createMutation.isPending}
              className="flex-1 py-3 rounded-xl bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#00a89f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Criar Landing Page
            </button>
          </>
        }
      >
        <div className="space-y-4">
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Nome da página
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ex: Homenz Uberaba — Crescimento Capilar"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                />
              </div>
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Procedimento
                </label>
                <select
                  value={newProcedure}
                  onChange={e => setNewProcedure(e.target.value)}
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] focus:outline-none focus:border-[#00C1B8] transition-all"
                >
                  <option value="crescimento-capilar">
                    Crescimento Capilar
                  </option>
                  <option value="micropigmentacao">
                    Micropigmentação Capilar
                  </option>
                  <option value="diagnostico">
                    Diagnóstico Capilar Gratuito
                  </option>
                </select>
              </div>
              {/* CEP + Endereço */}
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  CEP da clínica
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={newZipCode}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 8);
                      const masked =
                        v.length > 5 ? v.slice(0, 5) + "-" + v.slice(5) : v;
                      setNewZipCode(masked);
                      if (v.length === 8) fetchCep(v);
                    }}
                    placeholder="00000-000"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all pr-10"
                  />
                  {cepLoading && (
                    <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3.5 text-[#00C1B8]" />
                  )}
                  {!cepLoading &&
                    newZipCode.replace(/\D/g, "").length === 8 && (
                      <MapPin className="w-4 h-4 absolute right-3 top-3.5 text-[#00C1B8]" />
                    )}
                </div>
              </div>
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Endereço completo
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={e => setNewAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade/UF"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                />
                <p className="text-[10px] text-[#A0AABB] mt-1">
                  Preenchido automaticamente pelo CEP. Edite se necessitar.
                </p>
              </div>
              {newTitle && (
                <div className="bg-white rounded-xl p-3">
                  <p className="text-[#5A667A] text-xs mb-1">
                    URL que será gerada:
                  </p>
                  <p className="text-[#00C1B8] text-xs font-mono break-all">
                    {baseUrl}/l/
                    {newTitle
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/^-|-$/g, "")}
                  </p>
                </div>
              )}
              {/* Seleção de vendedores */}
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Vendedores que receberão os leads{" "}
                  <span className="text-red-400">*</span>
                </label>
                {allSellersQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00C1B8]" />
                    <span className="text-[#5A667A] text-sm">
                      Carregando vendedores...
                    </span>
                  </div>
                ) : allSellers.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                    Nenhum vendedor ativo encontrado. Cadastre vendedores na aba
                    Time.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allSellers.map(seller => (
                      <label
                        key={seller.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                          selectedSellerIds.includes(seller.id)
                            ? "bg-teal-50 border-[#00C1B8] text-[#0A2540]"
                            : "bg-[#F0F4F8] border-[#E2E8F0] text-[#5A667A] hover:border-[#00C1B8]/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSellerIds.includes(seller.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedSellerIds(prev => [
                                ...prev,
                                seller.id,
                              ]);
                            } else {
                              setSelectedSellerIds(prev =>
                                prev.filter(id => id !== seller.id)
                              );
                            }
                          }}
                          className="w-4 h-4 accent-[#00C1B8] flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{seller.name}</p>
                          <p className="text-xs text-[#A0AABB] truncate">
                            {seller.email}
                          </p>
                        </div>
                        {selectedSellerIds.includes(seller.id) && (
                          <CheckCircle className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                        )}
                      </label>
                    ))}
                    {selectedSellerIds.length > 0 && (
                      <p className="text-xs text-[#00C1B8] font-medium">
                        {selectedSellerIds.length} vendedor
                        {selectedSellerIds.length !== 1 ? "es" : ""} selecionado
                        {selectedSellerIds.length !== 1 ? "s" : ""} —
                        round-robin entre eles
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
      </Modal>

      {/* Modal editar landing page */}
      {editingLP && (
        <Modal
          open
          onClose={() => setEditingLP(null)}
          title="Editar Landing Page"
          description="Atualize os dados e a apresentação da página"
          size="lg"
          footer={
            <>
              <button
                onClick={() => setEditingLP(null)}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium flex items-center justify-center text-center"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={
                  updateLPMutation.isPending || brandingMutation.isPending
                }
                className="flex-1 py-3 rounded-xl bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#00a89f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {updateLPMutation.isPending || brandingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Salvar Alterações
              </button>
            </>
          }
        >
          <div className="space-y-4">
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Título da página
                </label>
                <input
                  type="text"
                  value={editingLP.title}
                  onChange={e =>
                    setEditingLP(prev =>
                      prev ? { ...prev, title: e.target.value } : null
                    )
                  }
                  placeholder="Ex: Homenz Rio Branco — Crescimento Capilar"
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                />
              </div>
              <div>
                <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                  Procedimento
                </label>
                <select
                  value={editingLP.procedure}
                  onChange={e =>
                    setEditingLP(prev =>
                      prev ? { ...prev, procedure: e.target.value } : null
                    )
                  }
                  className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] focus:outline-none focus:border-[#00C1B8] transition-all"
                >
                  <option value="crescimento-capilar">
                    Crescimento Capilar
                  </option>
                  <option value="micropigmentacao">
                    Micropigmentação Capilar
                  </option>
                  <option value="diagnostico">
                    Diagnóstico Capilar Gratuito
                  </option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={editingLP.city}
                    onChange={e =>
                      setEditingLP(prev =>
                        prev ? { ...prev, city: e.target.value } : null
                      )
                    }
                    placeholder="Rio Branco"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all"
                  />
                </div>
                <div>
                  <label className="text-[#5A667A] text-sm font-medium block mb-1.5">
                    Estado (UF)
                  </label>
                  <input
                    type="text"
                    value={editingLP.state}
                    onChange={e =>
                      setEditingLP(prev =>
                        prev
                          ? {
                              ...prev,
                              state: e.target.value.toUpperCase().slice(0, 2),
                            }
                          : null
                      )
                    }
                    placeholder="AC"
                    maxLength={2}
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-3 text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] transition-all uppercase"
                  />
                </div>
              </div>

              {/* ── Personalização da página (white-label) ── */}
              <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
                <p className="text-[#0A2540] font-semibold text-sm">Apresentação da página</p>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Título de destaque</label>
                  <input
                    type="text"
                    value={editingLP.heroTitle}
                    onChange={e => setEditingLP(prev => (prev ? { ...prev, heroTitle: e.target.value } : null))}
                    placeholder="Recupere a confiança no seu cabelo"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8]"
                  />
                </div>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Subtítulo / chamada</label>
                  <textarea
                    value={editingLP.heroSubtitle}
                    onChange={e => setEditingLP(prev => (prev ? { ...prev, heroSubtitle: e.target.value } : null))}
                    placeholder="Faça seu diagnóstico capilar gratuito em 2 minutos."
                    rows={2}
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8] resize-none"
                  />
                </div>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Texto do botão (CTA)</label>
                  <input
                    type="text"
                    value={editingLP.ctaText}
                    onChange={e => setEditingLP(prev => (prev ? { ...prev, ctaText: e.target.value } : null))}
                    placeholder="Começar diagnóstico"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8]"
                  />
                </div>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Imagem de destaque</label>
                  {editingLP.heroImageUrl && (
                    <img src={editingLP.heroImageUrl} alt="" className="w-full h-24 object-cover rounded-lg mb-2 border border-[#E2E8F0]" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingField === "heroImageUrl"}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, "heroImageUrl"); }}
                    className="text-xs text-[#5A667A] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#004A9D]/10 file:text-[#004A9D] file:text-xs file:font-medium"
                  />
                  {uploadingField === "heroImageUrl" && <span className="text-xs text-[#00C1B8] ml-2">Enviando...</span>}
                </div>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Logo da clínica</label>
                  {editingLP.customLogoUrl && (
                    <img src={editingLP.customLogoUrl} alt="" className="h-10 object-contain mb-2" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingField === "customLogoUrl"}
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadImage(f, "customLogoUrl"); }}
                    className="text-xs text-[#5A667A] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#004A9D]/10 file:text-[#004A9D] file:text-xs file:font-medium"
                  />
                  {uploadingField === "customLogoUrl" && <span className="text-xs text-[#00C1B8] ml-2">Enviando...</span>}
                </div>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">Endereço exibido na página</label>
                  <input
                    type="text"
                    value={editingLP.customAddress}
                    onChange={e => setEditingLP(prev => (prev ? { ...prev, customAddress: e.target.value } : null))}
                    placeholder="Rua, número, bairro"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8]"
                  />
                </div>
                <div>
                  <label className="text-[#5A667A] text-xs font-medium block mb-1.5">WhatsApp exibido na página</label>
                  <input
                    type="tel"
                    value={editingLP.customPhone}
                    onChange={e => setEditingLP(prev => (prev ? { ...prev, customPhone: e.target.value } : null))}
                    placeholder="(00) 90000-0000"
                    className="w-full bg-[#F0F4F8] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-sm text-[#0A2540] placeholder-[#A0AABB] focus:outline-none focus:border-[#00C1B8]"
                  />
                </div>
              </div>
            </div>
        </Modal>
      )}

      {/* Modal de gerenciamento de vendedores da LP */}
      {managingSellersLP && (
        <Modal
          open
          onClose={() => {
            setManagingSellersLP(null);
            setManagingSellerIds([]);
          }}
          title="Vendedores da LP"
          description="Selecione quem recebe os leads desta página. A distribuição é round-robin igualitária entre os selecionados."
          footer={
            <>
              <button
                onClick={() => {
                  setManagingSellersLP(null);
                  setManagingSellerIds([]);
                }}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8] transition-all text-sm font-medium flex items-center justify-center text-center"
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
                disabled={
                  assignSellersMutation.isPending ||
                  managingSellerIds.length === 0
                }
                className="flex-1 py-3 rounded-xl bg-[#00C1B8] text-[#0A2540] font-bold text-sm hover:bg-[#00a89f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {assignSellersMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Salvar Vendedores
              </button>
            </>
          }
        >
          <p className="text-[#5A667A] text-sm mb-4">
            Landing:{" "}
            <span className="font-semibold text-[#0A2540]">
              {managingSellersLP.title}
            </span>
          </p>

            {lpSellersQuery.isLoading || allSellersQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[#00C1B8]" />
              </div>
            ) : allSellers.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
                Nenhum vendedor ativo encontrado. Cadastre vendedores na aba
                Time.
              </div>
            ) : (
              <div className="space-y-2 mb-5">
                {allSellers.map(seller => (
                  <label
                    key={seller.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                      managingSellerIds.includes(seller.id)
                        ? "bg-teal-50 border-[#00C1B8] text-[#0A2540]"
                        : "bg-[#F0F4F8] border-[#E2E8F0] text-[#5A667A] hover:border-[#00C1B8]/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={managingSellerIds.includes(seller.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setManagingSellerIds(prev => [...prev, seller.id]);
                        } else {
                          setManagingSellerIds(prev =>
                            prev.filter(id => id !== seller.id)
                          );
                        }
                      }}
                      className="w-4 h-4 accent-[#00C1B8] flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{seller.name}</p>
                      <p className="text-xs text-[#A0AABB] truncate">
                        {seller.email}
                      </p>
                    </div>
                    {managingSellerIds.includes(seller.id) && (
                      <CheckCircle className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                    )}
                  </label>
                ))}
                {managingSellerIds.length > 0 && (
                  <div className="flex items-center gap-2 bg-teal-50 border border-[#00C1B8]/30 rounded-xl px-4 py-2.5">
                    <CheckCircle className="w-4 h-4 text-[#00C1B8] flex-shrink-0" />
                    <p className="text-xs text-[#0e7c75] font-medium">
                      {managingSellerIds.length} vendedor
                      {managingSellerIds.length !== 1 ? "es" : ""} selecionado
                      {managingSellerIds.length !== 1 ? "s" : ""}. Leads em
                      round-robin entre eles.
                    </p>
                  </div>
                )}
              </div>
            )}

        </Modal>
      )}
    </div>
  );
}
