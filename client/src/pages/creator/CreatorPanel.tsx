import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  Crown, Shield, Building2, UserCheck, Copy, Check, Plus,
  Trash2, Eye, EyeOff, Users, Link2, ChevronRight, GripVertical,
  LogIn, Sparkles, RefreshCw, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type AccessRole = "admin" | "franchisee" | "seller";

const ROLE_CONFIG: Record<AccessRole, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  description: string;
  capabilities: string[];
}> = {
  admin: {
    label: "Administrador",
    icon: <Shield className="w-5 h-5" />,
    color: "text-violet-600",
    bg: "bg-violet-50",
    border: "border-violet-200",
    description: "Vê todas as franquias, leads e métricas da rede. Pode gerenciar configurações globais.",
    capabilities: [
      "Ver todas as franquias da rede",
      "Acessar métricas globais",
      "Gerenciar configurações do sistema",
      "Ver ranking completo da rede",
      "Exportar dados",
    ],
  },
  franchisee: {
    label: "Franqueado",
    icon: <Building2 className="w-5 h-5" />,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    description: "Vê apenas sua unidade: leads, vendedores, agendamentos e métricas da franquia.",
    capabilities: [
      "Ver leads da sua unidade",
      "Convidar e gerenciar vendedores",
      "Ver ranking de vendedores",
      "Acompanhar agendamentos",
      "Ver score de qualidade do tráfego",
    ],
  },
  seller: {
    label: "Vendedor",
    icon: <UserCheck className="w-5 h-5" />,
    color: "text-teal-600",
    bg: "bg-teal-50",
    border: "border-teal-200",
    description: "Vê apenas os leads atribuídos a ele. Registra interações e avança a timeline do lead.",
    capabilities: [
      "Ver leads atribuídos a ele",
      "Registrar interações (WhatsApp, ligação)",
      "Agendar e confirmar consultas",
      "Ver própria performance",
      "Acessar timeline do lead",
    ],
  },
};

const ROLE_ROUTES: Record<AccessRole, string> = {
  admin: "/rede",
  franchisee: "/franqueado",
  seller: "/vendedor",
};

// ── Componente de Card de Nível (Drag-and-Drop) ───────────────────────────────

function RoleDemoCard({
  role,
  index,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  role: AccessRole;
  index: number;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, role: AccessRole) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, role: AccessRole) => void;
}) {
  const [, navigate] = useLocation();
  const config = ROLE_CONFIG[role];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, role)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, role)}
      className={`
        relative rounded-2xl border-2 p-6 cursor-grab active:cursor-grabbing transition-all duration-200
        ${config.bg} ${config.border}
        ${isDragging ? "opacity-40 scale-95" : "hover:shadow-lg hover:-translate-y-1"}
      `}
    >
      {/* Número de ordem */}
      <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
        {index + 1}
      </div>

      {/* Handle de drag */}
      <div className="absolute top-4 right-4 text-gray-300">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Header */}
      <div className={`flex items-center gap-3 mb-4 ${config.color}`}>
        {config.icon}
        <span className="font-bold text-lg">{config.label}</span>
      </div>

      {/* Descrição */}
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{config.description}</p>

      {/* Capabilities */}
      <ul className="space-y-1.5 mb-5">
        {config.capabilities.map((cap, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
            <ChevronRight className={`w-3 h-3 mt-0.5 flex-shrink-0 ${config.color}`} />
            {cap}
          </li>
        ))}
      </ul>

      {/* Botão de visualizar painel */}
      <Button
        size="sm"
        variant="outline"
        className={`w-full border-current ${config.color} hover:opacity-80`}
        onClick={() => navigate(ROLE_ROUTES[role])}
      >
        <Eye className="w-3.5 h-3.5 mr-2" />
        Ver painel como {config.label}
      </Button>
    </div>
  );
}

// ── Componente de Geração de Convite ──────────────────────────────────────────

