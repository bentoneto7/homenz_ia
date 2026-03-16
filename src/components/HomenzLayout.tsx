import { useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, Users, TrendingUp, Calendar, Settings,
  LogOut, Menu, Bell, ChevronRight,
  Building2, BarChart3, Target, Award, Link2, BarChart2,
} from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  owner: [
    { label: "Visão Geral", href: "/homenzadm", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Franquias", href: "/homenzadm/franquias", icon: <Building2 className="w-4 h-4" /> },
    { label: "Vendedores", href: "/homenzadm/vendedores", icon: <Users className="w-4 h-4" /> },
    { label: "Analytics", href: "/homenzadm/analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Configurações", href: "/homenzadm/configuracoes", icon: <Settings className="w-4 h-4" /> },
  ],
  franchisee: [
    { label: "Dashboard", href: "/franqueado", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Leads", href: "/franqueado/leads", icon: <Target className="w-4 h-4" /> },
    { label: "Vendedores", href: "/franqueado/vendedores", icon: <Users className="w-4 h-4" /> },
    { label: "Agendamentos", href: "/franqueado/agendamentos", icon: <Calendar className="w-4 h-4" /> },
    { label: "Analytics", href: "/franqueado/analytics", icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Landing Pages", href: "/franqueado/landing-pages", icon: <Link2 className="w-4 h-4" /> },
    { label: "Meta Pixel", href: "/franqueado/pixel", icon: <BarChart2 className="w-4 h-4" /> },
    { label: "Configurações", href: "/franqueado/configuracoes", icon: <Settings className="w-4 h-4" /> },
  ],
  seller: [
    { label: "Meus Leads", href: "/vendedor", icon: <Target className="w-4 h-4" /> },
    { label: "Agendamentos", href: "/vendedor/agendamentos", icon: <Calendar className="w-4 h-4" /> },
    { label: "Desempenho", href: "/vendedor/desempenho", icon: <Award className="w-4 h-4" /> },
  ],
};

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  owner: { label: "Dono da Rede", color: "text-violet-700", bg: "bg-violet-50" },
  franchisee: { label: "Franqueado", color: "text-[#004A9D]", bg: "bg-blue-50" },
  seller: { label: "Vendedor", color: "text-[#007A75]", bg: "bg-teal-50" },
};

// Root paths that require exact match (not startsWith)
const ROOT_PATHS = ["/homenzadm", "/franqueado", "/vendedor"];

// localStorage key para salvar o timestamp do último acesso do vendedor
const LAST_SEEN_KEY = "homenz_seller_last_seen";

interface SidebarContentProps {
  navItems: NavItem[];
  location: string;
  user: { name: string; role: string } | null;
  roleInfo: { label: string; color: string; bg: string } | null;
  onClose?: () => void;
  onLogout: () => void;
}

// Sidebar definido FORA do HomenzLayout para evitar recriação a cada render
function SidebarContent({ navItems, location, user, roleInfo, onClose, onLogout }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full bg-white border-r border-[#E2E8F0]">
      {/* Logo */}
      <div className="p-5 border-b border-[#E2E8F0]">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[#004A9D] flex items-center justify-center">
              <span className="text-white font-black text-sm">H</span>
            </div>
            <div>
              <span className="text-[#004A9D] font-black text-lg leading-none">HOMENZ</span>
              <span className="block text-[#00C1B8] text-[10px] font-semibold tracking-widest uppercase leading-none">Plataforma</span>
            </div>
          </div>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="p-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#004A9D] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[#0A2540] font-semibold text-sm truncate">{user.name}</p>
              {roleInfo && (
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${roleInfo.bg} ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          // Verificar se é a rota ativa: exata para raiz, startsWith para sub-rotas
          const isActive = location === item.href ||
            (!ROOT_PATHS.includes(item.href) && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none ${
                  isActive
                    ? "bg-[#EBF4FF] text-[#004A9D]"
                    : "text-[#5A667A] hover:text-[#0A2540] hover:bg-[#F0F4F8]"
                }`}
              >
                <span className={isActive ? "text-[#004A9D]" : "text-[#5A667A]"}>{item.icon}</span>
                <span className={`text-sm flex-1 ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-[#004A9D]" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#5A667A] hover:text-red-500 hover:bg-red-50 transition-all group"
        >
          <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          <span className="text-sm font-medium">Sair da conta</span>
        </button>
      </div>
    </div>
  );
}

interface HomenzLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function HomenzLayout({ children, title }: HomenzLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useHomenzAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const navItems = user ? (NAV_BY_ROLE[user.role] ?? []) : [];
  const roleInfo = user ? ROLE_LABELS[user.role] : null;
  const isSeller = user?.role === "seller";

  const [loggingOut, setLoggingOut] = useState(false);

  // ── Notificação de leads novos para vendedores ─────────────────────────────
  // Armazenar o timestamp do último acesso em localStorage
  const [lastSeenAt] = useState<string>(() => {
    if (typeof window === "undefined") return new Date(Date.now() - 5 * 60 * 1000).toISOString();
    return localStorage.getItem(LAST_SEEN_KEY) ?? new Date(Date.now() - 5 * 60 * 1000).toISOString();
  });

  // Guardar os IDs de leads já notificados para não repetir toast
  const notifiedIds = useRef<Set<string>>(new Set());

  // Polling a cada 30s para buscar leads novos (somente para vendedores)
  const newLeadsQuery = trpc.homenz.getNewLeadsCount.useQuery(
    { lastSeenAt },
    {
      enabled: isSeller,
      refetchInterval: 30000,
    }
  );

  // Disparar toast quando chegar lead novo
  useEffect(() => {
    if (!isSeller || !newLeadsQuery.data) return;
    const { newLeads } = newLeadsQuery.data;
    newLeads.forEach((lead) => {
      if (!notifiedIds.current.has(lead.id)) {
        notifiedIds.current.add(lead.id);
        const heatEmoji = lead.temperature === "hot" ? "🔥" : lead.temperature === "warm" ? "🌡" : "🧊";
        toast(`${heatEmoji} Novo lead atribuído!`, {
          description: `${lead.name} — Score ${lead.lead_score ?? "—"}`,
          duration: 8000,
          action: {
            label: "Ver leads",
            onClick: () => { window.location.href = "/vendedor"; },
          },
        });
      }
    });
  }, [newLeadsQuery.data, isSeller]);

  // Ao clicar no sino: marcar como visto (atualizar lastSeenAt no localStorage)
  const handleBellClick = useCallback(() => {
    setNotifOpen((v) => !v);
    if (isSeller) {
      const now = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, now);
      // Forçar refetch após marcar como visto
      newLeadsQuery.refetch();
    }
  }, [isSeller, newLeadsQuery]);

  const newLeadsCount = isSeller ? (newLeadsQuery.data?.count ?? 0) : 0;
  const newLeadsList = isSeller ? (newLeadsQuery.data?.newLeads ?? []) : [];

  const handleLogout = useCallback(() => {
    if (loggingOut) return;
    setLoggingOut(true);
    logout();
    toast.success("Sessão encerrada", {
      description: "Até logo!",
      duration: 2000,
    });
    setTimeout(() => { window.location.href = "/login"; }, 600);
  }, [logout, loggingOut]);

  const sidebarProps: SidebarContentProps = {
    navItems,
    location,
    user,
    roleInfo,
    onLogout: handleLogout,
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex">
      {/* Sidebar desktop — sempre visível em lg+ */}
      <div className="hidden lg:flex w-60 flex-shrink-0 flex-col sticky top-0 h-screen">
        <SidebarContent {...sidebarProps} />
      </div>

      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-60 flex-shrink-0 h-full">
            <SidebarContent {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          </div>
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-[#E2E8F0] bg-white flex items-center px-4 gap-4 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#5A667A] hover:text-[#0A2540] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {title && (
            <h1 className="text-[#0A2540] font-bold text-base flex-1 truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>{title}</h1>
          )}

          <div className="ml-auto flex items-center gap-2 relative">
            {/* Botão de sino com badge */}
            <button
              onClick={handleBellClick}
              className="relative w-8 h-8 rounded-lg bg-[#F0F4F8] flex items-center justify-center text-[#5A667A] hover:text-[#004A9D] hover:bg-[#EBF4FF] transition-all"
              title={newLeadsCount > 0 ? `${newLeadsCount} lead(s) novo(s)` : "Notificações"}
            >
              <Bell className="w-4 h-4" />
              {newLeadsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {newLeadsCount > 9 ? "9+" : newLeadsCount}
                </span>
              )}
            </button>

            {/* Dropdown de notificações */}
            {notifOpen && isSeller && (
              <div className="absolute top-10 right-0 w-80 bg-white rounded-xl shadow-xl border border-[#E2E8F0] z-50 overflow-hidden">
                <div className="p-3 border-b border-[#E2E8F0] flex items-center justify-between">
                  <span className="text-[#0A2540] font-semibold text-sm">Leads novos</span>
                  {newLeadsCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                      {newLeadsCount} novo{newLeadsCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {newLeadsList.length === 0 ? (
                  <div className="p-4 text-center text-[#5A667A] text-sm">
                    Nenhum lead novo desde o último acesso
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#F0F4F8]">
                    {newLeadsList.map((lead) => {
                      const heatEmoji = lead.temperature === "hot" ? "🔥" : lead.temperature === "warm" ? "🌡" : "🧊";
                      const timeAgo = Math.round((Date.now() - new Date(lead.created_at).getTime()) / 60000);
                      return (
                        <div key={lead.id} className="p-3 hover:bg-[#F8FAFC] transition-colors">
                          <div className="flex items-start gap-2">
                            <span className="text-lg leading-none mt-0.5">{heatEmoji}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#0A2540] font-semibold text-sm truncate">{lead.name}</p>
                              <p className="text-[#5A667A] text-xs">{lead.phone}</p>
                              <p className="text-[#C0CADB] text-xs mt-0.5">
                                {timeAgo < 1 ? "agora mesmo" : `há ${timeAgo} min`}
                                {lead.lead_score ? ` · Score ${lead.lead_score}` : ""}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="p-2 border-t border-[#E2E8F0]">
                  <a
                    href="/vendedor"
                    className="block text-center text-[#004A9D] text-xs font-semibold py-1.5 hover:bg-[#EBF4FF] rounded-lg transition-colors"
                    onClick={() => setNotifOpen(false)}
                  >
                    Ver todos os leads →
                  </a>
                </div>
              </div>
            )}

            {/* Fechar dropdown ao clicar fora */}
            {notifOpen && (
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
