import React from "react";
import { usePermissions } from "./usePermissions";
import { AlertCircle } from "lucide-react";

export default function PermissionGate({
  permissions,
  requireAll = false,
  children,
  fallback = null,
  showError = false,
}) {
  const { permissions: userPerms, loading } = usePermissions();

  if (loading) return null;

  const list = Array.isArray(permissions) ? permissions : [permissions];
  const results = list.map((perm) => {
    const [category, action] = String(perm).split(".");
    return userPerms?.[category]?.[action] === true;
  });

  const hasAccess = requireAll ? results.every(Boolean) : results.some(Boolean);

  if (!hasAccess) {
    if (showError) {
      return (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-sm text-rose-200 flex items-center gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>You do not have permission to access this module.</span>
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
}

export function usePermission(permissions, requireAll = false) {
  const { permissions: userPerms, loading } = usePermissions();
  const list = Array.isArray(permissions) ? permissions : [permissions];
  const results = list.map((perm) => {
    const [category, action] = String(perm).split(".");
    return userPerms?.[category]?.[action] === true;
  });
  return {
    hasPermission: !loading && (requireAll ? results.every(Boolean) : results.some(Boolean)),
    loading,
  };
}
