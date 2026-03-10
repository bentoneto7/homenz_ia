import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useHomenzAuth } from "@/hooks/useHomenzAuth";
import {
  LayoutDashboard, Users, TrendingUp, Calendar, Settings,
  LogOut, Menu, X, Bell, ChevronRight, Sparkles,
  Building2, BarChart3, Target, Award, Link2,
} from "lucide-react";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  owner: [
    { label: "Visão Geral", href: "/rede", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Franquias", href: "/rede/franquias", icon: <Building2 className="w-4 h-4" /> },
    { label: "Vendedores", href: "/rede/vendedores", icon: <Users className="w-4 h-4" /> },
    { label: "Analytics", href: "/rede/analytics", icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Configurações", href: "/rede/configuracoes", icon: <Settings className="w-4 h-4" /> },
  ],
  franchisee: [
    { label: "Dashboard", href: "/franqueado", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Leads", href: "/franqueado/leads", icon: <Target className="w-4 h-4" /> },
    { label: "Vendedores", href: "/franqueado/vendedores", icon: <Users className="w-4 h-4" /> },
    { label: "Agendamentos", href: "/franqueado/agendamentos", icon: <Calendar className="w-4 h-4" /> },
    { label: "Analytics", href: "/franqueado/analytics", icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Landing Pages", href: "/franqueado/landing-pages", icon: <Link2 className="w-4 h-4" /> },
    { label: "Configurações", href: "/franqueado/configuracoes", icon: <Settings className="w-4 h-4" /> },
  ],
  seller: [
    { label: "Meus Leads", href: "/vendedor", icon: <Target className="w-4 h-4" /> },
    { label: "Agendamentos", href: "/vendedor/agendamentos", icon: <Calendar className="w-4 h-4" /> },
    { label: "Desempenho", href: "/vendedor/desempenho", icon: <Award className="w-4 h-4" /> },
  ],
};

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  owner: { label: "Dono da Rede", color: "text-violet-400", bg: "bg-violet-500/20" },
  franchisee: { label: "Franqueado", color: "text-blue-400", bg: "bg-blue-500/20" },
  seller: { label: "Vendedor", color: "text-teal-400", bg: "bg-teal-500/20" },
};

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
    <div className="flex flex-col h-full bg-[#0a1120] border-r border-white/5">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-black text-lg">Homenz IA</span>
          </div>
        </Link>
      </div>

      {/* User info */}
      {user && (
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#3b82f6] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {user.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user.name}</p>
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
          const rootPaths = ["/rede", "/franqueado", "/vendedor"];
          const isActive = location === item.href ||
            (!rootPaths.includes(item.href) && location.startsWith(item.href));

          return (
            <Link key={item.href} href={item.href} onClick={onClose}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all select-none ${
                  isActive
                    ? "bg-gradient-to-r from-[#14b8a6]/20 to-[#3b82f6]/20 text-white border border-[#14b8a6]/20"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className={isActive ? "text-[#14b8a6]" : ""}>{item.icon}</span>
                <span className="text-sm font-medium flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 text-[#14b8a6]" />}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all group"
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

  const navItems = user ? (NAV_BY_ROLE[user.role] ?? []) : [];
  const roleInfo = user ? ROLE_LABELS[user.role] : null;

  const [loggingOut, setLoggingOut] = useState(false);

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
    <div className="min-h-screen bg-[#070d1a] flex">
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
        <header className="h-14 border-b border-white/5 bg-[#0a1120]/80 backdrop-blur-sm flex items-center px-4 gap-4 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-white/50 hover:text-white transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {title && (
            <h1 className="text-white font-bold text-base flex-1 truncate">{title}</h1>
          )}

          <div className="ml-auto flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <Bell className="w-4 h-4" />
            </button>
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