function InviteGenerator({ role }: { role: AccessRole }) {
  const config = ROLE_CONFIG[role];
  const [label, setLabel] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresInHours, setExpiresInHours] = useState(72);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const createInvite = trpc.creator.createInvite.useMutation({
    onSuccess: (data) => {
      setGeneratedUrl(data.inviteUrl);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleGenerate = () => {
    createInvite.mutate({
      role,
      label: label || undefined,
      maxUses,
      expiresInHours,
      origin: window.location.origin,
    });
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setOpen(false);
    setGeneratedUrl(null);
    setLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className={`${config.bg} ${config.color} border ${config.border} hover:opacity-80`} variant="outline">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Gerar convite
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            Convite — {config.label}
          </DialogTitle>
        </DialogHeader>

        {!generatedUrl ? (
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm font-medium">Descrição (opcional)</Label>
              <Input
                placeholder={`Ex: ${role === "franchisee" ? "Franqueado Uberaba" : role === "admin" ? "Admin Regional" : "Vendedor João"}`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium">Usos máximos</Label>
                <Input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value))}
                  className="mt-1.5"
                />
                <p className="text-xs text-gray-400 mt-1">-1 = ilimitado</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Expira em (horas)</Label>
                <Input
                  type="number"
                  min={1}
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="mt-1.5"
                />
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={createInvite.isPending}
            >
              {createInvite.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Gerar link de convite
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className={`rounded-xl p-4 ${config.bg} border ${config.border}`}>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Link gerado</p>
              <p className="text-sm font-mono break-all text-gray-800 leading-relaxed">{generatedUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copiado!" : "Copiar link"}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-400 text-center">
              Quem acessar esse link e fizer login receberá o acesso de <strong>{config.label}</strong> automaticamente.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Painel Principal ──────────────────────────────────────────────────────────

export default function CreatorPanel() {
  const { user, loading: isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [roles, setRoles] = useState<AccessRole[]>(["admin", "franchisee", "seller"]);
  const [draggingRole, setDraggingRole] = useState<AccessRole | null>(null);

  const claimOwner = trpc.creator.claimOwner.useMutation({
    onSuccess: () => {
      toast.success("Você agora é o owner do sistema! Recarregue a página.");
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (err) => toast.error(err.message),
  });

  const { data: invites, refetch: refetchInvites } = trpc.creator.listInvites.useQuery(undefined, {
    enabled: user?.role === "owner",
  });

  const { data: allUsers, refetch: refetchUsers } = trpc.creator.listUsers.useQuery(undefined, {
    enabled: user?.role === "owner",
  });

  const revokeInvite = trpc.creator.revokeInvite.useMutation({
    onSuccess: () => { refetchInvites(); toast.success("Convite revogado"); },
  });

  const setUserRole = trpc.creator.setUserRole.useMutation({
    onSuccess: () => { refetchUsers(); toast.success("Role atualizado!"); },
  });

  // Drag-and-drop handlers
  const handleDragStart = (e: React.DragEvent, role: AccessRole) => {
    setDraggingRole(role);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetRole: AccessRole) => {
    e.preventDefault();
    if (!draggingRole || draggingRole === targetRole) return;
    setRoles((prev) => {
      const next = [...prev];
      const fromIdx = next.indexOf(draggingRole);
      const toIdx = next.indexOf(targetRole);
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggingRole);
      return next;
    });
    setDraggingRole(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // Não logado
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Painel do Criador</h1>
          <p className="text-gray-500 text-sm mb-6">Faça login para acessar o painel de controle do sistema.</p>
          <Button className="w-full" onClick={() => navigate("/")}>
            <LogIn className="w-4 h-4 mr-2" /> Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  // Logado mas não é owner — oferecer claim
  if (user.role !== "owner") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Painel do Criador</h1>
          <p className="text-gray-500 text-sm mb-2">
            Você está logado como <strong>{user.name}</strong> com role <Badge variant="outline">{user.role}</Badge>.
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Se você é o criador do sistema, clique abaixo para reivindicar o acesso de owner (só funciona se nenhum owner existir ainda).
          </p>
          <Button
            className="w-full bg-amber-500 hover:bg-amber-600 text-[#0A2540]"
            onClick={() => claimOwner.mutate()}
            disabled={claimOwner.isPending}
          >
            {claimOwner.isPending ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
            Reivindicar acesso de Owner
          </Button>
        </div>
      </div>
    );
  }

  // Owner — painel completo
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
              <Crown className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Painel do Criador</h1>
              <p className="text-xs text-gray-400">Homenz IA — Controle total do sistema</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-700 border-amber-200">
              <Sparkles className="w-3 h-3 mr-1" /> Owner
            </Badge>
            <span className="text-sm text-gray-500">{user.name}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* ── Seção 1: Drag-and-Drop de Níveis ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Níveis de Acesso</h2>
              <p className="text-sm text-gray-500 mt-0.5">Arraste os cards para reordenar. Clique em "Ver painel" para simular cada nível.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((role, index) => (
              <RoleDemoCard
                key={role}
                role={role}
                index={index}
                isDragging={draggingRole === role}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              />
            ))}
          </div>
        </section>

        {/* ── Seção 2: Gerar Convites ── */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Gerar Links de Convite</h2>
              <p className="text-sm text-gray-500 mt-0.5">Envie o link para a pessoa. Ao acessar e fazer login, o nível é concedido automaticamente.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(["admin", "franchisee", "seller"] as AccessRole[]).map((role) => {
              const config = ROLE_CONFIG[role];
              return (
                <div key={role} className={`rounded-xl border-2 p-5 ${config.bg} ${config.border}`}>
                  <div className={`flex items-center gap-2 mb-2 ${config.color}`}>
                    {config.icon}
                    <span className="font-semibold">{config.label}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">{config.description}</p>
                  <InviteGenerator role={role} />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Seção 3: Convites Ativos ── */}
        {invites && invites.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Convites Gerados</h2>
              <Button variant="ghost" size="sm" onClick={() => refetchInvites()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nível</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usos</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Expira</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invites.map((invite) => {
                    const config = ROLE_CONFIG[invite.role as AccessRole];
                    const expired = invite.expiresAt && new Date(invite.expiresAt) < new Date();
                    const exhausted = invite.maxUses !== -1 && invite.useCount >= invite.maxUses;
                    const status = !invite.active ? "revogado" : expired ? "expirado" : exhausted ? "esgotado" : "ativo";
                    return (
                      <tr key={invite.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700 font-medium">{invite.label || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border}`}>
                            {config.icon} {config.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{invite.useCount}/{invite.maxUses === -1 ? "∞" : invite.maxUses}</td>
                        <td className="px-4 py-3">
                          <Badge variant={status === "ativo" ? "default" : "secondary"} className={status === "ativo" ? "bg-green-100 text-green-700" : ""}>
                            {status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString("pt-BR") : "Nunca"}
                        </td>
                        <td className="px-4 py-3">
                          {invite.active && !expired && !exhausted && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => revokeInvite.mutate({ inviteId: invite.id })}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Seção 4: Usuários do Sistema ── */}
        {allUsers && allUsers.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Usuários do Sistema</h2>
                <p className="text-sm text-gray-500 mt-0.5">Gerencie o nível de acesso de cada usuário cadastrado.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => refetchUsers()}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Atualizar
              </Button>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role Atual</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Alterar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allUsers.map((u) => {
                    const isCurrentUser = u.id === user.id;
                    return (
                      <tr key={u.id} className={`hover:bg-gray-50 ${isCurrentUser ? "bg-amber-50" : ""}`}>
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {u.name || "—"}
                          {isCurrentUser && <span className="ml-2 text-xs text-amber-600 font-normal">(você)</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.email || "—"}</td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role as string} />
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-4 py-3">
                          {!isCurrentUser && (
                            <select
                              className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                              value={u.role}
                              onChange={(e) => setUserRole.mutate({ userId: u.id, role: e.target.value as any })}
                            >
                              <option value="user">user</option>
                              <option value="seller">seller</option>
                              <option value="franchisee">franchisee</option>
                              <option value="admin">admin</option>
                              <option value="owner">owner</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </div>
  );
}

// ── Helper: Badge de Role ─────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; className: string }> = {
    owner: { label: "Owner", className: "bg-amber-100 text-amber-700 border-amber-200" },
    admin: { label: "Admin", className: "bg-violet-100 text-violet-700 border-violet-200" },
    franchisee: { label: "Franqueado", className: "bg-blue-100 text-blue-700 border-blue-200" },
    seller: { label: "Vendedor", className: "bg-teal-100 text-teal-700 border-teal-200" },
    user: { label: "Usuário", className: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const cfg = map[role] || map.user;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}
