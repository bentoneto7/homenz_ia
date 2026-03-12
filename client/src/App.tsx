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
import CadastroFranqueado from "./pages/CadastroFranqueado";
import AguardandoPagamento from "./pages/AguardandoPagamento";
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
import CreatorPanel from "./pages/creator/CreatorPanel";
import JoinInvite from "./pages/JoinInvite";
import HomenzLogin from "./pages/HomenzLogin";
import ClinicLogin from "./pages/ClinicLogin";
import HomenzAdmLogin from "./pages/HomenzAdmLogin";
import FranchiseLanding from "./pages/FranchiseLanding";
import PlanosPage from "./pages/PlanosPage";
import BoasVindas from "./pages/BoasVindas";
import { ProtectedRoute } from "./components/ProtectedRoute";

function Router() {
  return (
    <Switch>
      {/* Plataforma */}
      <Route path="/" component={HomenzLanding} />
      <Route path="/plataforma" component={Home} />
      <Route path="/cadastro" component={CadastroFranqueado} />
      <Route path="/cadastro-clinica" component={ClinicOnboarding} />
      <Route path="/login-clinica" component={ClinicLogin} />
      <Route path="/aguardando-pagamento" component={AguardandoPagamento} />
      <Route path="/planos" component={PlanosPage} />
      <Route path="/boas-vindas" component={BoasVindas} />

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

      {/* Painel do Franqueado — requer role franchisee */}
      <Route path="/franqueado">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/leads">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/vendedores">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/agendamentos">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/analytics">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/configuracoes">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/landing-pages">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>
      <Route path="/franqueado/pixel">
        <ProtectedRoute allowedRoles={["franchisee"]}><FranchiseeDashboard /></ProtectedRoute>
      </Route>

      {/* Painel do Vendedor — requer role seller */}
      <Route path="/vendedor">
        <ProtectedRoute allowedRoles={["seller"]}><SellerDashboard /></ProtectedRoute>
      </Route>
      <Route path="/vendedor/agendamentos">
        <ProtectedRoute allowedRoles={["seller"]}><SellerDashboard /></ProtectedRoute>
      </Route>
      <Route path="/vendedor/desempenho">
        <ProtectedRoute allowedRoles={["seller"]}><SellerDashboard /></ProtectedRoute>
      </Route>

      {/* Painel Admin da Rede — acesso INTERNO via /homenzadm (não listado no login público) */}
      <Route path="/homenzadm/login" component={HomenzAdmLogin} />
      <Route path="/homenzadm">
        <ProtectedRoute allowedRoles={["owner"]}><NetworkAdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/homenzadm/franquias">
        <ProtectedRoute allowedRoles={["owner"]}><NetworkAdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/homenzadm/vendedores">
        <ProtectedRoute allowedRoles={["owner"]}><NetworkAdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/homenzadm/leads">
        <ProtectedRoute allowedRoles={["owner"]}><NetworkAdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/homenzadm/analytics">
        <ProtectedRoute allowedRoles={["owner"]}><NetworkAdminDashboard /></ProtectedRoute>
      </Route>
      <Route path="/homenzadm/configuracoes">
        <ProtectedRoute allowedRoles={["owner"]}><NetworkAdminDashboard /></ProtectedRoute>
      </Route>

      {/* Painel do Criador (Superadmin) */}
      <Route path="/creator" component={CreatorPanel} />

      {/* Landing pages públicas por franquia */}
      <Route path="/l/:slug" component={FranchiseLanding} />

      {/* Login unificado Homenz — apenas Franqueado e Vendedor */}
      <Route path="/login" component={HomenzLogin} />

      {/* Aceitar convite de acesso */}
      <Route path="/join" component={JoinInvite} />

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
