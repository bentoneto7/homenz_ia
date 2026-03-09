import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HomenzLanding from "./pages/HomenzLanding";
import ClinicLanding from "./pages/funnel/ClinicLanding";
import FunnelChat from "./pages/funnel/FunnelChat";
import FunnelPhotos from "./pages/funnel/FunnelPhotos";
import FunnelResult from "./pages/funnel/FunnelResult";
import FunnelSchedule from "./pages/funnel/FunnelSchedule";
import FunnelConfirmation from "./pages/funnel/FunnelConfirmation";
import ClinicOnboarding from "./pages/ClinicOnboarding";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLeads from "./pages/admin/Leads";
import AdminLeadDetail from "./pages/admin/LeadDetail";
import AdminAppointments from "./pages/admin/Appointments";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSettings from "./pages/admin/Settings";
import AdminAvailability from "./pages/admin/Availability";
import AdminLeadJourney from "./pages/admin/LeadJourney";
import AdminRecovery from "./pages/admin/Recovery";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminHealthScore from "./pages/admin/HealthScore";
import AdminDailyCheckin from "./pages/admin/DailyCheckin";
import AdminNetworkRanking from "./pages/admin/NetworkRanking";
import FranchiseeDashboard from "./pages/franchisee/FranchiseeDashboard";
import SellerDashboard from "./pages/seller/SellerDashboard";
import NetworkAdminDashboard from "./pages/network/NetworkAdminDashboard";

function Router() {
  return (
    <Switch>
      {/* Plataforma */}
      <Route path="/" component={HomenzLanding} />
      <Route path="/plataforma" component={Home} />
      <Route path="/cadastro" component={ClinicOnboarding} />

      {/* Funil público da clínica */}
      <Route path="/c/:slug" component={ClinicLanding} />
      <Route path="/c/:slug/chat/:token" component={FunnelChat} />
      <Route path="/c/:slug/fotos/:token" component={FunnelPhotos} />
      <Route path="/c/:slug/resultado/:token" component={FunnelResult} />
      <Route path="/c/:slug/agendar/:token" component={FunnelSchedule} />
      <Route path="/c/:slug/confirmacao/:token" component={FunnelConfirmation} />

      {/* Painel admin da clínica */}
      <Route path="/painel" component={AdminDashboard} />
      <Route path="/painel/leads" component={AdminLeads} />
      <Route path="/painel/leads/:id" component={AdminLeadDetail} />
      <Route path="/painel/agendamentos" component={AdminAppointments} />
      <Route path="/painel/notificacoes" component={AdminNotifications} />
      <Route path="/painel/configuracoes" component={AdminSettings} />
      <Route path="/painel/disponibilidade" component={AdminAvailability} />
      <Route path="/painel/leads/:id/jornada" component={AdminLeadJourney} />
      <Route path="/painel/recuperacao" component={AdminRecovery} />
      <Route path="/painel/analytics" component={AdminAnalytics} />
      <Route path="/painel/health" component={AdminHealthScore} />
      <Route path="/painel/checkin" component={AdminDailyCheckin} />
      <Route path="/painel/ranking" component={AdminNetworkRanking} />

      {/* Painel do Franqueado */}
      <Route path="/franqueado" component={FranchiseeDashboard} />
      <Route path="/franqueado/leads" component={FranchiseeDashboard} />
      <Route path="/franqueado/vendedores" component={FranchiseeDashboard} />
      <Route path="/franqueado/agendamentos" component={FranchiseeDashboard} />
      <Route path="/franqueado/analytics" component={FranchiseeDashboard} />
      <Route path="/franqueado/configuracoes" component={FranchiseeDashboard} />

      {/* Painel do Vendedor */}
      <Route path="/vendedor" component={SellerDashboard} />
      <Route path="/vendedor/agendamentos" component={SellerDashboard} />
      <Route path="/vendedor/desempenho" component={SellerDashboard} />

      {/* Painel Admin da Rede */}
      <Route path="/rede" component={NetworkAdminDashboard} />
      <Route path="/rede/franquias" component={NetworkAdminDashboard} />
      <Route path="/rede/vendedores" component={NetworkAdminDashboard} />
      <Route path="/rede/leads" component={NetworkAdminDashboard} />
      <Route path="/rede/analytics" component={NetworkAdminDashboard} />
      <Route path="/rede/configuracoes" component={NetworkAdminDashboard} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
