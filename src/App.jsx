import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import Jobs from '@/pages/Jobs';
import Projects from '@/pages/Projects';
import Contractors from '@/pages/Contractors';
import ContractorOnboarding from '@/pages/ContractorOnboarding';
import Clients from '@/pages/Clients';
import Invoices from '@/pages/Invoices';
import Timesheets from '@/pages/Timesheets';
import Equipment from '@/pages/Equipment';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';
import Compliance from '@/pages/Compliance';
import ClientPortal from '@/pages/ClientPortal';

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
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/portal" element={<ClientPortal />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/contractors" element={<Contractors />} />
          <Route path="/contractors/onboarding" element={<ContractorOnboarding />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/timesheets" element={<Timesheets />} />
          <Route path="/equipment" element={<Equipment />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/compliance" element={<Compliance />} />
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