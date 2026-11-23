import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import { OfflineProvider } from "@/components/offline/OfflineManager";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "@/components/ProtectedRoute";
import RedirectToLogin from "@/components/RedirectToLogin";

// Public Showcase & Auth / Legal
import Hero from "@/pages/Hero";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import LegalCompliance from "@/pages/LegalCompliance";

// Core Shell & Portals
import Layout from "@/components/Layout";
import ExecutiveDashboard from "@/pages/ExecutiveDashboard";
import CrmHub from "@/pages/CrmHub";
import AiInventoryStudio from "@/pages/AiInventoryStudio";
import AssetManagement from "@/pages/AssetManagement";
import SaasAdmin from "@/pages/SaasAdmin";
import Dashboard from "@/pages/Dashboard";
import USSitesMap from "@/pages/USSitesMap";
import AdminDashboard from "@/pages/AdminDashboard";
import ClientPortal from "@/pages/ClientPortal";
import PropertyOwnerPortal from "@/pages/PropertyOwnerPortal";
import FieldApp from "@/pages/FieldApp";
import { isPropertyPortalHost } from "@/lib/portalHost";
import ContractorPortal from "@/pages/ContractorPortal";

// Operations & Logistics
import Jobs from "@/pages/Jobs";
import JobDetail from "@/pages/JobDetail";
import Projects from "@/pages/Projects";
import Sites from "@/pages/Sites";
import Contractors from "@/pages/Contractors";
import ContractorOnboarding from "@/pages/ContractorOnboarding";
import ContractorBoard from "@/pages/ContractorBoard";
import Clients from "@/pages/Clients";
import RoutePlanning from "@/pages/RoutePlanning";
import Travel from "@/pages/Travel";
import Deliverables from "@/pages/Deliverables";
import RecurringSchedules from "@/pages/RecurringSchedules";
import LogisticsQuickStart from "@/pages/LogisticsQuickStart";

// Field Reporting & Gear
import Equipment from "@/pages/Equipment";
import EquipmentMaintenance from "@/pages/EquipmentMaintenance";
import DailyReports from "@/pages/DailyReports";
import Issues from "@/pages/Issues";
import Inspections from "@/pages/Inspections";
import DroneCompliance from "@/pages/DroneCompliance";
import Messages from "@/pages/Messages";
import MySchedule from "@/pages/MySchedule";

// Financials & QuickBooks Online Suite
import QuickBooksDashboard from "@/pages/QuickBooksDashboard";
import QuickBooksReports from "@/pages/QuickBooksReports";
import QuickBooksSyncErrors from "@/pages/QuickBooksSyncErrors";
import QuickBooksMapping from "@/pages/quickbooks-mapping";
import QuickBooksSetup from "@/pages/quickbooks-setup";
import Invoices from "@/pages/Invoices";
import Expenses from "@/pages/Expenses";
import ExpenseApprovals from "@/pages/ExpenseApprovals";
import BillingReview from "@/pages/BillingReview";
import Payouts from "@/pages/Payouts";
import PayoutReview from "@/pages/PayoutReview";

// Sales, Marketing (Metricool), HR & Taxes
import Leads from "@/pages/Leads";
import Proposals from "@/pages/Proposals";
import MarketingHub from "@/pages/MarketingHub";
import HrTaxPayroll from "@/pages/HrTaxPayroll";

