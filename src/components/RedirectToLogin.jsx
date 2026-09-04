import { Navigate, useLocation } from "react-router-dom";

// Redirects unauthenticated users to /login while preserving the page they
// were trying to reach as ?returnTo=, so login (and register) can send them
// back to it instead of dropping them on the dashboard.
export default function RedirectToLogin() {
  const location = useLocation();
  const returnTo = location.pathname + location.search;
  return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
}