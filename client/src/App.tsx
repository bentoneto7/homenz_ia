import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
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

function Router() {
  return (
    <Switch>
      {/* Plataforma */}
      <Route path="/" component={Home} />
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