// Analytics & Admin
import Analytics from "@/pages/Analytics";
import Profitability from "@/pages/Profitability";
import ProjectStatus from "@/pages/ProjectStatus";
import CrewPerformance from "@/pages/CrewPerformance";
import PerformanceReport from "@/pages/PerformanceReport";
import AssignmentReports from "@/pages/AssignmentReports";
import Compliance from "@/pages/Compliance";
import UserManagement from "@/pages/UserManagement";
import DataImport from "@/pages/DataImport";
import Matterport from "@/pages/Matterport";
import Integrations from "@/pages/Integrations";
import Settings from "@/pages/Settings";
import NotificationSettings from "@/pages/NotificationSettings";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/legal",
  "/hipaa",
]);

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const portalHost = isPropertyPortalHost();
  const isPublicPath = portalHost
    ? location.pathname !== "/" && PUBLIC_PATHS.has(location.pathname)
    : PUBLIC_PATHS.has(location.pathname);

  if (!isPublicPath && (isLoadingPublicSettings || isLoadingAuth)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0A1628]">
        <div className="w-9 h-9 border-4 border-slate-800 border-t-[#F97316] border-r-[#126DFA] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isPublicPath && authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public Enterprise Showcase & Legal / Auth */}
      {!portalHost && <Route path="/" element={<Hero />} />}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/legal" element={<LegalCompliance />} />
      <Route path="/hipaa" element={<LegalCompliance />} />

      {/* Authenticated Enterprise Application */}
      <Route element={<ProtectedRoute unauthenticatedElement={<RedirectToLogin />} />}>
        {portalHost && <Route path="/" element={<PropertyOwnerPortal />} />}
        <Route path="/owner-portal" element={<PropertyOwnerPortal />} />
        <Route path="/client-portal" element={<ClientPortal />} />
        <Route path="/portal" element={<PropertyOwnerPortal />} />
        <Route path="/field" element={<FieldApp />} />

        <Route element={<Layout />}>
          {/* Command Center */}
          <Route path="/executive" element={<ExecutiveDashboard />} />
          <Route path="/us-map" element={<USSitesMap />} />
          <Route path="/ops" element={<Dashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/quick-start" element={<LogisticsQuickStart />} />

          {/* CRM, Sales & Marketing (Metricool) */}
          <Route path="/crm" element={<CrmHub />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/marketing" element={<MarketingHub />} />

          {/* Setup & Resources */}
          <Route path="/clients" element={<Clients />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/contractors/onboarding" element={<ContractorOnboarding />} />
          <Route path="/contractor-board" element={<ContractorBoard />} />

          {/* Operations & Logistics */}
          <Route path="/ai-inventory" element={<AiInventoryStudio />} />
          <Route path="/assets" element={<AssetManagement />} />
          <Route path="/saas-admin" element={<SaasAdmin />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/routes" element={<RoutePlanning />} />
          <Route path="/travel" element={<Travel />} />
          <Route path="/deliverables" element={<Deliverables />} />
          <Route path="/recurring-schedules" element={<RecurringSchedules />} />
          <Route path="/messages" element={<Messages />} />

          {/* Field Reporting & Gear */}
          <Route path="/daily-reports" element={<DailyReports />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/drone-compliance" element={<DroneCompliance />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/equipment-maintenance" element={<EquipmentMaintenance />} />

          {/* Financials & QuickBooks Online Suite */}
          <Route path="/finance" element={<QuickBooksDashboard />} />
          <Route path="/quickbooks" element={<QuickBooksDashboard />} />
          <Route path="/quickbooks-reports" element={<QuickBooksReports />} />
          <Route path="/quickbooks-errors" element={<QuickBooksSyncErrors />} />
          <Route path="/quickbooks-mapping" element={<QuickBooksMapping />} />
          <Route path="/quickbooks-setup" element={<QuickBooksSetup />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/expense-approvals" element={<ExpenseApprovals />} />
          <Route path="/billing-review" element={<BillingReview />} />

          {/* HR, Federal/State Taxes & Payroll */}
          <Route path="/hr-tax-payroll" element={<HrTaxPayroll />} />
          <Route path="/payouts" element={<Payouts />} />
          <Route path="/payout-review" element={<PayoutReview />} />
          <Route path="/compliance" element={<Compliance />} />

          {/* Insights & Reports */}
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/profitability" element={<Profitability />} />
          <Route path="/project-status" element={<ProjectStatus />} />
          <Route path="/crew-performance" element={<CrewPerformance />} />
          <Route path="/performance-report" element={<PerformanceReport />} />
          <Route path="/assignment-reports" element={<AssignmentReports />} />

          {/* Administration, Integrations & Portals */}
          <Route path="/users" element={<UserManagement />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/matterport" element={<Matterport />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/notifications" element={<NotificationSettings />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/contractor-portal" element={<ContractorPortal />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App;
