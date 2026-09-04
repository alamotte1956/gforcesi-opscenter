import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import RedirectToLogin from '@/components/RedirectToLogin';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import JobDetail from '@/pages/JobDetail';
import Projects from '@/pages/Projects';
import Contractors from '@/pages/Contractors';
import ContractorOnboarding from '@/pages/ContractorOnboarding';
import Clients from '@/pages/Clients';
import Invoices from '@/pages/Invoices';
import Expenses from '@/pages/Expenses';
import BillingReview from '@/pages/BillingReview';
import ProjectStatus from '@/pages/ProjectStatus';
import Equipment from '@/pages/Equipment';
import DailyReports from '@/pages/DailyReports';
import Issues from '@/pages/Issues';
import Inspections from '@/pages/Inspections';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Compliance from '@/pages/Compliance';
import ClientPortal from '@/pages/ClientPortal';
import RoutePlanning from '@/pages/RoutePlanning';
import FieldApp from '@/pages/FieldApp';
import DataImport from '@/pages/DataImport';
import Matterport from '@/pages/Matterport';
import Messages from '@/pages/Messages';
import UserManagement from '@/pages/UserManagement';
import Integrations from '@/pages/Integrations';
import Sites from '@/pages/Sites';
import NotificationSettings from '@/pages/NotificationSettings';
import MySchedule from '@/pages/MySchedule';
import ContractorPortal from '@/pages/ContractorPortal';
import AdminDashboard from '@/pages/AdminDashboard';
import AssignmentReports from '@/pages/AssignmentReports';
import EquipmentMaintenance from '@/pages/EquipmentMaintenance';
import ExpenseApprovals from '@/pages/ExpenseApprovals';
import CrewPerformance from '@/pages/CrewPerformance';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-cyan-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<RedirectToLogin />} />}>
        <Route path="/portal" element={<ClientPortal />} />
        <Route path="/field" element={<FieldApp />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/routes" element={<RoutePlanning />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/contractors/onboarding" element={<ContractorOnboarding />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/billing-review" element={<BillingReview />} />
          <Route path="/project-status" element={<ProjectStatus />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/daily-reports" element={<DailyReports />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/matterport" element={<Matterport />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/sites" element={<Sites />} />
          <Route path="/notifications" element={<NotificationSettings />} />
          <Route path="/my-schedule" element={<MySchedule />} />
          <Route path="/contractor-portal" element={<ContractorPortal />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/assignment-reports" element={<AssignmentReports />} />
          <Route path="/equipment-maintenance" element={<EquipmentMaintenance />} />
          <Route path="/expense-approvals" element={<ExpenseApprovals />} />
          <Route path="/crew-performance" element={<CrewPerformance />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App