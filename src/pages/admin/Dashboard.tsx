import { useClinicAuth } from "@/hooks/useClinicAuth";
import { useClinic } from "@/hooks/useClinic";
import { useLeads } from "@/hooks/useLeads";
import { useNotifications } from "@/hooks/useNotifications";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useLocation, Link } from "wouter";
import { Users, Calendar, Bell, TrendingUp, ChevronRight, Copy, ExternalLink, Scissors, Settings, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

function StatCard({ title, value, sub, icon, color }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground mt-0.5">{title}</p>
      {sub && <p className="text-xs text-primary mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { isAuthenticated, logout } = useClinicAuth();
  const [, navigate] = useLocation();
  const { clinic } = useClinic();
  const { leads: recentLeads } = useLeads({ clinicId: clinic?.id, limit: 5, enabled: !!clinic });
  const { notifications, unreadCount } = useNotifications({ clinicId: clinic?.id, enabled: !!clinic });
  const [stats, setStats] = useState<{ total: number; scheduled: number; conversionRate: number; avgScore: number } | null>(null);

  useEffect(() => {
    if (!clinic) return;
    async function loadStats() {
      const { data } = await supabase.from("leads").select("funnel_step, lead_score").eq("clinic_id", clinic!.id);
      if (!data) return;
      const total = data.length;
      const scheduled = data.filter(l => ["scheduled","confirmed","completed"].includes(l.funnel_step)).length;
      const conversionRate = total > 0 ? Math.round((scheduled / total) * 100) : 0;
      const scores = data.filter(l => l.lead_score !== null).map(l => l.lead_score as number);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      setStats({ total, scheduled, conversionRate, avgScore });
    }
    loadStats();
  }, [clinic]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 rounded-2xl gradient-gold flex items-center justify-center mx-auto mb-6">
            <Scissors className="w-8 h-8 text-[#0A2540]" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Painel da Clínica</h1>
          <p className="text-muted-foreground mb-6">Faça login para acessar seu painel.</p>
          <Button className="gradient-gold text-white border-0 w-full" onClick={() => navigate("/login-clinica")}>Entrar</Button>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm px-4">
          <h2 className="text-xl font-bold mb-3">Nenhuma clínica encontrada</h2>
          <p className="text-muted-foreground mb-6">Cadastre sua clínica para começar.</p>
          <Button onClick={() => navigate("/cadastro")} className="gradient-gold text-white border-0">
            Cadastrar clínica
          </Button>
        </div>
      </div>
    );
  }

  const funnelLink = `${window.location.origin}/c/${clinic.slug}`;

  const copyLink = () => {
    navigator.clipboard.writeText(funnelLink);
    toast.success("Link copiado!");
  };



  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 bottom-0 w-56 bg-sidebar border-r border-sidebar-border flex flex-col z-20 hidden lg:flex">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-gold flex items-center justify-center">
              <Scissors className="w-4 h-4 text-[#0A2540]" />
            </div>
            <div>
              <p className="text-xs font-bold text-sidebar-foreground">CapilarIA</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate max-w-[120px]">{clinic.name}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { href: "/painel", icon: <TrendingUp className="w-4 h-4" />, label: "Dashboard" },
            { href: "/painel/leads", icon: <Users className="w-4 h-4" />, label: "Leads" },
            { href: "/painel/agendamentos", icon: <Calendar className="w-4 h-4" />, label: "Agendamentos" },
            { href: "/painel/notificacoes", icon: <Bell className="w-4 h-4" />, label: `Notificações${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
            { href: "/painel/configuracoes", icon: <Settings className="w-4 h-4" />, label: "Configurações" },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <a className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm">
                {item.icon}
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-sm w-full"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-56">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 lg:px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold">Dashboard</h1>
              <p className="text-xs text-muted-foreground">{clinic.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyLink} className="hidden sm:flex">
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copiar link
              </Button>
              <a href={funnelLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="gradient-gold text-white border-0">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                  Ver funil
                </Button>
              </a>
            </div>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {/* Funnel link card */}
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
            <p className="text-xs font-medium text-primary mb-1">Seu link de captação (para anúncios):</p>
            <div className="flex items-center gap-2">
              <code className="text-sm flex-1 truncate text-foreground">{funnelLink}</code>
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              title="Total de leads"
              value={stats?.total ?? 0}
              sub={`${clinic?.current_month_leads ?? 0} este mês`}
              icon={<Users className="w-4 h-4 text-[#0A2540]" />}
              color="gradient-gold"
            />
            <StatCard
              title="Agendamentos"
              value={stats?.scheduled ?? 0}
              icon={<Calendar className="w-4 h-4 text-[#0A2540]" />}
              color="bg-blue-500"
            />
            <StatCard
              title="Taxa de conversão"
              value={`${stats?.conversionRate ?? 0}%`}
              sub="Lead → Agendamento"
              icon={<TrendingUp className="w-4 h-4 text-[#0A2540]" />}
              color="bg-emerald-500"
            />
            <StatCard
              title="Score médio"
              value={stats?.avgScore ?? 0}
              sub="Qualificação IA"
              icon={<Bell className="w-4 h-4 text-[#0A2540]" />}
              color="bg-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent leads */}
            <div className="bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-sm">Leads recentes</h2>
                <Link href="/painel/leads">
                  <a className="text-xs text-primary hover:underline flex items-center gap-1">
                    Ver todos <ChevronRight className="w-3 h-3" />
                  </a>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {recentLeads.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum lead ainda. Compartilhe seu link!
                  </div>
                ) : (
                  recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs px-2 py-0.5 rounded-full ${
                          lead.funnel_step === "scheduled" ? "bg-emerald-500/20 text-emerald-500" :
                          lead.funnel_step === "ai_done" ? "bg-blue-500/20 text-blue-500" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {lead.funnel_step}
                        </div>
                        {lead.lead_score && (
                          <p className={`text-xs mt-0.5 font-medium ${
                            lead.lead_score >= 70 ? "text-emerald-500" :
                            lead.lead_score >= 40 ? "text-amber-500" : "text-red-500"
                          }`}>
                            Score: {lead.lead_score}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-card border border-border rounded-xl">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-sm">Notificações</h2>
                <Link href="/painel/notificacoes">
                  <a className="text-xs text-primary hover:underline flex items-center gap-1">
                    Ver todas <ChevronRight className="w-3 h-3" />
                  </a>
                </Link>
              </div>
              <div className="divide-y divide-border">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div key={notif.id} className={`p-3 ${!notif.read ? "bg-primary/5" : ""}`}>
                      <div className="flex items-start gap-2">
                        {!notif.read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{notif.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{notif.content}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(notif.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
